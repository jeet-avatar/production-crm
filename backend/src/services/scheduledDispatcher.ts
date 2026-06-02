// backend/src/services/scheduledDispatcher.ts
//
// Phase 04-08 — Scheduled-send dispatcher for Apollo campaigns.
//
// Polls every 30s for EmailLog rows where status='SCHEDULED' AND scheduledAt <= now(),
// dispatches them via Resend, then flips status → 'SENT' (or 'FAILED'). Plus a one-shot
// boot catch-up sweep so pm2 restarts during a delay window don't miss the send.
//
// Wired into app.ts on boot. ZERO new env vars — reuses APOLLO_FROM_EMAIL / APOLLO_REPLY_TO
// from routes/apollo.ts as the single source of truth for the Sara sender (Sara guard).
//
// Locked decisions (Phase 04-08):
//   1. Sender is APOLLO_FROM_EMAIL — imported, NOT duplicated. A Sara swap remains a
//      one-line edit in apollo.ts. Scheduled sends CANNOT bypass Sara.
//   2. RESEND_API_KEY fail-fast at module load — same pattern as apollo.ts.
//   3. 50 rows per cycle cap — safety against a runaway backlog (e.g., a 2000-row
//      backlog after a long outage would otherwise spam Resend over a single 30s tick).
//   4. Parent Campaign rolls to SENT (or CANCELLED if 0 sent) when its last SCHEDULED
//      EmailLog row dispatches — keeps /campaigns list + /analytics page accurate.
//   5. Per-row try/catch — one bad recipient never blocks the rest of the cycle.

import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { APOLLO_FROM_EMAIL, APOLLO_REPLY_TO } from '../routes/apollo';

const POLL_INTERVAL_MS = 30_000; // 30s
const ROWS_PER_CYCLE_CAP = 50; // safety against runaway backlogs

let pollerHandle: NodeJS.Timeout | null = null;

// Fail-fast at module load if RESEND_API_KEY missing — same pattern as routes/apollo.ts.
// Scheduled sends share the same Resend transport as immediate Apollo sends, so the
// dispatcher cannot start without a working API key. Backend MUST NOT boot half-broken.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    '[scheduledDispatcher] FATAL: RESEND_API_KEY env var is not set. Scheduled sends cannot dispatch.',
  );
  // eslint-disable-next-line no-console
  console.error(
    '  → Add RESEND_API_KEY=re_... to backend/.env (live key in EC2 /var/www/crm-backend/.env).',
  );
  process.exit(1);
}
const resend = new Resend(RESEND_API_KEY);
const prisma = new PrismaClient();

interface DispatchCycleResult {
  attempted: number;
  sent: number;
  failed: number;
  campaignsCompleted: string[]; // Campaign IDs whose last SCHEDULED row just dispatched.
}

/**
 * One dispatch sweep — fetch up to ROWS_PER_CYCLE_CAP due SCHEDULED rows, send each via Resend,
 * update EmailLog status to 'SENT' or 'FAILED', and roll parent Campaign status if all SCHEDULED
 * rows for that campaign are now resolved.
 *
 * Exported for testing and for the boot catch-up call. Idempotent — re-running mid-cycle is safe
 * (the next iteration just sees no due rows).
 */
