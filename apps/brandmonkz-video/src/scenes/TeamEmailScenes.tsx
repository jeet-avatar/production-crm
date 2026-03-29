import React from 'react';
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ── Brand colours ────────────────────────────────────────────────────────────
const ORANGE = '#FF6B35';
const INDIGO = '#4F46E5';
const GREEN  = '#22C55E';
const TEAL   = '#14B8A6';
const YELLOW = '#F59E0B';
const PINK   = '#EC4899';
const DARK   = '#1A1A2E';
const DARKER = '#0F0F1E';
const GRAY   = '#B0B0C3';
const WHITE  = '#F8F8FF';

// ── Scene data ────────────────────────────────────────────────────────────────
interface Scene {
  emoji: string;
  title: string;
  subtitle: string;
  bullets: string[];
  accent: string;
  tip?: string;
  mockup?: 'invite-form' | 'email-server' | 'verify' | 'team-list' | 'smtp-settings' | 'sent-from';
}

const SCENES: Scene[] = [
  {
    emoji: '👥',
    title: 'Why Add Team Members?',
    subtitle: 'Let your whole team send from BrandMonkz',
    bullets: [
      '👩‍💼  HR can send from hr@techcloudpro.com',
      '💼  Sales can send from sales@techcloudpro.com',
      '🤝  Everyone sends through the SAME CRM system',
      '📊  Rajesh sees ALL their campaigns in one dashboard',
    ],
    accent: INDIGO,
    tip: '💡 Each team member logs in with their own email + password',
  },
  {
    emoji: '⚙️',
    title: 'Step 1 — Go To Settings',
    subtitle: 'Left menu → Team (bottom of menu)',
    bullets: [
      '🖱️  Log in as Rajesh (the OWNER account)',
      '📋  Scroll to bottom of left menu',
      '👥  Click "Team" — you see the team page',
      '➕  Click "Invite Team Member" button',
    ],
    accent: ORANGE,
    tip: '💡 Only the OWNER (Rajesh) can invite new members',
    mockup: 'team-list',
  },
  {
    emoji: '📧',
    title: 'Step 2 — Fill In HR Details',
    subtitle: 'Enter hr@techcloudpro.com info',
    bullets: [
      '✏️   First Name: type  HR',
      '✏️   Last Name: type  TechCloudPro',
      '📧  Email: type  hr@techcloudpro.com',
      '🔘  Click "Send Invitation" — done!',
    ],
    accent: TEAL,
    tip: '💡 An invitation email goes to hr@techcloudpro.com automatically',
    mockup: 'invite-form',
  },
  {
    emoji: '📬',
    title: 'Step 3 — HR Accepts Invite',
    subtitle: 'HR checks their inbox and sets a password',
    bullets: [
      '📥  HR opens their email → sees invite from BrandMonkz',
      '🔗  HR clicks the "Accept Invitation" link',
      '🔑  HR sets their own password',
      '✅  HR can now log in at brandmonkz.com',
    ],
    accent: GREEN,
    tip: '💡 Invite link expires in 7 days — resend if HR misses it',
  },
  {
    emoji: '📡',
    title: 'Step 4 — Add TechCloudPro SMTP',
    subtitle: 'So emails show "From: HR at TechCloudPro"',
    bullets: [
      '🖱️  Settings → Email Servers → New Email Server',
      '🏷️   Name: "TechCloudPro HR"',
      '🌐  Host: mail.techcloudpro.com (your mail server)',
      '📧  From Email: hr@techcloudpro.com',
    ],
    accent: ORANGE,
    tip: '💡 Ask your IT team for the SMTP host name — usually mail.yourdomain.com',
    mockup: 'smtp-settings',
  },
  {
    emoji: '🔌',
    title: 'SMTP Settings to Fill In',
    subtitle: 'Copy these exactly from your IT team',
    bullets: [
      '🌐  Host: mail.techcloudpro.com',
      '🔢  Port: 587  (or 465 for SSL)',
      '👤  Username: hr@techcloudpro.com',
      '🔑  Password: HR email account password',
    ],
    accent: YELLOW,
    tip: '💡 If using Microsoft 365 → host is smtp.office365.com, port 587',
    mockup: 'email-server',
  },
  {
    emoji: '✅',
    title: 'Step 5 — Test & Verify',
    subtitle: 'Make sure the connection works',
    bullets: [
      '🧪  Click "Test Connection" — should say ✅ Connected',
      '📨  Click "Send Verification Email" → check HR inbox',
      '🔢  Enter the 6-digit code from the email',
      '🟢  Status changes to Verified — ready to send!',
    ],
    accent: GREEN,
    tip: '💡 If Test fails — check the password and port number with IT',
    mockup: 'verify',
  },
  {
    emoji: '🚀',
    title: 'Now HR Can Send Campaigns!',
    subtitle: 'Emails arrive looking like this in client inbox',
    bullets: [
      '📧  From: HR TechCloudPro <hr@techcloudpro.com>',
      '📋  HR logs in → creates campaign → selects contacts',
      '📨  Sends using the verified TechCloudPro email server',
      '📊  Rajesh sees all HR sent emails in his dashboard too',
    ],
    accent: INDIGO,
    tip: '🎉 Professional emails from your own domain = better open rates!',
    mockup: 'sent-from',
  },
];

