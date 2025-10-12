import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, BuildingOfficeIcon, PaperAirplaneIcon, ArrowUpTrayIcon, SparklesIcon, PencilIcon } from '@heroicons/react/24/outline';
import { companiesApi, enrichmentApi } from '../../services/api';
import { CompanyForm } from './CompanyForm';
import { CampaignSelectModal } from '../../components/CampaignSelectModal';
import { ImportCompaniesModal } from '../../components/ImportCompaniesModal';

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
  const [enriching, setEnriching] = useState(false);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await companiesApi.getAll({
        search: searchTerm,
        page: currentPage,
        limit: companiesPerPage,
      });

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
  }, [searchTerm, currentPage]);

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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Companies</h1>
            <p className="text-sm font-medium text-gray-600 mt-1">Manage your business relationships</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Import Companies
            </button>
            <button
              onClick={handleBulkEnrich}
              disabled={enriching}
              className="btn-primary flex items-center gap-2"
            >
              <SparklesIcon className="w-4 h-4" />
              {enriching ? 'Enriching...' : 'AI Enrich Data'}
            </button>
            <button
              onClick={handleAddCompany}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Company
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
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
                      className="btn-primary flex items-center gap-2"
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
                          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-semibold flex items-center justify-center text-sm">
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
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            Manual Research
                          </span>
                        ) : company.dataSource === 'apollo' ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            Apollo.io
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            Manual Entry
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
                            className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
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
                  className="btn-secondary"
                >
                  Previous
                </button>
                <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-md">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
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
    </div>
  );
}
