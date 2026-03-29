import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentCheckIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { contractsApi } from '../../services/api';

interface Contract {
  id: string;
  title: string;
  status: string;
  signedBy?: string;
  signedAt?: string;
  createdAt: string;
  deal?: { id: string; title: string };
}

const statusBadge: Record<string, string> = {
  DRAFT: 'badge badge-gray',
  SENT_FOR_SIGNATURE: 'badge badge-warning',
  SIGNED: 'badge badge-success',
  CANCELLED: 'badge badge-error',
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  SENT_FOR_SIGNATURE: 'Sent',
  SIGNED: 'Signed',
  CANCELLED: 'Cancelled',
};

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export function ContractsPage() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    contractsApi.getAll().then(setContracts).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = contracts.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.deal?.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9]">Contracts</h1>
          <p className="text-[#94A3B8] mt-1">All contracts across your deals</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
        <input
          type="text"
          placeholder="Search contracts or deals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 w-full max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardDocumentCheckIcon className="h-12 w-12 text-[#64748B] mx-auto mb-4" />
            <p className="text-[#94A3B8] font-medium">
              {search ? 'No contracts match your search.' : 'No contracts yet. Create one from a deal\'s Documents tab.'}
            </p>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Deal</th>
                <th>Status</th>
                <th>Signed By</th>
                <th>Signed</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="cursor-pointer hover:bg-[#12121f] transition-colors" onClick={() => c.deal && navigate(`/deals/${c.deal.id}`)}>
                  <td className="font-semibold text-[#F1F5F9]">{c.title}</td>
                  <td className="text-[#94A3B8]">{c.deal?.title ?? '—'}</td>
                  <td>
                    <span className={statusBadge[c.status] ?? 'badge badge-gray'}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="text-[#94A3B8]">{c.signedBy ?? '—'}</td>
                  <td className="text-[#94A3B8]">{formatDate(c.signedAt)}</td>
                  <td className="text-[#94A3B8]">{formatDate(c.createdAt)}</td>
                  <td>
                    {c.deal && (
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/deals/${c.deal!.id}`); }}
                        className="p-1 rounded hover:bg-indigo-50 text-[#64748B] hover:text-indigo-600 transition-colors"
                        title="Open deal"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-sm text-[#94A3B8] mt-3">{filtered.length} contract{filtered.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