// ── Mockup components ─────────────────────────────────────────────────────────

const TeamListMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const members = [
    { name: 'Rajesh Kumar', email: 'rajesh@techcloudpro.com', role: 'OWNER', color: ORANGE },
    { name: 'HR TechCloudPro', email: 'hr@techcloudpro.com', role: 'MEMBER', color: TEAL },
  ];
  return (
    <div style={{ opacity: op, width: 340 }}>
      <div style={{ fontSize: 13, color: GRAY, marginBottom: 10 }}>Team Members (2)</div>
      {members.map((m, i) => {
        const rowOp = interpolate(frame, [30 + i * 15, 50 + i * 15], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 14px',
            marginBottom: 8, opacity: rowOp,
            border: i === 1 ? `1px solid ${accent}44` : '1px solid transparent',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: `linear-gradient(135deg, ${m.color}, ${INDIGO})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: WHITE, flexShrink: 0,
            }}>
              {m.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: WHITE, fontWeight: 700 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: GRAY, marginTop: 1 }}>{m.email}</div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
              background: `${m.color}22`, color: m.color,
            }}>{m.role}</div>
          </div>
        );
      })}
      <div style={{
        marginTop: 4, background: `${accent}22`, border: `2px dashed ${accent}55`,
        borderRadius: 10, padding: '10px 14px', textAlign: 'center',
        fontSize: 13, color: accent, fontWeight: 600,
      }}>
        ➕ Invite Team Member
      </div>
    </div>
  );
};

const InviteFormMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const fields = [
    { label: 'First Name', value: 'HR', delay: 45 },
    { label: 'Last Name',  value: 'TechCloudPro', delay: 65 },
    { label: 'Email',      value: 'hr@techcloudpro.com', delay: 85 },
  ];
  return (
    <div style={{ opacity: op, width: 320, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '16px 18px', border: `1px solid rgba(255,255,255,0.08)` }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: WHITE, marginBottom: 14 }}>Invite Team Member</div>
      {fields.map((f, i) => {
        const typed = Math.floor(interpolate(frame, [f.delay, f.delay + 20], [0, f.value.length], { extrapolateRight: 'clamp' }));
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: GRAY, marginBottom: 4 }}>{f.label}</div>
            <div style={{
              background: 'rgba(255,255,255,0.07)', border: `1.5px solid ${accent}66`,
              borderRadius: 8, padding: '7px 12px', fontSize: 14, color: WHITE,
              minHeight: 34, display: 'flex', alignItems: 'center',
            }}>
              {f.value.slice(0, typed)}
              {frame < f.delay + 22 && <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: accent }}>|</span>}
            </div>
          </div>
        );
      })}
      <div style={{
        marginTop: 6, background: `linear-gradient(90deg, ${accent}, ${INDIGO})`,
        borderRadius: 8, padding: '9px 0', textAlign: 'center',
        fontSize: 14, color: WHITE, fontWeight: 700,
        opacity: interpolate(frame, [100, 115], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        📧 Send Invitation
      </div>
    </div>
  );
};

const SmtpSettingsMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const rows = [
    { label: 'Server Name', value: 'TechCloudPro HR' },
    { label: 'Host',        value: 'mail.techcloudpro.com' },
    { label: 'Port',        value: '587' },
    { label: 'From Email',  value: 'hr@techcloudpro.com' },
  ];
  return (
    <div style={{ opacity: op, width: 340 }}>
      <div style={{ fontSize: 13, color: GRAY, marginBottom: 8 }}>New Email Server</div>
      {rows.map((r, i) => {
        const rowOp = interpolate(frame, [30 + i * 12, 48 + i * 12], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{ marginBottom: 8, opacity: rowOp }}>
            <div style={{ fontSize: 11, color: GRAY, marginBottom: 3 }}>{r.label}</div>
            <div style={{
              background: 'rgba(255,255,255,0.07)', border: `1.5px solid ${accent}44`,
              borderRadius: 8, padding: '7px 12px', fontSize: 13, color: WHITE,
            }}>{r.value}</div>
          </div>
        );
      })}
    </div>
  );
};

const EmailServerMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const providers = [
    { name: 'Microsoft 365', host: 'smtp.office365.com', port: '587' },
    { name: 'Google Workspace', host: 'smtp.gmail.com', port: '587' },
    { name: 'TechCloudPro Custom', host: 'mail.techcloudpro.com', port: '587' },
  ];
  return (
    <div style={{ opacity: op, width: 340 }}>
      <div style={{ fontSize: 13, color: GRAY, marginBottom: 8 }}>Common SMTP Providers</div>
      {providers.map((p, i) => {
        const rowOp = interpolate(frame, [30 + i * 15, 50 + i * 15], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: i === 2 ? `${accent}18` : 'rgba(255,255,255,0.04)',
            border: i === 2 ? `1.5px solid ${accent}55` : '1.5px solid transparent',
            borderRadius: 10, padding: '10px 14px', marginBottom: 6, opacity: rowOp,
          }}>
            <div>
              <div style={{ fontSize: 13, color: WHITE, fontWeight: i === 2 ? 700 : 500 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: GRAY, marginTop: 2 }}>{p.host}</div>
            </div>
            <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 8px', color: GRAY }}>
              :{p.port}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const VerifyMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op      = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const step    = frame < 60 ? 0 : frame < 100 ? 1 : 2;
  const steps   = [
    { icon: '🧪', label: 'Test Connection',       status: step > 0 ? '✅ Connected' : '…testing', color: step > 0 ? GREEN : GRAY },
    { icon: '📨', label: 'Verification Email Sent', status: step > 1 ? '✅ Email Sent' : step === 1 ? '…sending' : '', color: step > 1 ? GREEN : GRAY },
    { icon: '🟢', label: 'Server Verified',         status: step > 2 ? '✅ Verified' : step === 2 ? 'Verified!' : '', color: step > 2 ? GREEN : accent },
  ];
  return (
    <div style={{ opacity: op, width: 300 }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 8,
          border: i === step ? `1.5px solid ${accent}66` : '1.5px solid transparent',
          opacity: i <= step ? 1 : 0.3,
        }}>
          <span style={{ fontSize: 22 }}>{s.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: WHITE, fontWeight: 600 }}>{s.label}</div>
          </div>
          <div style={{ fontSize: 12, color: s.color, fontWeight: 700 }}>{s.status}</div>
        </div>
      ))}
    </div>
  );
};

const SentFromMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op    = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const slideX = interpolate(frame, [45, 70], [-40, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: op, width: 340 }}>
      <div style={{ fontSize: 12, color: GRAY, marginBottom: 8 }}>Client sees this in their inbox ↓</div>
      <div style={{
        background: WHITE, borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        transform: `translateX(${slideX}px)`,
      }}>
        <div style={{ background: ORANGE, height: 5 }} />
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${TEAL}, ${INDIGO})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: WHITE, fontWeight: 800 }}>HR</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>HR · TechCloudPro</div>
              <div style={{ fontSize: 11, color: '#888' }}>hr@techcloudpro.com</div>
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 6 }}>
            Quick question about your IT hiring
          </div>
          <div style={{ fontSize: 12, color: '#444', lineHeight: 1.7 }}>
            Hi Sarah,<br />
            I'm reaching out about placing skilled IT candidates with your team…
          </div>
          <div style={{ marginTop: 10, display: 'inline-block', background: ORANGE, borderRadius: 6, padding: '6px 14px', fontSize: 12, color: WHITE, fontWeight: 700 }}>
            Book a Free Call →
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: GREEN, fontWeight: 600, textAlign: 'center' }}>
        ✅ Looks professional — sent from your own domain!
      </div>
    </div>
  );
};

// ── Scene wrapper ─────────────────────────────────────────────────────────────

const TeamEmailScene: React.FC<{ idx: number; total: number }> = ({ idx, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = SCENES[idx];

  const bgFlash = interpolate(frame, [0, 8], [1, 0], { extrapolateRight: 'clamp' });
  const emojiSc = spring({ frame, fps, config: { mass: 0.4, stiffness: 220, damping: 10 } });
  const barW    = interpolate(frame, [5, 35], [0, 440], { extrapolateRight: 'clamp' });
  const titleY  = interpolate(frame, [8, 22], [40, 0],  { extrapolateRight: 'clamp' });
  const titleOp = interpolate(frame, [8, 22], [0, 1],   { extrapolateRight: 'clamp' });
  const subOp   = interpolate(frame, [18, 30], [0, 1],  { extrapolateRight: 'clamp' });
  const tipOp   = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: 'clamp' });

  const bulletOps = scene.bullets.map((_, i) =>
    interpolate(frame, [26 + i * 9, 40 + i * 9], [0, 1], { extrapolateRight: 'clamp' })
  );
  const bulletXs = scene.bullets.map((_, i) =>
    interpolate(frame, [26 + i * 9, 40 + i * 9], [-28, 0], { extrapolateRight: 'clamp' })
  );

  const hasMockup = !!scene.mockup;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(145deg, ${DARKER}, ${DARK})`,
      fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: scene.accent, opacity: bgFlash * 0.12, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', height: 5, width: barW, background: `linear-gradient(90deg, ${scene.accent}, ${INDIGO})`, borderRadius: '0 0 4px 4px' }} />
      <div style={{ position: 'absolute', top: 22, left: 36, fontSize: 15, fontWeight: 800, color: WHITE, letterSpacing: 1 }}>
        Brand<span style={{ color: ORANGE }}>Monkz</span>
        <span style={{ fontSize: 11, color: TEAL, marginLeft: 10, background: `${TEAL}22`, borderRadius: 6, padding: '2px 8px' }}>TEAM SETUP</span>
      </div>
      <div style={{ position: 'absolute', top: 22, right: 36, background: `${scene.accent}22`, border: `2px solid ${scene.accent}`, borderRadius: 20, padding: '4px 16px', color: scene.accent, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
        STEP {idx + 1} / {total}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 48, maxWidth: 1100, width: '100%', padding: '0 56px' }}>
        {/* Left: text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: hasMockup ? 'flex-start' : 'center' }}>
          <div style={{ fontSize: hasMockup ? 72 : 88, transform: `scale(${emojiSc})`, marginBottom: 12, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))', lineHeight: 1 }}>
            {scene.emoji}
          </div>
          <div style={{ fontSize: hasMockup ? 36 : 44, fontWeight: 900, color: WHITE, lineHeight: 1.15, opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 6, textShadow: `0 2px 20px ${scene.accent}44` }}>
            {scene.title}
          </div>
          <div style={{ fontSize: 18, color: scene.accent, fontWeight: 600, opacity: subOp, marginBottom: 22 }}>
            {scene.subtitle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {scene.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderLeft: `4px solid ${scene.accent}`, borderRadius: 10, padding: '9px 16px', opacity: bulletOps[i], transform: `translateX(${bulletXs[i]}px)` }}>
                <span style={{ fontSize: 16, color: WHITE, fontWeight: 500, lineHeight: 1.4 }}>{b}</span>
              </div>
            ))}
          </div>
          {scene.tip && (
            <div style={{ marginTop: 16, background: `${scene.accent}16`, border: `1px solid ${scene.accent}44`, borderRadius: 10, padding: '8px 16px', fontSize: 14, color: GRAY, opacity: tipOp, fontStyle: 'italic' }}>
              {scene.tip}
            </div>
          )}
        </div>

        {/* Right: mockup */}
        {hasMockup && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 380 }}>
            {scene.mockup === 'team-list'    && <TeamListMockup    frame={frame} accent={scene.accent} />}
            {scene.mockup === 'invite-form'  && <InviteFormMockup  frame={frame} accent={scene.accent} />}
            {scene.mockup === 'smtp-settings'&& <SmtpSettingsMockup frame={frame} accent={scene.accent} />}
            {scene.mockup === 'email-server' && <EmailServerMockup  frame={frame} accent={scene.accent} />}
            {scene.mockup === 'verify'       && <VerifyMockup       frame={frame} accent={scene.accent} />}
            {scene.mockup === 'sent-from'    && <SentFromMockup     frame={frame} accent={scene.accent} />}
          </div>
        )}
      </div>

      {/* progress dots */}
      <div style={{ position: 'absolute', bottom: 26, display: 'flex', gap: 8 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ width: i === idx ? 24 : 8, height: 8, borderRadius: 4, background: i === idx ? scene.accent : 'rgba(255,255,255,0.18)' }} />
        ))}
      </div>
    </div>
  );
};

// ── Composition ───────────────────────────────────────────────────────────────

const FRAMES_PER_SCENE = 150; // 5s @ 30fps

export const TeamEmailVideo: React.FC = () => (
  <>
    {SCENES.map((_, idx) => (
      <Sequence key={idx} from={idx * FRAMES_PER_SCENE} durationInFrames={FRAMES_PER_SCENE}>
        <TeamEmailScene idx={idx} total={SCENES.length} />
      </Sequence>
    ))}
  </>
);
