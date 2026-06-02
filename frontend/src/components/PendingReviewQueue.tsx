import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  apolloApi,
  type ApolloPendingReviewItem,
} from '../services/api';
import {
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  EnvelopeOpenIcon,
} from '@heroicons/react/24/outline';

interface Props {
  // Allow parent CampaignsPage to trigger a refetch (e.g., after Apollo Campaign button stages a new batch).
  refreshKey?: number;
  streamFilter?: string;
}

interface EditModalState {
  item: ApolloPendingReviewItem;
  intentHook: string;
  companyContext: string;
  painPoint: string;
  cta: string;
}

export function PendingReviewQueue({ refreshKey, streamFilter }: Props) {
  const [items, setItems] = useState<ApolloPendingReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apolloApi.pendingReview.list({
        page,
        pageSize,
        stream: streamFilter,
      });
      setItems(resp.items);
      setTotal(resp.total);
    } catch (e: any) {
      setError(e?.message || 'Failed to load pending queue');
    } finally {
      setLoading(false);
    }
  }, [page, streamFilter]);

  useEffect(() => {
    fetchList();
    // refreshKey is in deps so the parent can force a refetch after Apollo Campaign staging
  }, [fetchList, refreshKey]);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await apolloApi.pendingReview.approve(id);
      // optimistic remove on success
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => Math.max(t - 1, 0));
    } catch (e: any) {
      alert(`Approve failed: ${e?.message || 'unknown'}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string, reason: string) {
    setBusyId(id);
    try {
      await apolloApi.pendingReview.reject(id, reason || undefined);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => Math.max(t - 1, 0));
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) {
      alert(`Reject failed: ${e?.message || 'unknown'}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveEdit(modal: EditModalState) {
    setBusyId(modal.item.id);
    try {
      // Backend (Plan 06-04 /edit, MEDIUM 1 fix) re-renders renderedBody server-side when aiTokens
      // changes and renderedBody is NOT explicitly provided. We send only aiTokens, then patch the
      // local item with the re-rendered server-side renderedBody from the response so the preview refreshes.
      const updated = await apolloApi.pendingReview.edit(modal.item.id, {
        aiTokens: {
          intentHook: modal.intentHook,
          companyContext: modal.companyContext,
          painPoint: modal.painPoint,
          cta: modal.cta,
        },
      });
      setItems((prev) =>
        prev.map((it) =>
          it.id === updated.id
            ? {
                ...it,
                aiTokens: updated.aiTokens,
                subject: updated.subject,
                renderedBody: updated.renderedBody,
              }
            : it,
        ),
      );
      setEditModal(null);
    } catch (e: any) {
      alert(`Edit failed: ${e?.message || 'unknown'}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkApprove() {
    setBulkProgress({ done: 0, total: items.length });
    for (let i = 0; i < items.length; i++) {
      try {
        await apolloApi.pendingReview.approve(items[i].id);
        setBulkProgress({ done: i + 1, total: items.length });
      } catch (e: any) {
        // stop on first failure so the user can investigate
        alert(`Bulk approve stopped at row ${i + 1}: ${e?.message || 'unknown'}`);
        break;
      }
    }
    setBulkProgress(null);
    await fetchList();
  }

  // -------- Render --------
  if (loading && items.length === 0) {
    return <div className="p-12 text-center text-[var(--text-secondary)]">Loading pending queue…</div>;
  }
  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        {error}{' '}
        <button onClick={fetchList} className="underline">
          Retry
        </button>
      </div>
    );
  }
  if (total === 0 && !loading) {
    return (
      <div className="p-16 text-center">
        <EnvelopeOpenIcon className="h-16 w-16 mx-auto text-[var(--text-secondary)] mb-4" />
        <p className="text-lg text-[var(--text-secondary)]">No pending emails.</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-2">
          Click "Apollo Campaign" above to generate the next batch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk action header */}
      <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)]">
        <div>
          <span className="font-bold">{total} pending review</span>
          <span className="text-sm text-[var(--text-secondary)] ml-3">
            Page {page} of {Math.max(Math.ceil(total / pageSize), 1)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {bulkProgress ? (
            <span className="text-sm">
              Approving {bulkProgress.done} / {bulkProgress.total}…
            </span>
          ) : (
            <button
              onClick={handleBulkApprove}
              disabled={items.length === 0 || busyId !== null}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
            >
              Approve all on this page ({items.length})
            </button>
          )}
          <button
            onClick={fetchList}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Inbox-card rows */}
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] overflow-hidden"
        >
          {/* Header row: who/what/when + action buttons */}
          <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
            <div>
              <div className="font-bold">{item.contactName}</div>
              <div className="text-sm text-[var(--text-secondary)]">
                {item.contactEmail} · {item.companyName || 'no company'} · {item.stream}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">
                Subject: <strong>{item.subject}</strong> · Cost: ${item.claudeCostUSD.toFixed(4)} ·{' '}
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApprove(item.id)}
                disabled={busyId !== null}
                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
                title="Approve and send via Resend"
              >
                <CheckIcon className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() =>
                  setEditModal({
                    item,
                    intentHook: (item.aiTokens?.intentHook as string) || '',
                    companyContext: (item.aiTokens?.companyContext as string) || '',
                    painPoint: (item.aiTokens?.painPoint as string) || '',
                    cta: (item.aiTokens?.cta as string) || '',
                  })
                }
                disabled={busyId !== null}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => setRejectingId(item.id)}
                disabled={busyId !== null}
                className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
              >
                <XMarkIcon className="h-4 w-4" />
                Reject
              </button>
            </div>
          </div>

          {/* Inbox-card preview — DOMPurify-sanitized HTML body */}
          <div className="max-h-[400px] overflow-y-auto bg-white">
            <div
              className="p-2"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.renderedBody) }}
            />
          </div>

          {/* Reject confirmation inline */}
          {rejectingId === item.id && (
            <div className="p-4 bg-red-50 border-t border-red-200">
              <label className="block text-sm font-bold text-red-800 mb-2">
                Reject this email (reason optional):
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., AI hallucinated company name"
                className="w-full px-3 py-2 border border-red-300 rounded-lg mb-3"
                maxLength={500}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleReject(item.id, rejectReason)}
                  disabled={busyId !== null}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  Confirm reject
                </button>
                <button
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2 p-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {Math.max(Math.ceil(total / pageSize), 1)}
          </span>
          <button
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit token modal — backend re-renders renderedBody server-side (Plan 06-04 MEDIUM 1 fix) */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[var(--bg-elevated)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">
              Edit AI tokens for {editModal.item.contactName}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Updates to these 4 tokens are saved on the audit row. The rendered HTML body is
              automatically re-rendered server-side from the row's template + new tokens, so the
              preview below refreshes after Save.
            </p>
            <div className="space-y-3">
              {(['intentHook', 'companyContext', 'painPoint', 'cta'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-bold mb-1 capitalize">{field}</label>
                  <textarea
                    value={editModal[field]}
                    onChange={(e) =>
                      setEditModal((m) => (m ? { ...m, [field]: e.target.value } : m))
                    }
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg min-h-[80px]"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editModal)}
                disabled={busyId !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50"
              >
                Save tokens
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
