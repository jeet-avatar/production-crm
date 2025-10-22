import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, UserIcon, PhoneIcon, EnvelopeIcon, DocumentArrowUpIcon, ChevronDownIcon, ChevronRightIcon, BuildingOfficeIcon, SparklesIcon, QuestionMarkCircleIcon, XMarkIcon, LightBulbIcon } from '@heroicons/react/24/outline';
// Commented out unused imports
// import { SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { contactsApi, companiesApi } from '../../services/api';
import { ContactForm } from './ContactForm';
import { CSVImportModal } from '../../components/CSVImportModal';
import { LeadDiscoveryModal } from '../../components/LeadDiscoveryModal';
import { ContactsHelpGuide } from '../../components/ContactsHelpGuide';
import { useTheme } from '../../contexts/ThemeContext';
// Commented out modal imports - uncomment when needed
// import { ApolloImportModal } from '../../components/ApolloImportModal';
// import { RemoveDuplicatesModal } from '../../components/RemoveDuplicatesModal';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  company?: {
    id: string;
    name: string;
  };
  status: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'COLD' | 'WARM' | 'HOT' | 'CLOSED_WON' | 'CLOSED_LOST';
  tags: { id: string; name: string; color: string }[];
  createdAt: string;
}

interface GroupedContacts {
  [companyName: string]: Contact[];
}

interface Company {
  id: string;
  name: string;
}

const statusColors = {
  LEAD: 'apple-badge apple-badge-blue',
  PROSPECT: 'apple-badge apple-badge-purple',
  CUSTOMER: 'apple-badge apple-badge-green',
  COLD: 'apple-badge',
  WARM: 'apple-badge apple-badge-yellow',
  HOT: 'apple-badge apple-badge-red',
  CLOSED_WON: 'apple-badge apple-badge-green',
  CLOSED_LOST: 'apple-badge',
};

