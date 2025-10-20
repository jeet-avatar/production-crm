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
  VideoCameraIcon,
  SparklesIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { ActivitiesHelpGuide } from '../../components/ActivitiesHelpGuide';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  variables: string[];
  isActive: boolean;
}

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
    phone?: string;
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
  isCompleted?: boolean;
  taskStatus?: string;
  meetingLink?: string;
  meetingStartTime?: string;
  meetingEndTime?: string;
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
  const { gradients } = useTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'email' | 'call' | 'meeting' | 'task' | 'create'>('create');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    to: [''],
    cc: [''],
    bcc: [''],
    subject: '',
    htmlContent: '',
  });

  // Call form state
  const [callForm, setCallForm] = useState({
    phoneNumber: '',
    notes: '',
  });

  // Meeting form state
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    attendees: [''],
    location: 'Online',
  });

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
  });

  // Create activity form
  const [createForm, setCreateForm] = useState({
    type: 'EMAIL',
    subject: '',
    description: '',
  });

  const [isSending, setIsSending] = useState(false);

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

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/activities', {
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
      setIsSending(true);
      const token = localStorage.getItem('crmToken');
      if (!token) return;

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/activities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: createForm.type,
          subject: createForm.subject,
          description: createForm.description,
          priority: 'MEDIUM',
        }),
      });

      if (response.ok) {
        await fetchActivities();
        setShowModal(false);
        showNotification('success', 'Activity created successfully!');
        setCreateForm({ type: 'EMAIL', subject: '', description: '' });
      }
    } catch (err) {
      console.error('Error creating activity:', err);
      showNotification('error', 'Failed to create activity');
    } finally {
      setIsSending(false);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const token = localStorage.getItem('crmToken');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmailTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching email templates:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (!templateId) return;

    const template = emailTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Replace variables with contact data if available
    let subject = template.subject;
    let htmlContent = template.htmlContent;

    if (selectedActivity?.contact) {
      const contact = selectedActivity.contact;
      const replacements: Record<string, string> = {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        companyName: '', // Could be enhanced with company data
        position: '', // Could be enhanced with position data
      };

      Object.entries(replacements).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        subject = subject.replace(regex, value);
        htmlContent = htmlContent.replace(regex, value);
      });
    }

    setEmailForm(prev => ({
      ...prev,
      subject,
      htmlContent,
    }));
  };

  const handleOpenModal = (type: 'email' | 'call' | 'meeting' | 'task', activity: Activity) => {
    setModalType(type);
    setSelectedActivity(activity);

    if (type === 'email') {
      setEmailForm({
        to: activity.contact?.email ? [activity.contact.email] : [''],
        cc: [''],
        bcc: [''],
        subject: activity.subject || 'Follow-up',
        htmlContent: activity.description || '',
      });
      setSelectedTemplateId('');
      fetchEmailTemplates(); // Fetch templates when opening email modal
    } else if (type === 'call') {
      setCallForm({
        phoneNumber: activity.contact?.phone || '',
        notes: activity.description || '',
      });
    } else if (type === 'meeting') {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      setMeetingForm({
        title: activity.subject || 'Meeting',
        description: activity.description || '',
        startTime: now.toISOString().slice(0, 16),
        endTime: oneHourLater.toISOString().slice(0, 16),
        attendees: activity.contact?.email ? [activity.contact.email] : [''],
        location: 'Online',
      });
    }

    setShowModal(true);
  };

  const handleSendEmail = async () => {
    if (!selectedActivity) return;

    try {
      setIsSending(true);
      const token = localStorage.getItem('crmToken');
      if (!token) {
        showNotification('error', 'Not authenticated');
        return;
      }

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

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/activities/${selectedActivity.id}/send-email`, {
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
          textContent: emailForm.htmlContent.replace(/<[^>]*>/g, ''),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }

      showNotification('success', 'Email sent successfully!');
      setShowModal(false);
      await fetchActivities();
    } catch (err: any) {
      console.error('Error sending email:', err);
      showNotification('error', `Failed to send email: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleMakeFakeCall = async () => {
    if (!selectedActivity) return;

    try {
      setIsSending(true);
      showNotification('success', `Simulated call to ${callForm.phoneNumber}. In production, this would use Twilio!`);
      setShowModal(false);
    } catch (err: any) {
      showNotification('error', `Failed to make call: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!selectedActivity) return;

    try {
      setIsSending(true);
      const token = localStorage.getItem('crmToken');
      if (!token) {
        showNotification('error', 'Not authenticated');
        return;
      }

      const attendees = meetingForm.attendees.filter(email => email.trim() !== '');
      if (attendees.length === 0) {
        showNotification('error', 'Please add at least one attendee');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/activities/${selectedActivity.id}/create-meeting`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: meetingForm.title,
          description: meetingForm.description,
          startTime: new Date(meetingForm.startTime).toISOString(),
          endTime: new Date(meetingForm.endTime).toISOString(),
          attendees: attendees,
          location: meetingForm.location,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create meeting');
      }

      const result = await response.json();
      showNotification('success', `Meeting created! Link: ${result.activity.meetingLink}`);
      setShowModal(false);
      await fetchActivities();
    } catch (err: any) {
      console.error('Error creating meeting:', err);
      showNotification('error', `Failed to create meeting: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCompleteTask = async (activityId: string) => {
    try {
      const token = localStorage.getItem('crmToken');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/activities/${activityId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showNotification('success', 'Task marked as complete!');
        await fetchActivities();
      }
    } catch (err) {
      console.error('Error completing task:', err);
      showNotification('error', 'Failed to complete task');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const addField = (field: 'to' | 'cc' | 'bcc' | 'attendees') => {
    if (field === 'attendees') {
      setMeetingForm(prev => ({ ...prev, attendees: [...prev.attendees, ''] }));
    } else {
      setEmailForm(prev => ({ ...prev, [field]: [...prev[field], ''] }));
    }
  };

  const updateField = (field: 'to' | 'cc' | 'bcc' | 'attendees', index: number, value: string) => {
    if (field === 'attendees') {
      setMeetingForm(prev => ({
        ...prev,
        attendees: prev.attendees.map((email, i) => i === index ? value : email),
      }));
    } else {
      setEmailForm(prev => ({
        ...prev,
        [field]: prev[field].map((email, i) => i === index ? value : email),
      }));
    }
  };

  const removeField = (field: 'to' | 'cc' | 'bcc' | 'attendees', index: number) => {
    if (field === 'attendees') {
      setMeetingForm(prev => ({ ...prev, attendees: prev.attendees.filter((_, i) => i !== index) }));
    } else {
      setEmailForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    }
  };

  const filteredActivities = filterType === 'all'
    ? activities
    : activities.filter(a => a.type.toUpperCase() === filterType.toUpperCase());

  const getActivityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EMAIL': return EnvelopeIcon;
      case 'CALL': case 'SMS': return PhoneIcon;
      case 'MEETING': return CalendarIcon;
      case 'NOTE': return DocumentTextIcon;
      case 'TASK': return ClipboardDocumentCheckIcon;
      default: return DocumentTextIcon;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EMAIL': return 'bg-orange-50 text-orange-700';
      case 'CALL': case 'SMS': return 'bg-green-50 text-green-700';
      case 'MEETING': return 'bg-rose-50 text-rose-700';
      case 'NOTE': return 'bg-amber-50 text-amber-700';
      case 'TASK': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Activities</h1>
          <button
            type="button"
            onClick={() => setShowHelpGuide(true)}
            className="p-2 rounded-lg bg-gradient-to-r from-orange-600 to-rose-600 text-black hover:from-orange-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg"
            title="Show Help Guide"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-600 mt-1">Track emails, calls, meetings, and tasks across your CRM • Click ? for help</p>
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
                className={`inline-flex items-center px-4 py-2.5 rounded-xl font-bold text-sm transition-all tracking-wide shadow-sm ${
                  filterType === type.value
                    ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black shadow-lg hover:shadow-xl hover:scale-105`
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {type.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { setModalType('create'); setShowModal(true); }}
          className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-bold px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 tracking-wide`}
        >
          <PlusIcon className="h-5 w-5" />
          Create Activity
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
                onClick={() => { setModalType('create'); setShowModal(true); }}
                className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black font-bold px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 tracking-wide inline-flex`}
              >
                <PlusIcon className="h-5 w-5" />
                Create Activity
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const isEmail = activity.type.toUpperCase() === 'EMAIL';
                const isCall = activity.type.toUpperCase() === 'CALL' || activity.type.toUpperCase() === 'SMS';
                const isMeeting = activity.type.toUpperCase() === 'MEETING';
                const isTask = activity.type.toUpperCase() === 'TASK';

                return (
                  <div key={activity.id} className="relative">
                    {index !== filteredActivities.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                    )}

                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center z-10`}>
                        <Icon className="h-6 w-6" />
                      </div>

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

                            {/* Status Badges */}
                            <div className="mt-2 flex items-center gap-2">
                              {activity.emailStatus && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  activity.emailStatus === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {activity.emailStatus === 'sent' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                                  {activity.emailStatus}
                                </span>
                              )}
                              {activity.isCompleted && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                                  Completed
                                </span>
                              )}
                              {activity.meetingLink && (
                                <a
                                  href={activity.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-orange-800 hover:bg-orange-100 shadow-sm tracking-wide"
                                >
                                  <VideoCameraIcon className="h-4 w-4 mr-1.5" />
                                  Join Meeting
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {isEmail && !activity.emailStatus && (
                              <button
                                onClick={() => handleOpenModal('email', activity)}
                                className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide`}
                              >
                                <PaperAirplaneIcon className="h-4 w-4 mr-1.5" />
                                Send
                              </button>
                            )}
                            {isCall && (
                              <button
                                onClick={() => handleOpenModal('call', activity)}
                                className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${gradients.semantic.success.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide`}
                              >
                                <PhoneIcon className="h-4 w-4 mr-1.5" />
                                Call
                              </button>
                            )}
                            {isMeeting && !activity.meetingLink && (
                              <button
                                onClick={() => handleOpenModal('meeting', activity)}
                                className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${gradients.semantic.premium.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide`}
                              >
                                <CalendarIcon className="h-4 w-4 mr-1.5" />
                                Schedule
                              </button>
                            )}
                            {isTask && !activity.isCompleted && (
                              <button
                                onClick={() => handleCompleteTask(activity.id)}
                                className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${gradients.semantic.success.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide`}
                              >
                                <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                                Complete
                              </button>
                            )}
                          </div>
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

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {modalType === 'create' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Create Activity</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
                    <select
                      value={createForm.type}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="EMAIL">Email</option>
                      <option value="CALL">Call</option>
                      <option value="MEETING">Meeting</option>
                      <option value="TASK">Task</option>
                      <option value="NOTE">Note</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={createForm.subject}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Activity subject"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={4}
                      placeholder="Activity description"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-bold tracking-wide shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateActivity}
                    disabled={isSending}
                    className={`px-6 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide disabled:opacity-50`}
                  >
                    {isSending ? 'Creating...' : 'Create Activity'}
                  </button>
                </div>
              </>
            )}

            {modalType === 'email' && selectedActivity && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Send Email</h2>
                  <p className="text-sm text-gray-500 mt-1">Activity: {selectedActivity.subject}</p>
                </div>
                <div className="p-6 space-y-4">
                  {/* Email Template Selector */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <SparklesIcon className="h-5 w-5 text-orange-600" />
                      <label className="block text-sm font-bold text-orange-900">
                        Use Email Template (Optional)
                      </label>
                    </div>
                    {isLoadingTemplates ? (
                      <p className="text-sm text-orange-700">Loading templates...</p>
                    ) : emailTemplates.length === 0 ? (
                      <p className="text-sm text-orange-700">
                        No templates available. Create templates in the{' '}
                        <a href="/email-templates" className="underline font-bold">Email Templates</a> page.
                      </p>
                    ) : (
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        aria-label="Select email template"
                      >
                        <option value="">-- Select a template --</option>
                        {emailTemplates.filter(t => t.isActive).map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedTemplateId && (
                      <p className="text-xs text-orange-700 mt-2">
                        ✓ Template loaded. Variables have been replaced with contact data.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To *</label>
                    {emailForm.to.map((email, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateField('to', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="recipient@example.com"
                        />
                        {emailForm.to.length > 1 && (
                          <button
                            onClick={() => removeField('to', index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addField('to')}
                      className="text-sm text-orange-600 hover:text-orange-700 font-bold"
                    >
                      + Add recipient
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                    <input
                      type="text"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                    <textarea
                      value={emailForm.htmlContent}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, htmlContent: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={10}
                      placeholder="Enter your email message..."
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-bold tracking-wide shadow-sm"
                    disabled={isSending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={isSending}
                    className={`inline-flex items-center px-6 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide disabled:opacity-50`}
                  >
                    {isSending ? 'Sending...' : (
                      <>
                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {modalType === 'call' && selectedActivity && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Make Call</h2>
                  <p className="text-sm text-gray-500 mt-1">Activity: {selectedActivity.subject}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-sm text-orange-800 font-medium">
                      Note: SMS/Call functionality requires a Twilio phone number. This is a simulation for now.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={callForm.phoneNumber}
                      onChange={(e) => setCallForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="+1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Call Notes</label>
                    <textarea
                      value={callForm.notes}
                      onChange={(e) => setCallForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={6}
                      placeholder="Notes about the call..."
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-bold tracking-wide shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMakeFakeCall}
                    disabled={isSending}
                    className={`inline-flex items-center px-6 py-2.5 bg-gradient-to-r ${gradients.semantic.success.gradient} text-white rounded-xl hover:shadow-lg disabled:opacity-50 font-bold tracking-wide shadow-md`}
                  >
                    {isSending ? 'Calling...' : (
                      <>
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        Simulate Call
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {modalType === 'meeting' && selectedActivity && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Schedule Meeting</h2>
                  <p className="text-sm text-gray-500 mt-1">Activity: {selectedActivity.subject}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-sm text-orange-800 font-medium">
                      Note: Google Calendar integration requires OAuth setup. Meeting link is a placeholder.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Title *</label>
                    <input
                      type="text"
                      value={meetingForm.title}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Meeting title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                      <input
                        type="datetime-local"
                        value={meetingForm.startTime}
                        onChange={(e) => setMeetingForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                      <input
                        type="datetime-local"
                        value={meetingForm.endTime}
                        onChange={(e) => setMeetingForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attendees *</label>
                    {meetingForm.attendees.map((email, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateField('attendees', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="attendee@example.com"
                        />
                        {meetingForm.attendees.length > 1 && (
                          <button
                            onClick={() => removeField('attendees', index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addField('attendees')}
                      className="text-sm text-orange-600 hover:text-orange-700 font-bold"
                    >
                      + Add attendee
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={meetingForm.description}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={4}
                      placeholder="Meeting description..."
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-bold tracking-wide shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateMeeting}
                    disabled={isSending}
                    className={`inline-flex items-center px-6 py-2.5 bg-gradient-to-r ${gradients.semantic.premium.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide disabled:opacity-50`}
                  >
                    {isSending ? 'Creating...' : (
                      <>
                        <VideoCameraIcon className="h-4 w-4 mr-2" />
                        Create Meeting
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Help Guide */}
      {showHelpGuide && (
        <ActivitiesHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}
    </div>
  );
}
