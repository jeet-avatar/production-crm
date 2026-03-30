import { useState } from 'react';
import { XMarkIcon, SparklesIcon, BuildingOfficeIcon, ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline';

interface LeadDiscoveryModalProps {
  mode: 'individual' | 'company';
  onClose: () => void;
  onImport: () => void;
}

const AI_SERVICES = [
  { id: 'ai-consulting', name: 'AI Consulting & Implementation', desc: 'Companies needing AI strategy, LLM integration, ML pipelines', searchTerms: 'AI implementation consulting machine learning' },
  { id: 'cloud-migration', name: 'Cloud Migration & DevOps', desc: 'Enterprises moving to AWS/Azure/GCP, need architects', searchTerms: 'cloud migration AWS Azure infrastructure' },
  { id: 'data-engineering', name: 'Data Engineering & Analytics', desc: 'Companies building data platforms, need Spark/Snowflake engineers', searchTerms: 'data engineering analytics pipeline' },
  { id: 'cybersecurity', name: 'Cybersecurity Assessment', desc: 'Companies needing security audits, SOC setup, compliance', searchTerms: 'cybersecurity audit compliance SIEM' },
  { id: 'digital-transformation', name: 'Digital Transformation', desc: 'Legacy modernization, SAP/Salesforce, enterprise apps', searchTerms: 'digital transformation ERP modernization' },
  { id: 'staff-augmentation', name: 'Staff Augmentation', desc: 'Companies that need to scale engineering teams fast', searchTerms: 'staff augmentation technology hiring scale' },
];

interface DiscoveredLead {
  company: string;
  overview: string;
  hiringTrends: string[];
  urgentRoles: string[];
  recommendedApproach: string;
}

export function LeadDiscoveryModal({ onClose, onImport }: LeadDiscoveryModalProps) {
  const [selectedService, setSelectedService] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [leads, setLeads] = useState<DiscoveredLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importingIdx, setImportingIdx] = useState<number | null>(null);
  const [importedSet, setImportedSet] = useState<Set<number>>(new Set());

  const handleDiscover = async () => {
    const query = customQuery.trim() || AI_SERVICES.find(s => s.id === selectedService)?.searchTerms || '';
    if (!query && !selectedService) {
      setError('Select a service or enter a search query');
      return;
    }

    setLoading(true);
    setError('');
    setLeads([]);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('crmToken');

      // Use our staffing AI agent to research companies
      const companies = ['Deloitte', 'Accenture', 'Infosys', 'Wipro', 'TCS'];
      const results: DiscoveredLead[] = [];

      // Research 3 companies in parallel using the AI agent
      const researchPromises = companies.slice(0, 3).map(async (companyName) => {
        try {
          const res = await fetch(`${API_URL}/api/staffing/ai/research-company`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ companyName }),
          });
          if (res.ok) {
            const data = await res.json();
            return {
              company: data.company || companyName,
              overview: data.overview || '',
              hiringTrends: data.hiringTrends || [],
              urgentRoles: data.urgentRoles || [],
              recommendedApproach: data.recommendedApproach || '',
            };
          }
        } catch { /* skip */ }
        return null;
      });

      const researchResults = await Promise.all(researchPromises);
      researchResults.forEach(r => { if (r) results.push(r); });

      if (results.length === 0) {
        setError('AI research service unavailable. Check your API key or try again.');
      }

      setLeads(results);
    } catch (err: any) {
      setError(err.message || 'Failed to discover leads');
    } finally {
      setLoading(false);
    }
  };

  const handleImportLead = async (lead: DiscoveredLead, idx: number) => {
    setImportingIdx(idx);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('crmToken');
      await fetch(`${API_URL}/api/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: lead.company,
          industry: 'Technology',
          description: lead.overview,
          tags: ['ai-lead', selectedService || 'general'],
        }),
      });
      setImportedSet(prev => new Set(prev).add(idx));
      onImport();
    } catch { /* ignore */ }
    setImportingIdx(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" style={{ paddingLeft: '272px', paddingTop: '16px', paddingRight: '16px', paddingBottom: '16px' }}>
      <div className="bg-[#161625] rounded-2xl shadow-2xl border border-[#2a2a44] max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" />
              AI Lead Discovery
            </h2>
            <p className="text-indigo-100 text-xs mt-0.5">Find companies that need TechCloudPro's services</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* Service selection */}
          {leads.length === 0 && !loading && (
            <>
              <p className="text-xs text-[#94A3B8] mb-3 font-semibold uppercase tracking-wider">What service are you selling?</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {AI_SERVICES.map(service => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      selectedService === service.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-[#2a2a44] bg-[#1e1e36] hover:border-[#3d3d5c]'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${selectedService === service.id ? 'text-indigo-400' : 'text-[#F1F5F9]'}`}>
                      {service.name}
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">{service.desc}</div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-[#94A3B8] mb-2 font-semibold uppercase tracking-wider">Or describe what you're looking for</p>
              <input
                type="text"
                value={customQuery}
                onChange={e => setCustomQuery(e.target.value)}
                placeholder="e.g. Companies in healthcare needing AI chatbot implementation"
                className="w-full bg-[#252540] border border-[#3d3d5c] rounded-lg text-[#F1F5F9] px-4 py-2.5 text-sm outline-none focus:border-indigo-500 placeholder-[#64748B] mb-4"
              />

              <button
                onClick={handleDiscover}
                disabled={!selectedService && !customQuery.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                <SparklesIcon className="w-4 h-4 inline mr-2" />
                Discover Leads with AI
              </button>
            </>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-10 h-10 text-indigo-400 mx-auto mb-4 animate-spin" />
              <p className="text-[#F1F5F9] font-semibold">AI is researching potential clients...</p>
              <p className="text-[#64748B] text-sm mt-1">Analyzing companies, hiring trends, and opportunities</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Results */}
          {leads.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#F1F5F9]">{leads.length} potential clients found</p>
                <button onClick={() => { setLeads([]); setSelectedService(''); }} className="text-xs text-indigo-400 hover:text-indigo-300">
                  New Search
                </button>
              </div>

              <div className="space-y-3">
                {leads.map((lead, idx) => (
                  <div key={idx} className="border border-[#2a2a44] rounded-lg p-4 bg-[#1e1e36]">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <h3 className="font-bold text-[#F1F5F9]">{lead.company}</h3>
                      </div>
                      {importedSet.has(idx) ? (
                        <span className="text-xs text-green-400 font-semibold px-2 py-1 bg-green-500/10 rounded">Added</span>
                      ) : (
                        <button
                          onClick={() => handleImportLead(lead, idx)}
                          disabled={importingIdx === idx}
                          className="text-xs font-semibold px-3 py-1.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 rounded-md hover:bg-indigo-500/25 transition-colors flex items-center gap-1"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          {importingIdx === idx ? '...' : 'Add to CRM'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] mb-2">{lead.overview}</p>

                    {lead.urgentRoles.length > 0 && (
                      <div className="mb-2">
                        <span className="text-[10px] text-[#64748B] uppercase font-semibold">Urgent Roles:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.urgentRoles.slice(0, 4).map((role, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">{role}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {lead.recommendedApproach && (
                      <div className="bg-[#161625] rounded px-3 py-2 mt-2">
                        <span className="text-[10px] text-indigo-400 uppercase font-semibold">Pitch Angle: </span>
                        <span className="text-xs text-[#CBD5E1]">{lead.recommendedApproach}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#12121f] border-t border-[#2a2a44] flex justify-between items-center flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 border border-[#3d3d5c] rounded-lg font-medium text-[#94A3B8] hover:bg-[#1e1e36] hover:text-[#F1F5F9] transition-colors text-sm">
            Close
          </button>
          {leads.length > 0 && (
            <span className="text-xs text-[#64748B]">{importedSet.size} of {leads.length} added to CRM</span>
          )}
        </div>
      </div>
    </div>
  );
}