export function ContactList() {
  const navigate = useNavigate();
  const { gradients } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showAICSVImport, setShowAICSVImport] = useState(false);
  const [showLeadDiscovery, setShowLeadDiscovery] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [hasSeenHelpGuide, setHasSeenHelpGuide] = useState(
    localStorage.getItem('contactsHelpSeen') === 'true'
  );
  // Commented out modal state variables - uncomment when needed
  // const [showApolloImport, setShowApolloImport] = useState(false);
  // const [showRemoveDuplicates, setShowRemoveDuplicates] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactsPerPage, setContactsPerPage] = useState(10);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Check if we should open the add contact modal from query params
  useEffect(() => {
    const addContact = searchParams.get('addContact');
    const companyId = searchParams.get('companyId');
    const companyName = searchParams.get('companyName');

    if (addContact === 'true') {
      // If company info is provided, set it as editing contact with pre-selected company
      if (companyId && companyName) {
        setEditingContact({
          id: 'new',
          firstName: '',
          lastName: '',
          email: '',
          company: {
            id: companyId,
            name: companyName
          },
          status: 'LEAD',
          tags: [],
          createdAt: new Date().toISOString()
        } as Contact);
      } else {
        setEditingContact(null);
      }

      setShowModal(true);
      // Remove the query params after opening modal
      searchParams.delete('addContact');
      searchParams.delete('companyId');
      searchParams.delete('companyName');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      // Fetch ALL contacts for proper client-side grouping and pagination
      const response = await contactsApi.getAll({
        search: searchTerm,
        status: statusFilter || undefined,
        page: 1,
        limit: 1000, // Fetch all contacts for grouping
      });

      setContacts(response.contacts || []);
      setTotalContacts(response.total || 0);
    } catch (err) {
      setError('Failed to load contacts');
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await companiesApi.getAll();
      setCompanies(response.companies || []);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  useEffect(() => {
    loadContacts();
    loadCompanies();
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [searchTerm, statusFilter]);

  // Smart auto-expand: Auto-expand companies with 2-5 contacts for better UX
  // 1 contact: No expand button (single contact shows inline)
  // 2-5 contacts: Auto-expand (sweet spot - not too many, increases discoverability)
  // 6+ contacts: Keep collapsed (reduces visual clutter)
  useEffect(() => {
    if (contacts.length > 0) {
      const groupedContacts = contacts.reduce((acc, contact) => {
        const companyName = contact.company?.name || 'No Company';
        if (!acc[companyName]) {
          acc[companyName] = [];
        }
        acc[companyName].push(contact);
        return acc;
      }, {} as GroupedContacts);

      const companiesToExpand = new Set<string>();
      Object.entries(groupedContacts).forEach(([companyName, companyContacts]) => {
        // Auto-expand companies with 2-5 contacts for optimal UX
        if (companyContacts.length >= 2 && companyContacts.length <= 5) {
          companiesToExpand.add(companyName);
        }
      });

      setExpandedCompanies(companiesToExpand);
    }
  }, [contacts]);

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      await contactsApi.delete(id);
      loadContacts();
    } catch (err) {
      setError('Failed to delete contact');
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingContact(null);
    loadContacts();
  };

  const toggleCompany = (companyName: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyName)) {
      newExpanded.delete(companyName);
    } else {
      newExpanded.add(companyName);
    }
    setExpandedCompanies(newExpanded);
  };

  // Group contacts by company
  const groupedContacts: GroupedContacts = contacts.reduce((acc, contact) => {
    const companyName = contact.company?.name || 'No Company';
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(contact);
    return acc;
  }, {} as GroupedContacts);

  // Paginate by companies (groups), not individual contacts
  const companyEntries = Object.entries(groupedContacts);
  const totalCompanies = companyEntries.length;
  const totalPages = Math.ceil(totalCompanies / contactsPerPage);

  // Get companies for current page
  const startCompanyIndex = (currentPage - 1) * contactsPerPage;
  const endCompanyIndex = startCompanyIndex + contactsPerPage;
  const paginatedCompanies = companyEntries.slice(startCompanyIndex, endCompanyIndex);

  // Calculate indices for display
  const startIndex = startCompanyIndex + 1;
  const endIndex = Math.min(endCompanyIndex, totalCompanies);

  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Main Container with Border */}
      <div className="apple-container">
        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="apple-heading-1">Contacts</h1>
              <button
                type="button"
                onClick={() => setShowHelpGuide(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-all hover:border-gray-400"
                title="View help and quick start guide"
              >
                <QuestionMarkCircleIcon className="h-4 w-4" />
                <span>Help</span>
              </button>
            </div>
            <p className="apple-caption">Manage your customer relationships and grow your business</p>
          </div>

          {/* First-time user help banner */}
          {!hasSeenHelpGuide && (
            <div className="bg-gradient-to-r from-orange-50 via-rose-50 to-orange-50 border-4 border-orange-300 rounded-2xl p-6 mb-6 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-2xl p-4 border-2 border-black">
                  <LightBulbIcon className="w-8 h-8 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    👋 Welcome to Contacts!
                  </h3>
                  <p className="text-gray-700">
                    Learn how to add contacts, import CSV files, discover leads, and build your customer base
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowHelpGuide(true);
                    localStorage.setItem('contactsHelpSeen', 'true');
                    setHasSeenHelpGuide(true);
                  }}
                  className="bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold px-8 py-3 rounded-xl border-2 border-black hover:scale-105 transition-transform shadow-lg whitespace-nowrap"
                >
                  🚀 Show Me How
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('contactsHelpSeen', 'true');
                    setHasSeenHelpGuide(true);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Dismiss help banner"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Secondary actions - white buttons with colored icons */}
            <button
              onClick={() => setShowLeadDiscovery(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-all shadow-sm hover:shadow hover:border-gray-400"
            >
              <SparklesIcon className="h-5 w-5 text-blue-600" />
              <span>Discover Leads</span>
            </button>
            <button
              onClick={() => setShowAICSVImport(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-all shadow-sm hover:shadow hover:border-gray-400"
            >
              <DocumentArrowUpIcon className="h-5 w-5 text-green-600" />
              <span>Import CSV</span>
            </button>

            {/* Primary action - gradient button stands out */}
            <button
              onClick={handleAddContact}
              className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5`}
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="apple-input w-full pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="apple-input"
              title="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="LEAD">Lead</option>
              <option value="PROSPECT">Prospect</option>
              <option value="CUSTOMER">Customer</option>
              <option value="COLD">Cold</option>
              <option value="WARM">Warm</option>
              <option value="HOT">Hot</option>
              <option value="CLOSED_WON">Closed Won</option>
              <option value="CLOSED_LOST">Closed Lost</option>
            </select>
          </div>
        </div>
      </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 my-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg">
            {error}
          </div>
        )}

        {/* Contacts Table */}
        <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="apple-table">
            <thead>
              <tr>
                <th className="table-header">Contact</th>
                <th className="table-header">Role</th>
                <th className="table-header">Company</th>
                <th className="table-header">Status</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-16">
                    {searchTerm || statusFilter ? (
                      // No results found state (when filters are active)
                      <>
                        <MagnifyingGlassIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts found</h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Try adjusting your search or filters to find what you're looking for
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('');
                          }}
                          className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 mx-auto`}
                        >
                          <XMarkIcon className="h-5 w-5" />
                          Clear Filters
                        </button>
                      </>
                    ) : (
                      // No data uploaded state (when no filters are active)
                      <>
                        <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Uploaded</h3>
                        <p className="text-sm text-gray-600 mb-6">Get started by adding contacts or importing from CSV</p>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={handleAddContact}
                            className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5`}
                          >
                            <PlusIcon className="h-5 w-5" />
                            Add Contact
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAICSVImport(true)}
                            className={`bg-gradient-to-r ${gradients.semantic.success.gradient} text-black font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5`}
                          >
                            <DocumentArrowUpIcon className="h-5 w-5" />
                            Import CSV
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map(([companyName, companyContacts]) => {
                  const isExpanded = expandedCompanies.has(companyName);
                  const hasMultipleContacts = companyContacts.length > 1;
                  const displayContact = companyContacts[0];

                  return (
                    <React.Fragment key={companyName}>
                      {/* Company header row with first contact */}
                      <tr className="hover:bg-gray-50">
                        <td className="table-cell">
                          <div className="flex items-center space-x-3">
                            {hasMultipleContacts && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompany(companyName);
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                                )}
                              </button>
                            )}
                            <div
                              className="apple-avatar cursor-pointer"
                              onClick={() => navigate(`/contacts/${displayContact.id}`)}
                            >
                              {displayContact.firstName?.[0] || '?'}{displayContact.lastName?.[0] || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 cursor-pointer hover:text-orange-600" onClick={() => navigate(`/contacts/${displayContact.id}`)}>
                                {displayContact.firstName || 'No'} {displayContact.lastName || 'Name'}
                                {hasMultipleContacts && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    +{companyContacts.length - 1} more
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-500 text-sm flex items-center">
                                <EnvelopeIcon className="h-4 w-4 mr-1" />
                                {displayContact.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          {displayContact.role ? (
                            <span className="apple-badge apple-badge-purple">
                              {displayContact.role}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{companyName}</span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={statusColors[displayContact.status]}>
                            {displayContact.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="table-cell">
                          {displayContact.phone ? (
                            <div className="flex items-center text-gray-900">
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              {displayContact.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditContact(displayContact);
                              }}
                              className="apple-button-icon"
                              title="Edit contact"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContact(displayContact.id);
                              }}
                              className="apple-button-icon"
                              title="Delete contact"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded additional contacts */}
                      {isExpanded && hasMultipleContacts && companyContacts.slice(1).map((contact) => (
                        <tr
                          key={contact.id}
                          className="hover:bg-gray-50 bg-gray-50/50"
                        >
                          <td className="table-cell">
                            <div className="flex items-center space-x-3 pl-12">
                              <div
                                className="apple-avatar cursor-pointer"
                                onClick={() => navigate(`/contacts/${contact.id}`)}
                              >
                                {contact.firstName?.[0] || '?'}{contact.lastName?.[0] || '?'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 cursor-pointer hover:text-orange-600" onClick={() => navigate(`/contacts/${contact.id}`)}>
                                  {contact.firstName || 'No'} {contact.lastName || 'Name'}
                                </div>
                                <div className="text-gray-500 text-sm flex items-center">
                                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                                  {contact.email || 'No email'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            {contact.role ? (
                              <span className="apple-badge apple-badge-purple">
                                {contact.role}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="table-cell">
                            <span className="text-gray-400 text-sm">↳ Same company</span>
                          </td>
                          <td className="table-cell">
                            <span className={statusColors[contact.status]}>
                              {contact.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="table-cell">
                            {contact.phone ? (
                              <div className="flex items-center text-gray-900">
                                <PhoneIcon className="h-4 w-4 mr-1" />
                                {contact.phone}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditContact(contact);
                                }}
                                className="apple-button-icon"
                                title="Edit contact"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContact(contact.id);
                                }}
                                className="apple-button-icon"
                                title="Delete contact"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCompanies > 0 && (
          <div className="border-t-2 border-gray-200 px-6 py-5 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold text-gray-700">
                Showing {startIndex} to {endIndex} of {totalCompanies} companies ({totalContacts} contacts total)
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="contactsPerPage" className="text-sm text-gray-600">
                  Show:
                </label>
                <select
                  id="contactsPerPage"
                  value={contactsPerPage}
                  onChange={(e) => {
                    setContactsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
                <span className="text-sm text-gray-600">companies per page</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Previous
              </button>
              <span className="text-sm font-semibold text-gray-700 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Contact Form Modal */}
      {showModal && (
        <ContactForm
          contact={editingContact}
          companies={companies}
          onClose={handleModalClose}
        />
      )}

      {/* Commented out modal components - uncomment when needed */}
      {/* Apollo Import Modal */}
      {/* <ApolloImportModal
        isOpen={showApolloImport}
        onClose={() => setShowApolloImport(false)}
        onImportComplete={() => {
          setShowApolloImport(false);
          loadContacts();
        }}
      /> */}

      {/* AI CSV Import Modal */}
      <CSVImportModal
        isOpen={showAICSVImport}
        onClose={() => setShowAICSVImport(false)}
        onImportComplete={() => {
          setShowAICSVImport(false);
          loadContacts();
        }}
      />

      {/* Lead Discovery Modal */}
      {showLeadDiscovery && (
        <LeadDiscoveryModal
          mode="individual"
          onClose={() => setShowLeadDiscovery(false)}
          onImport={() => {
            loadContacts();
          }}
        />
      )}

      {/* Remove Duplicates Modal */}
      {/* <RemoveDuplicatesModal
        isOpen={showRemoveDuplicates}
        onClose={() => setShowRemoveDuplicates(false)}
        onComplete={() => {
          setShowRemoveDuplicates(false);
          loadContacts();
        }}
      /> */}

      {/* Help Guide */}
      {showHelpGuide && (
        <ContactsHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}

      {/* Floating Help Button - Always Visible */}
      <button
        type="button"
        onClick={() => setShowHelpGuide(true)}
        className="fixed bottom-8 right-8 z-40 group animate-in fade-in slide-in-from-bottom-4 duration-500"
        title="Need help? Click for the quick start guide"
        aria-label="Open help guide"
      >
        {/* Pulse ring for attention */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 animate-ping opacity-30"></div>

        {/* Main button */}
        <div className="relative bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 rounded-full p-4 shadow-2xl border-4 border-black hover:scale-110 hover:rotate-12 transition-all duration-300">
          <QuestionMarkCircleIcon className="w-8 h-8 text-black" />
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          <div className="bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-xl">
            Need Help? 👋
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-black"></div>
          </div>
        </div>
      </button>
    </div>
  );
}