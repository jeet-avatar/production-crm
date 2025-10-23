import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, BuildingOfficeIcon, PaperAirplaneIcon, ArrowUpTrayIcon, SparklesIcon, PencilIcon, FunnelIcon, XMarkIcon, ArrowsUpDownIcon, ChevronUpIcon, ChevronDownIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { companiesApi, enrichmentApi } from '../../services/api';
import { CompanyForm } from './CompanyForm';
import { CampaignSelectModal } from '../../components/CampaignSelectModal';
import { ImportCompaniesModal } from '../../components/ImportCompaniesModal';
import { LeadDiscoveryModal } from '../../components/LeadDiscoveryModal';
import { CompaniesHelpGuide } from '../../components/CompaniesHelpGuide';
import { useTheme } from '../../contexts/ThemeContext';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  status: string;
}

interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  location?: string;
  employeeCount?: string;
  size?: string;
  description?: string;
  dataSource?: string;
  contacts?: Contact[];
  _count?: {
    contacts: number;
  };
  createdAt: string;
}

export function CompanyList() {
  const navigate = useNavigate();
  const { gradients } = useTheme();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const companiesPerPage = 10;
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLeadDiscovery, setShowLeadDiscovery] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Load preferences from localStorage or use defaults
  const [sortBy, setSortBy] = useState<string>(() => {
    return localStorage.getItem('companies_sortBy') || 'createdAt';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    return (localStorage.getItem('companies_sortOrder') as 'asc' | 'desc') || 'desc';
  });
  const [industryFilter, setIndustryFilter] = useState<string>(() => {
    return localStorage.getItem('companies_industryFilter') || '';
  });
  const [showFilters, setShowFilters] = useState(false);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('companies_sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('companies_sortOrder', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem('companies_industryFilter', industryFilter);
  }, [industryFilter]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const params: any = {
        search: searchTerm,
        page: currentPage,
        limit: companiesPerPage,
        sortBy,
        sortOrder,
      };

      if (industryFilter) {
        params.industry = industryFilter;
      }

      const response = await companiesApi.getAll(params);

      setCompanies(response.companies || []);
      setTotalCompanies(response.total || 0);
    } catch (err) {
      setError('Failed to load companies');
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [searchTerm, currentPage, sortBy, sortOrder, industryFilter]);

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending for name/industry, descending for others
      setSortBy(field);
      setSortOrder(field === 'name' || field === 'industry' ? 'asc' : 'desc');
    }
  };

  const clearFilters = () => {
    setSortBy('createdAt');
    setSortOrder('desc');
    setIndustryFilter('');
    setSearchTerm('');
    // Clear from localStorage too
    localStorage.setItem('companies_sortBy', 'createdAt');
    localStorage.setItem('companies_sortOrder', 'desc');
    localStorage.setItem('companies_industryFilter', '');
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
      await companiesApi.delete(id);
      loadCompanies();
    } catch (err) {
      setError('Failed to delete company');
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setShowModal(true);
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCompany(null);
    loadCompanies();
  };

  const handleBulkEnrich = async () => {
    if (!companies.length) {
      setError('No companies to enrich');
      return;
    }

    if (!confirm(`This will enrich ${companies.length} companies using AI. This may take a few minutes. Continue?`)) {
      return;
    }

    try {
      setEnriching(true);
      setError('');

      const companyIds = companies.map(c => c.id);
      await enrichmentApi.bulkEnrich(companyIds);

      setError('');
      alert(`Successfully enriched ${companies.length} companies!`);
      loadCompanies();
    } catch (err: any) {
      console.error('Error enriching companies:', err);
      setError(err.response?.data?.message || 'Failed to enrich companies');
    } finally {
      setEnriching(false);
    }
  };

  const totalPages = Math.ceil(totalCompanies / companiesPerPage);
  const startIndex = (currentPage - 1) * companiesPerPage + 1;
  const endIndex = Math.min(currentPage * companiesPerPage, totalCompanies);

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Main Container with Border */}
      <div className="border-2 border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Companies</h1>
              <button
                type="button"
                onClick={() => setShowHelpGuide(true)}
                className="p-3 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 text-white hover:from-orange-600 hover:via-orange-700 hover:to-rose-600 transition-all shadow-xl hover:shadow-2xl"
                title="Show Help Guide"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-1">Manage your business relationships • Click ? for help</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowLeadDiscovery(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold rounded-xl border-2 border-black transition-all shadow-md hover:scale-105"
            >
              <SparklesIcon className="h-5 w-5 text-black" />
              <span>Discover Leads</span>
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold rounded-xl border-2 border-black transition-all shadow-md hover:scale-105"
            >
              <ArrowUpTrayIcon className="h-5 w-5 text-black" />
              <span>Import Companies</span>
            </button>
            <button
              type="button"
              onClick={handleBulkEnrich}
              disabled={enriching}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold rounded-xl border-2 border-black transition-all shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <SparklesIcon className="h-5 w-5 text-black" />
              <span>{enriching ? 'Enriching...' : 'AI Enrich Data'}</span>
            </button>
            <button
              type="button"
              onClick={handleAddCompany}
              className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5`}
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Company</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 space-y-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                Sort by:
                {sortBy !== 'createdAt' && (
                  <span className="text-xs text-green-600 font-medium">✓ Saved</span>
                )}
              </label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                title="Your preference is automatically saved"
              >
                <option value="createdAt">Recently Added</option>
                <option value="name">Alphabetical (A-Z)</option>
                <option value="industry">Industry</option>
                <option value="employeeCount">Employee Count</option>
                <option value="foundedYear">Founded Year</option>
              </select>

              {/* Sort Order Toggle */}
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title={`${sortOrder === 'asc' ? 'Ascending' : 'Descending'} - Preference saved automatically`}
              >
                {sortOrder === 'asc' ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 flex items-center gap-2 rounded-xl font-bold tracking-wide transition-all shadow-md ${
                showFilters
                  ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black`
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
              {industryFilter && (
                <span className="px-2 py-0.5 bg-white text-orange-600 rounded-full text-xs font-bold">
                  1
                </span>
              )}
            </button>

            {/* Clear Filters */}
            {(searchTerm || industryFilter || sortBy !== 'createdAt') && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <XMarkIcon className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-white border-2 border-gray-200 rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FunnelIcon className="w-4 h-4" />
                Advanced Filters
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Industry Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Technology, Healthcare"
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>

                {/* Quick Industry Tags */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quick Select
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education'].map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setIndustryFilter(ind)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl tracking-wide transition-all shadow-sm ${
                          industryFilter === ind
                            ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 my-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg">
            {error}
          </div>
        )}

        {/* Companies Table */}
        <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Headquarters</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employees</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacts</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Source</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <BuildingOfficeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-500 mb-2">No companies found</p>
                    <p className="text-sm text-gray-400 mb-6">Get started by adding your first company</p>
                    <button
                      onClick={handleAddCompany}
                      className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-bold px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 tracking-wide`}
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add your first company
                    </button>
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                    <tr
                      key={company.id}
                      onClick={() => navigate(`/companies/${company.id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients.brand.primary.gradient} text-black font-bold flex items-center justify-center text-sm shadow-md`}>
                            {company.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{company.name}</div>
                            {company.domain && (
                              <div className="text-sm text-gray-500">{company.domain}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {company.industry || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {company.location || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {company.employeeCount || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {company._count?.contacts || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {company.dataSource === 'csv_import' ? (
                          <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold">
                            📄 Manual Research
                          </span>
                        ) : company.dataSource === 'apollo' ? (
                          <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold">
                            ⚡ Apollo.io
                          </span>
                        ) : company.dataSource === 'lead_discovery' ? (
                          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                            🎯 Lead Discovery
                          </span>
                        ) : company.dataSource === 'manual_contact' ? (
                          <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold">
                            👤 Added via Contact
                          </span>
                        ) : company.dataSource === 'socialflow' ? (
                          <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-xs font-medium">
                            🌊 SocialFlow
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            📝 Manual Entry
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCompany(company);
                              setShowCampaignModal(true);
                            }}
                            className="px-3 py-2 bg-gradient-to-r from-orange-600 to-rose-600 text-black text-xs font-bold rounded-lg hover:from-orange-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
                            title="Add to campaign"
                          >
                            <PaperAirplaneIcon className="h-3.5 w-3.5" />
                            Campaign
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCompany(company);
                            }}
                            className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
                            title="Edit company"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCompanies > companiesPerPage && (
          <div className="border-t-2 border-gray-200 px-8 py-5 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600">
                Showing <span className="font-bold text-gray-900">{startIndex}</span> to <span className="font-bold text-gray-900">{endIndex}</span> of <span className="font-bold text-gray-900">{totalCompanies}</span> companies
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-bold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  Previous
                </button>
                <div className={`px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black rounded-xl font-bold text-sm shadow-md`}>
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-bold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Company Form Modal */}
      {showModal && (
        <CompanyForm
          company={editingCompany}
          onClose={handleModalClose}
        />
      )}

      {/* Campaign Select Modal */}
      {showCampaignModal && selectedCompany && (
        <CampaignSelectModal
          isOpen={showCampaignModal}
          onClose={() => {
            setShowCampaignModal(false);
            setSelectedCompany(null);
          }}
          companyId={selectedCompany.id}
          companyName={selectedCompany.name}
          onSuccess={() => {
            loadCompanies();
          }}
        />
      )}

      {/* Import Companies Modal */}
      <ImportCompaniesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          loadCompanies();
        }}
      />

      {/* Lead Discovery Modal */}
      {showLeadDiscovery && (
        <LeadDiscoveryModal
          mode="company"
          onClose={() => setShowLeadDiscovery(false)}
          onImport={() => {
            loadCompanies();
          }}
        />
      )}

      {/* Help Guide */}
      {showHelpGuide && (
        <CompaniesHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}
    </div>
  );
}
