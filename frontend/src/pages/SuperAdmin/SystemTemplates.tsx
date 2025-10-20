import { useState, useEffect } from 'react';
import {
  EnvelopeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  DocumentDuplicateIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { CreateSystemTemplateModal } from './CreateSystemTemplateModal';

interface SystemTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  variables: string[];
  fromEmail: string;
  fromName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateType {
  key: string;
  value: string;
  label: string;
}

export function SystemTemplates() {
  const { gradients } = useTheme();
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [templateTypes, setTemplateTypes] = useState<TemplateType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SystemTemplate | null>(null);
  const [testingTemplate, setTestingTemplate] = useState<SystemTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchTemplateTypes();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const url = filterType && filterType !== 'all'
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates?type=${filterType}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied - Super admin only');
        }
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplateTypes = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates/types`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplateTypes(data.types || []);
      }
    } catch (err) {
      console.error('Error fetching template types:', err);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this system template?')) {
      return;
    }

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      fetchTemplates();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      alert(err.message || 'Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate template');
      }

      fetchTemplates();
    } catch (err: any) {
      console.error('Error duplicating template:', err);
      alert(err.message || 'Failed to duplicate template');
    }
  };

  const handleToggleActive = async (template: SystemTemplate) => {
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !template.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      fetchTemplates();
    } catch (err: any) {
      console.error('Error updating template:', err);
      alert(err.message || 'Failed to update template');
    }
  };

  const handleSendTest = async () => {
    if (!testingTemplate || !testEmail) {
      alert('Please enter a test email address');
      return;
    }

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates/${testingTemplate.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testEmail,
          variables: {}, // Can add sample variables here
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      alert('Test email sent successfully!');
      setTestingTemplate(null);
      setTestEmail('');
    } catch (err: any) {
      console.error('Error sending test email:', err);
      alert(err.message || 'Failed to send test email');
    }
  };

  if (error === 'Access denied - Super admin only') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Access Restricted
            </h1>
            <p className="text-gray-600 mb-6">
              This page is restricted to super administrators only.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-orange-600 to-rose-600 text-black px-6 py-2 rounded-lg hover:opacity-90"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <EnvelopeIcon className="h-8 w-8 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black">System Email Templates</h1>
                <p className="text-black/80 mt-1">
                  Manage system-wide email templates for automated messages
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-50 shadow-lg transition-all duration-200 font-semibold"
            >
              <PlusIcon className="h-5 w-5" />
              Create Template
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filter by Type */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  // Refetch when filter changes
                  setTimeout(fetchTemplates, 0);
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {templateTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600"></div>
            <p className="text-gray-600 mt-4">Loading templates...</p>
          </div>
        )}

        {/* Error State */}
        {error && error !== 'Access denied - Super admin only' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-semibold">{error}</p>
            <button
              onClick={fetchTemplates}
              className="mt-4 text-red-600 hover:text-red-700 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Templates List */}
        {!isLoading && !error && filteredTemplates.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <EnvelopeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first system template to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-orange-600 to-rose-600 text-black px-6 py-3 rounded-lg hover:opacity-90 font-semibold"
              >
                Create Template
              </button>
            )}
          </div>
        )}

        {/* Templates Grid */}
        {!isLoading && !error && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {template.name}
                        </h3>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {template.type}
                        </span>
                        <button
                          onClick={() => handleToggleActive(template)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            template.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {template.isActive ? (
                            <>
                              <CheckCircleIcon className="h-4 w-4" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-4 w-4" />
                              Inactive
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-gray-600 font-medium mb-2">
                        Subject: {template.subject}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>From: {template.fromName || 'BrandMonkz'} &lt;{template.fromEmail}&gt;</span>
                        {template.variables && template.variables.length > 0 && (
                          <span>Variables: {template.variables.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTestingTemplate(template);
                          setTestEmail('');
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Send Test Email"
                      >
                        <PaperAirplaneIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowCreateModal(true);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {template.htmlContent.replace(/<[^>]*>/g, '').substring(0, 200)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateSystemTemplateModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
            fetchTemplates();
          }}
          editingTemplate={editingTemplate}
          templateTypes={templateTypes}
        />
      )}

      {/* Test Email Modal */}
      {testingTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Send Test Email
            </h3>
            <p className="text-gray-600 mb-4">
              Template: <span className="font-semibold">{testingTemplate.name}</span>
            </p>
            <input
              type="email"
              placeholder="Enter test email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSendTest}
                disabled={!testEmail}
                className="flex-1 bg-gradient-to-r from-orange-600 to-rose-600 text-black px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Send Test
              </button>
              <button
                onClick={() => {
                  setTestingTemplate(null);
                  setTestEmail('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