export async function dispatchDueScheduled(): Promise<DispatchCycleResult> {
  const due = await prisma.emailLog.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date() },
    },
    take: ROWS_PER_CYCLE_CAP,
    orderBy: { scheduledAt: 'asc' },
    include: { contact: { select: { firstName: true, lastName: true, email: true, company: { select: { name: true } } } } },
  });

  if (due.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, campaignsCompleted: [] };
  }

  let sent = 0;
  let failed = 0;
  const touchedCampaignIds = new Set<string>();

  for (const row of due) {
    touchedCampaignIds.add(row.campaignId);

    try {
      // Read pre-rendered subject + html from metadata. The route that staged this row
      // ran the same {{var}} substitution that immediate sends use, so the dispatcher
      // is a dumb transport — no per-recipient rendering here.
      const meta = (row.metadata as any) || {};
      const subject: string = meta.subject || '(scheduled send)';
      const html: string = meta.html || '<p>(missing body)</p>';

      const to = row.toEmail || row.contact?.email || null;
      if (!to) {
        await prisma.emailLog.update({
          where: { id: row.id },
          data: { status: 'FAILED', errorMessage: 'contact has no email at dispatch time' },
        });
        failed += 1;
        continue;
      }

      const result = await resend.emails.send({
        from: APOLLO_FROM_EMAIL,
        to,
        subject,
        html,
        replyTo: APOLLO_REPLY_TO,
      });

      if ((result as any).error) {
        const errMsg = String((result as any).error?.message || (result as any).error);
        await prisma.emailLog.update({
          where: { id: row.id },
          data: { status: 'FAILED', errorMessage: errMsg },
        });
        failed += 1;
        // eslint-disable-next-line no-console
        console.error(`[scheduledDispatcher] FAILED ${row.id} → ${to}: ${errMsg}`);
        continue;
      }

      await prisma.emailLog.update({
        where: { id: row.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: (result as any).data?.id ?? null,
          fromEmail: APOLLO_REPLY_TO,
        },
      });
      sent += 1;
      // eslint-disable-next-line no-console
      console.log(`[scheduledDispatcher] dispatched ${row.id} → ${to}`);
    } catch (err: any) {
      const errMsg = err?.message ?? 'unknown_error';
      try {
        await prisma.emailLog.update({
          where: { id: row.id },
          data: { status: 'FAILED', errorMessage: errMsg },
        });
      } catch {
        // Best-effort — don't let an EmailLog write failure mask the send error.
      }
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`[scheduledDispatcher] threw on ${row.id}: ${errMsg}`);
    }
  }

  // Roll up parent Campaign status. For each campaign we touched this cycle, count
  // remaining SCHEDULED rows — if zero, the whole batch is done. Mark Campaign SENT
  // if any rows succeeded, else CANCELLED (CampaignStatus enum has no FAILED — mirrors
  // routes/apollo.ts:573 pattern for immediate-dispatch path).
  const campaignsCompleted: string[] = [];
  for (const campaignId of touchedCampaignIds) {
    const stillScheduled = await prisma.emailLog.count({
      where: { campaignId, status: 'SCHEDULED' },
    });
    if (stillScheduled > 0) continue;

    const sentCount = await prisma.emailLog.count({
      where: { campaignId, status: 'SENT' },
    });
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: sentCount > 0 ? 'SENT' : 'CANCELLED',
          sentAt: sentCount > 0 ? new Date() : null,
          totalSent: sentCount,
        },
      });
      campaignsCompleted.push(campaignId);
      // eslint-disable-next-line no-console
      console.log(
        `[scheduledDispatcher] campaign ${campaignId} rolled → ${sentCount > 0 ? 'SENT' : 'CANCELLED'} (totalSent=${sentCount})`,
      );
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(`[scheduledDispatcher] failed to roll campaign ${campaignId}: ${err?.message ?? err}`);
    }
  }

  return { attempted: due.length, sent, failed, campaignsCompleted };
}

/**
 * Start the dispatcher: one boot catch-up + setInterval poller.
 *
 * Idempotent — calling twice logs a warning and returns. Tests / multi-worker setups
 * should only call this from a single boot path (app.ts).
 */
export function startScheduledDispatcher(): void {
  if (pollerHandle) {
    // eslint-disable-next-line no-console
    console.warn('[scheduledDispatcher] already running, ignoring duplicate start');
    return;
  }

  // Boot catch-up — handles rows whose scheduledAt slipped past now() while the
  // process was down (pm2 restart during a 5-min delay window is the common case).
  dispatchDueScheduled()
    .then((r) =>
      // eslint-disable-next-line no-console
      console.log(
        `[scheduledDispatcher] boot catch-up: attempted=${r.attempted} sent=${r.sent} failed=${r.failed} campaigns_completed=${r.campaignsCompleted.length}`,
      ),
    )
    .catch((err) =>
      // eslint-disable-next-line no-console
      console.error('[scheduledDispatcher] boot catch-up error:', err),
    );

  // Steady-state poller.
  pollerHandle = setInterval(() => {
    dispatchDueScheduled().catch((err) =>
      // eslint-disable-next-line no-console
      console.error('[scheduledDispatcher] poll error:', err),
    );
  }, POLL_INTERVAL_MS);

  // eslint-disable-next-line no-console
  console.log(
    `[scheduledDispatcher] started — polling every ${POLL_INTERVAL_MS / 1000}s, cap ${ROWS_PER_CYCLE_CAP} rows/cycle, sender=${APOLLO_FROM_EMAIL}`,
  );
}

/**
 * Stop the dispatcher cleanly. Intended for SIGTERM/SIGINT graceful shutdown.
 * Idempotent — safe to call when not running.
 */
export function stopScheduledDispatcher(): void {
  if (pollerHandle) {
    clearInterval(pollerHandle);
    pollerHandle = null;
    // eslint-disable-next-line no-console
    console.log('[scheduledDispatcher] stopped');
  }
}
