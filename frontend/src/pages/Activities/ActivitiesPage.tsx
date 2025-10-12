import { useState, useEffect } from 'react';
import {
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  type: string;
  subject?: string;
  title?: string;
  description?: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  deal?: {
    id: string;
    title: string;
  };
  user?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  status?: string;
}

const activityTypes = [
  { value: 'all', label: 'All Activities', icon: ClipboardDocumentCheckIcon },
  { value: 'email', label: 'Email', icon: EnvelopeIcon },
  { value: 'call', label: 'Call', icon: PhoneIcon },
  { value: 'meeting', label: 'Meeting', icon: CalendarIcon },
  { value: 'note', label: 'Note', icon: DocumentTextIcon },
  { value: 'task', label: 'Task', icon: ClipboardDocumentCheckIcon },
];

export function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3000/api/activities', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActivities = filterType === 'all'
    ? activities
    : activities.filter(a => a.type === filterType);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email': return EnvelopeIcon;
      case 'call': return PhoneIcon;
      case 'meeting': return CalendarIcon;
      case 'note': return DocumentTextIcon;
      case 'task': return ClipboardDocumentCheckIcon;
      default: return DocumentTextIcon;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-700';
      case 'call': return 'bg-green-100 text-green-700';
      case 'meeting': return 'bg-purple-100 text-purple-700';
      case 'note': return 'bg-yellow-100 text-yellow-700';
      case 'task': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const badges = {
      completed: 'badge-success',
      pending: 'badge-warning',
      cancelled: 'badge-error',
    };

    return (
      <span className={`badge ${badges[status as keyof typeof badges]}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Activities</h1>
        <p className="text-gray-600">Track all interactions and tasks across contacts, companies, and deals</p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {activityTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setFilterType(type.value)}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterType === type.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {type.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-secondary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add Activity
        </button>
      </div>

      {/* Activities Timeline */}
      <div className="card">
        <div className="p-6">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
              <p className="text-gray-600 mb-4">
                {filterType === 'all' ? 'Start adding activities to track your work' : `No ${filterType} activities found`}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Activity
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="relative">
                    {/* Timeline line */}
                    {index !== filteredActivities.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                    )}

                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center z-10`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{activity.subject || activity.title || 'No subject'}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-500">
                                {activity.contact ? `${activity.contact.firstName} ${activity.contact.lastName}` :
                                 activity.deal ? activity.deal.title :
                                 'No relation'}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-500 capitalize">
                                {activity.contact ? 'contact' : activity.deal ? 'deal' : 'none'}
                              </span>
                            </div>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>

                        <p className="text-gray-600 text-sm mb-3">{activity.description || 'No description'}</p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatDate(activity.createdAt)}</span>
                          <span>•</span>
                          <span>
                            {activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Add Activity</h2>
            </div>
            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select className="input">
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="note">Note</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input type="text" className="input" placeholder="Enter activity title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea className="input" rows={4} placeholder="Enter activity details"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Related To</label>
                  <select className="input">
                    <option value="">Select contact, company, or deal</option>
                    <option value="contact-1">John Doe (Contact)</option>
                    <option value="company-1">Acme Corp (Company)</option>
                    <option value="deal-1">Q1 Enterprise Deal (Deal)</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn-primary">
                Add Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
