import { useState } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon, CheckCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface LeadData {
  LeadName: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  LinkedinLink?: string;
  website?: string;
  headquarters?: string;
  location?: string;
  industry?: string;
  leadScore?: number;
}

interface LeadDiscoveryModalProps {
  mode: 'individual' | 'company';
  onClose: () => void;
  onImport: () => void;
}

export function LeadDiscoveryModal({ mode, onClose, onImport }: LeadDiscoveryModalProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [techStack, setTechStack] = useState('');
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [infoMessage, setInfoMessage] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');
    setLeads([]);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leads/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crmToken')}`,
        },
        body: JSON.stringify({
          query,
          mode,
          location,
          industry: mode === 'company' ? industry : undefined,
          techStack: mode === 'company' ? techStack : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to discover leads');
      }

      const data = await response.json();
      setLeads(data.leads || []);

      // Show info message if using mock data
      if (data.source === 'mock' && data.message) {
        setInfoMessage(data.message);
      }

      if (!data.leads || data.leads.length === 0) {
        setError('No leads found. Try different search criteria.');
      }
    } catch (err: any) {
      setError(err.message || 'The lead discovery service is temporarily unavailable. Please try again later.');
      console.error('Lead discovery error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportLead = async (lead: LeadData) => {
    const leadId = lead.LinkedinLink || lead.LeadName;
    setImportingId(leadId);
    setError('');

    try {
      const endpoint = mode === 'individual'
        ? '/api/leads/import-contact'
        : '/api/leads/import-company';

      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crmToken')}`,
        },
        body: JSON.stringify({ leadData: lead }),
      });

      if (!response.ok) {
        throw new Error('Failed to import lead');
      }

      // Mark as imported
      setImportedIds(prev => new Set(prev).add(leadId));

      // Call parent callback
      onImport();

      // Show success (will be visible briefly before modal closes)
      setTimeout(() => {
        setImportingId(null);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to import lead');
      console.error('Import error:', err);
      setImportingId(null);
    }
  };

  const handleClearForm = () => {
    setQuery('');
    setLocation('');
    setIndustry('');
    setTechStack('');
    setLeads([]);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-black w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 px-8 py-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserGroupIcon className="w-8 h-8 text-black" />
              <div>
                <h2 className="text-3xl font-bold text-black">
                  Discover {mode === 'individual' ? 'Contacts' : 'Companies'}
                </h2>
                <p className="text-black/90 mt-1">
                  Find potential leads and import them directly to your CRM
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-black hover:bg-white/20 rounded-lg p-2 transition-colors"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search Form */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Query *
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={mode === 'individual' ? 'e.g., Software Engineer, Marketing Manager' : 'e.g., SaaS, E-commerce, Fintech'}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., San Francisco, New York, Remote"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              {mode === 'company' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g., Technology, Healthcare, Finance"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tech Stack
                    </label>
                    <input
                      type="text"
                      value={techStack}
                      onChange={(e) => setTechStack(e.target.value)}
                      placeholder="e.g., React, Python, AWS"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    Search Leads
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearForm}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm flex items-start gap-2">
              <span className="text-lg">ℹ️</span>
              <span>{infoMessage}</span>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <ArrowPathIcon className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Searching for leads...</p>
              </div>
            </div>
          ) : leads.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leads.map((lead, index) => {
                const leadId = lead.LinkedinLink || lead.LeadName;
                const isImporting = importingId === leadId;
                const isImported = importedIds.has(leadId);

                return (
                  <div
                    key={index}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-lg transition-all"
                  >
                    {/* Avatar/Logo */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-rose-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {lead.LeadName?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                          {lead.LeadName || 'Unknown'}
                        </h3>
                        {mode === 'individual' ? (
                          // For people: Show job title and company
                          <div className="text-sm text-gray-600">
                            {lead.jobTitle && <p className="truncate">{lead.jobTitle}</p>}
                            {lead.company && (
                              <p className="truncate font-medium flex items-center gap-1">
                                <span className="text-xs">🏢</span>
                                {lead.company}
                              </p>
                            )}
                            {!lead.jobTitle && !lead.company && <p className="truncate">N/A</p>}
                          </div>
                        ) : (
                          // For companies: Show company name or industry
                          <p className="text-sm text-gray-600 truncate">
                            {lead.industry || lead.company || 'N/A'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Lead Score (for companies) */}
                    {mode === 'company' && lead.leadScore && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                          Score: {lead.leadScore}/100
                        </span>
                      </div>
                    )}

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      {lead.email && (
                        <p className="text-xs text-gray-600 truncate">
                          ✉️ {lead.email}
                        </p>
                      )}
                      {(lead.headquarters || lead.location) && (
                        <p className="text-xs text-gray-600 truncate">
                          📍 {lead.headquarters || lead.location}
                        </p>
                      )}
                      {lead.industry && (
                        <p className="text-xs text-gray-600 truncate">
                          🏢 {lead.industry}
                        </p>
                      )}
                    </div>

                    {/* Links */}
                    <div className="flex gap-2 mb-4">
                      {lead.LinkedinLink && (
                        <a
                          href={lead.LinkedinLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1"
                        >
                          LinkedIn <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                      )}
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1"
                        >
                          Website <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Import Button */}
                    <button
                      onClick={() => handleImportLead(lead)}
                      disabled={isImporting || isImported}
                      className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        isImported
                          ? 'bg-green-100 text-green-700 cursor-not-allowed'
                          : isImporting
                          ? 'bg-orange-100 text-orange-700 cursor-wait'
                          : 'bg-gradient-to-r from-orange-500 to-rose-500 text-black hover:from-orange-700 hover:to-rose-700 active:scale-95'
                      }`}
                    >
                      {isImported ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          Imported
                        </>
                      ) : isImporting ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Import to CRM'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">
                No leads found yet. Enter search criteria above to discover leads.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
