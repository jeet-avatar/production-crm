import { useState, useEffect } from 'react';
import {
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
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
  emailStatus?: string;
  emailSentAt?: string;
}

const activityTypes = [
  { value: 'all', label: 'All Activities', icon: ClipboardDocumentCheckIcon },
  { value: 'EMAIL', label: 'Email', icon: EnvelopeIcon },
  { value: 'CALL', label: 'Call', icon: PhoneIcon },
  { value: 'MEETING', label: 'Meeting', icon: CalendarIcon },
  { value: 'NOTE', label: 'Note', icon: DocumentTextIcon },
  { value: 'TASK', label: 'Task', icon: ClipboardDocumentCheckIcon },
];

export function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    to: [''],
    cc: [''],
    bcc: [''],
    subject: '',
    htmlContent: '',
  });

  const [isSendingEmail, setIsSendingEmail] = useState(false);

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

  const handleCreateActivity = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      if (!token) return;

      const response = await fetch('http://localhost:3000/api/activities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'EMAIL',
          subject: 'New Email Activity',
          description: 'Ready to send email',
          priority: 'MEDIUM',
        }),
      });

      if (response.ok) {
        await fetchActivities();
        setShowAddModal(false);
        showNotification('success', 'Activity created successfully!');
      }
    } catch (err) {
      console.error('Error creating activity:', err);
      showNotification('error', 'Failed to create activity');
    }
  };

  const handleOpenEmailModal = (activity: Activity) => {
    setSelectedActivity(activity);
    setEmailForm({
      to: activity.contact?.email ? [activity.contact.email] : [''],
      cc: [''],
      bcc: [''],
      subject: activity.subject || 'Follow-up',
      htmlContent: activity.description || '',
    });
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!selectedActivity) return;

    try {
      setIsSendingEmail(true);
      const token = localStorage.getItem('crmToken');
      if (!token) {
        showNotification('error', 'Not authenticated');
        return;
      }

      // Filter out empty email addresses
      const toEmails = emailForm.to.filter(email => email.trim() !== '');
      const ccEmails = emailForm.cc.filter(email => email.trim() !== '');
      const bccEmails = emailForm.bcc.filter(email => email.trim() !== '');

      if (toEmails.length === 0) {
        showNotification('error', 'Please enter at least one recipient email');
        return;
      }

      if (!emailForm.subject.trim()) {
        showNotification('error', 'Please enter email subject');
        return;
      }

      if (!emailForm.htmlContent.trim()) {
        showNotification('error', 'Please enter email content');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/activities/${selectedActivity.id}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toEmails,
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          bcc: bccEmails.length > 0 ? bccEmails : undefined,
          subject: emailForm.subject,
          htmlContent: emailForm.htmlContent,
          textContent: emailForm.htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);

      showNotification('success', '✅ Email sent successfully!');
      setShowEmailModal(false);
      await fetchActivities(); // Refresh activities to show updated status
    } catch (err: any) {
      console.error('Error sending email:', err);
      showNotification('error', `Failed to send email: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const addEmailField = (field: 'to' | 'cc' | 'bcc') => {
    setEmailForm(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const updateEmailField = (field: 'to' | 'cc' | 'bcc', index: number, value: string) => {
    setEmailForm(prev => ({
      ...prev,
      [field]: prev[field].map((email, i) => i === index ? value : email),
    }));
  };

  const removeEmailField = (field: 'to' | 'cc' | 'bcc', index: number) => {
    setEmailForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const filteredActivities = filterType === 'all'
    ? activities
    : activities.filter(a => a.type.toUpperCase() === filterType.toUpperCase());

  const getActivityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EMAIL': return EnvelopeIcon;
      case 'CALL': return PhoneIcon;
      case 'MEETING': return CalendarIcon;
      case 'NOTE': return DocumentTextIcon;
      case 'TASK': return ClipboardDocumentCheckIcon;
      default: return DocumentTextIcon;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EMAIL': return 'bg-blue-100 text-blue-700';
      case 'CALL': return 'bg-green-100 text-green-700';
      case 'MEETING': return 'bg-purple-100 text-purple-700';
      case 'NOTE': return 'bg-yellow-100 text-yellow-700';
      case 'TASK': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-600" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

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
          onClick={handleCreateActivity}
          className="btn-secondary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Create Email Activity
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
                onClick={handleCreateActivity}
                className="btn-secondary flex items-center gap-2 inline-flex"
              >
                <PlusIcon className="h-4 w-4" />
                Create Activity
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const isEmail = activity.type.toUpperCase() === 'EMAIL';

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
                      <div className="flex-1 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{activity.subject || activity.title || 'No subject'}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-500">
                                {activity.contact ? `${activity.contact.firstName} ${activity.contact.lastName}` :
                                 activity.deal ? activity.deal.title :
                                 'No relation'}
                              </span>
                              {activity.contact?.email && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-sm text-gray-500">{activity.contact.email}</span>
                                </>
                              )}
                            </div>
                            {activity.emailStatus && (
                              <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  activity.emailStatus === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {activity.emailStatus === 'sent' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                                  {activity.emailStatus}
                                </span>
                                {activity.emailSentAt && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    Sent {formatDate(activity.emailSentAt)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Button for Email */}
                          {isEmail && !activity.emailStatus && (
                            <button
                              onClick={() => handleOpenEmailModal(activity)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                            >
                              <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                              Send Email
                            </button>
                          )}
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

      {/* Send Email Modal */}
      {showEmailModal && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Send Email</h2>
              <p className="text-sm text-gray-500 mt-1">Activity: {selectedActivity.subject}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* To Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To *</label>
                {emailForm.to.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmailField('to', index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="recipient@example.com"
                      required
                    />
                    {emailForm.to.length > 1 && (
                      <button
                        onClick={() => removeEmailField('to', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addEmailField('to')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add recipient
                </button>
              </div>

              {/* CC Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CC (Optional)</label>
                {emailForm.cc.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmailField('cc', index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="cc@example.com"
                    />
                    <button
                      onClick={() => removeEmailField('cc', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addEmailField('cc')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add CC
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email subject"
                  required
                />
              </div>

              {/* Email Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                <textarea
                  value={emailForm.htmlContent}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, htmlContent: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={10}
                  placeholder="Enter your email message..."
                  required
                />
                <p className="mt-1 text-xs text-gray-500">You can use HTML tags for formatting</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSendingEmail}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingEmail ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
