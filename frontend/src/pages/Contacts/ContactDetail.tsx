import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  UserIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { contactsApi, activitiesApi } from '../../services/api';
import { ContactForm } from './ContactForm';
import { AssignmentDropdown } from '../../components/AssignmentDropdown';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: {
    id: string;
    name: string;
    domain?: string;
    industry?: string;
  };
  status: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'COLD' | 'WARM' | 'HOT' | 'CLOSED_WON' | 'CLOSED_LOST';
  tags: { id: string; name: string; color: string }[];
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
  subject: string;
  description?: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

const statusColors: Record<string, string> = {
  LEAD: 'apple-badge apple-badge-blue',
  PROSPECT: 'apple-badge apple-badge-yellow',
  CUSTOMER: 'apple-badge apple-badge-green',
  COLD: 'apple-badge apple-badge-gray',
  WARM: 'apple-badge apple-badge-orange',
  HOT: 'apple-badge apple-badge-red',
  CLOSED_WON: 'apple-badge apple-badge-green',
  CLOSED_LOST: 'apple-badge apple-badge-gray',
};

const activityIcons = {
  CALL: PhoneIcon,
  EMAIL: EnvelopeIcon,
  MEETING: UserIcon,
  NOTE: DocumentTextIcon,
};

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (id) {
      loadContact();
      loadActivities();
    }
  }, [id]);

  const loadContact = async () => {
    try {
      setLoading(true);
      const response = await contactsApi.getById(id!);
      setContact(response.contact);
    } catch (err) {
      setError('Failed to load contact');
      console.error('Error loading contact:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await activitiesApi.getByContact(id!);
      setActivities(response.activities || []);
    } catch (err) {
      console.error('Error loading activities:', err);
    }
  };

  const handleDelete = async () => {
    if (!contact || !confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      await contactsApi.delete(contact.id);
      navigate('/contacts');
    } catch (err) {
      setError('Failed to delete contact');
    }
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    loadContact();
  };

  const handleEnrich = async () => {
    if (!contact) return;

    try {
      setEnriching(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/enrichment/contacts/${contact.id}/enrich`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crmToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enrich contact');
      }

      const enrichmentResult = await response.json();

      // Reload contact data
      await loadContact();
      setEnriching(false);

      // Show success message
      alert(`✅ Contact enriched successfully! Profile updated with LinkedIn data.`);
    } catch (err: any) {
      console.error('Error enriching contact:', err);
      setError(err.message || 'Failed to enrich contact');
      setEnriching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !contact) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="apple-heading-2 mb-4">Contact Not Found</h1>
          <p className="apple-caption mb-4">{error}</p>
          <button
            onClick={() => navigate('/contacts')}
            className="apple-button-primary"
          >
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  if (!contact) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/contacts')}
            className="apple-button-icon"
            title="Back to contacts"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-4">
            <div className="apple-avatar" style={{ width: '64px', height: '64px', fontSize: '20px' }}>
              {contact.firstName[0]}{contact.lastName[0]}
            </div>
            <div>
              <h1 className="apple-heading-1">
                {contact.firstName} {contact.lastName}
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center text-sm font-medium text-gray-700">
                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                  {contact.email}
                </div>
                {contact.phone && (
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {contact.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SparklesIcon className="h-4 w-4" />
            <span>{enriching ? 'Enriching...' : 'AI Enrich'}</span>
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="apple-button-primary flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleDelete}
            className="apple-button-secondary flex items-center gap-2 text-red-600 hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { id: 'overview', name: 'Overview', icon: UserIcon, gradient: 'from-blue-500 to-blue-600' },
            { id: 'activities', name: 'Activities', icon: ClockIcon, gradient: 'from-purple-500 to-purple-600' },
            { id: 'deals', name: 'Deals', icon: CurrencyDollarIcon, gradient: 'from-green-500 to-green-600' },
            { id: 'notes', name: 'Notes', icon: ChatBubbleLeftIcon, gradient: 'from-orange-500 to-orange-600' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative overflow-hidden rounded-xl p-4 transition-all duration-200 transform ${
                  isActive
                    ? `bg-gradient-to-br ${tab.gradient} text-white shadow-lg scale-105`
                    : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <div className={`${isActive ? 'bg-white bg-opacity-20' : 'bg-gray-100'} rounded-lg p-2`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className="font-semibold text-sm">{tab.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="apple-card">
                <h3 className="apple-heading-3 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <p className="mt-1 text-sm text-gray-900">{contact.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <p className="mt-1 text-sm text-gray-900">{contact.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{contact.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{contact.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex mt-1 ${statusColors[contact.status]}`}>
                      {contact.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(contact.createdAt)}</p>
                  </div>
                </div>
                
                {contact.tags.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {contact.company && (
                <div className="apple-card">
                  <h3 className="apple-heading-3 mb-4">Company Information</h3>
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{contact.company.name}</p>
                      {contact.company.domain && (
                        <p className="text-sm text-gray-600">{contact.company.domain}</p>
                      )}
                      {contact.company.industry && (
                        <p className="text-sm text-gray-600">{contact.company.industry}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Team Assignment */}
              <AssignmentDropdown
                resourceType="contact"
                resourceId={contact.id}
                currentAssignedToId={contact.assignedToId || null}
                currentAssignedTo={contact.assignedTo}
                onAssignmentChange={loadContact}
              />
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="apple-card">
              <h3 className="apple-heading-3 mb-4">Recent Activities</h3>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = activityIcons[activity.type];
                    return (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{activity.subject}</p>
                          {activity.description && (
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDateTime(activity.createdAt)} • {activity.user.firstName} {activity.user.lastName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No activities recorded yet.</p>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'deals' || activeTab === 'notes') && (
            <div className="apple-card">
              <div className="text-center py-8">
                <p className="text-gray-500">{activeTab === 'deals' ? 'Deals' : 'Notes'} feature coming soon.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="apple-card">
            <h3 className="apple-heading-3 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="apple-button-primary w-full flex items-center justify-center gap-2">
                <EnvelopeIcon className="h-4 w-4" />
                Send Email
              </button>
              <button className="apple-button-secondary w-full flex items-center justify-center gap-2">
                <PhoneIcon className="h-4 w-4" />
                Make Call
              </button>
              <button className="apple-button-secondary w-full flex items-center justify-center gap-2">
                <DocumentTextIcon className="h-4 w-4" />
                Add Note
              </button>
            </div>
          </div>

          <div className="apple-card">
            <h3 className="apple-heading-3 mb-4">Contact Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <p className="text-gray-600">{formatDate(contact.createdAt)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <p className="text-gray-600">{formatDate(contact.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ContactForm
          contact={contact}
          companies={[]} // Will be loaded in the form
          onClose={handleEditClose}
        />
      )}
    </div>
  );
}