import { useState, useEffect } from 'react';
import { DocumentTextIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { quotesApi, contractsApi } from '../../../services/api';

interface Quote {
  id: string;
  title: string;
  total: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

interface Contract {
  id: string;
  title: string;
  status: 'DRAFT' | 'SENT_FOR_SIGNATURE' | 'SIGNED' | 'CANCELLED';
  signedBy?: string | null;
  createdAt: string;
}

interface DocumentsTabProps {
  dealId: string;
  dealStage: string;
  onNewQuote?: () => void;
  onNewContract?: () => void;
}

const quoteStatusBadge: Record<string, string> = {
  DRAFT: 'badge badge-gray',
  SENT: 'badge badge-warning',
  ACCEPTED: 'badge badge-success',
  REJECTED: 'badge badge-error',
  EXPIRED: 'badge badge-gray',
};

const contractStatusBadge: Record<string, string> = {
  DRAFT: 'badge badge-gray',
  SENT_FOR_SIGNATURE: 'badge badge-warning',
  SIGNED: 'badge badge-success',
  CANCELLED: 'badge badge-error',
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function DocumentsTab({ dealId, dealStage, onNewQuote, onNewContract }: DocumentsTabProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const [quotesRes, contractsRes] = await Promise.all([
        quotesApi.getByDeal(dealId),
        contractsApi.getByDeal(dealId),
      ]);
      setQuotes(quotesRes.quotes || []);
      setContracts(contractsRes.contracts || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [dealId]);

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    try {
      await quotesApi.delete(id);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to delete quote:', err);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    try {
      await contractsApi.delete(id);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to delete contract:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quotes Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Quotes</h3>
          </div>
          <div className="flex items-center gap-3">
            {dealStage !== 'CLOSED_WON' && (
              <span className="text-xs text-gray-400">Available when deal is Closed Won</span>
            )}
            {dealStage === 'CLOSED_WON' && (
              <button
                type="button"
                onClick={onNewQuote}
                disabled={!onNewQuote}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  onNewQuote
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
                }`}
              >
                <PlusIcon className="h-4 w-4" />
                New Quote
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : quotes.length === 0 ? (
          <p className="text-gray-500 text-sm">No quotes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="text-sm">
                    <td className="py-3 pr-4 font-medium text-gray-900">{quote.title}</td>
                    <td className="py-3 pr-4 text-gray-700">{formatCurrency(quote.total)}</td>
                    <td className="py-3 pr-4">
                      <span className={quoteStatusBadge[quote.status] || 'badge badge-gray'}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(quote.createdAt)}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteQuote(quote.id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete quote"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contracts Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Contracts</h3>
          </div>
          <button
            type="button"
            onClick={onNewContract}
            disabled={!onNewContract}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              onNewContract
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
            }`}
          >
            <PlusIcon className="h-4 w-4" />
            New Contract
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : contracts.length === 0 ? (
          <p className="text-gray-500 text-sm">No contracts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Signed By</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="text-sm">
                    <td className="py-3 pr-4 font-medium text-gray-900">{contract.title}</td>
                    <td className="py-3 pr-4">
                      <span className={contractStatusBadge[contract.status] || 'badge badge-gray'}>
                        {contract.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{contract.signedBy || '—'}</td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(contract.createdAt)}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteContract(contract.id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete contract"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
