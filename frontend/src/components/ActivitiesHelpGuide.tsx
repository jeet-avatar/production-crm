import { useState } from 'react';
import {
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  PlusIcon,
  FunnelIcon,
  BellAlertIcon,
  ClockIcon,
  UserGroupIcon,
  PaperClipIcon,
  LightBulbIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function ActivitiesHelpGuide({ onClose }: HelpGuideProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      title: 'Log Your First Activity',
      icon: PlusIcon,
      description: 'Click "Log Activity" to record emails, calls, meetings, notes, or tasks.',
      details: [
        'Choose activity type: Email, Call, Meeting, Note, or Task',
        'Link to contact or deal (recommended)',
        'Add subject and description',
        'For emails: Track sent/received, add attachments',
        'For calls: Record duration, outcome, next steps',
        'For meetings: Set date, time, and meeting link',
        'For tasks: Set due date and priority',
        'Click "Save" to log activity',
      ],
      buttonLabel: 'Log Activity',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      title: 'Send Emails from CRM',
      icon: EnvelopeIcon,
      description: 'Send tracked emails directly from the CRM with templates and scheduling.',
      details: [
        'Click "Log Activity" → Select "Email"',
        'Choose email template or write custom',
        'Add recipient (To, CC, BCC)',
        'Personalize with contact variables',
        'Add attachments if needed',
        'Preview before sending',
        'Email is logged automatically',
        'Track opens and clicks (if enabled)',
      ],
      buttonLabel: 'Send Email',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Log and Track Calls',
      icon: PhoneIcon,
      description: 'Record call details, outcomes, and follow-ups for every customer conversation.',
      details: [
        'Click "Log Activity" → Select "Call"',
        'Enter phone number (auto-filled from contact)',
        'Set call direction (Inbound/Outbound)',
        'Record call duration',
        'Note call outcome (Connected, Voicemail, No Answer)',
        'Add detailed notes and action items',
        'Set follow-up tasks if needed',
        'All calls appear in contact timeline',
      ],
      buttonLabel: 'Log Call',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      title: 'Schedule and Track Meetings',
      icon: CalendarIcon,
      description: 'Create meetings with calendar integration and automatic reminders.',
      details: [
        'Click "Log Activity" → Select "Meeting"',
        'Set meeting title and description',
        'Choose date and time',
        'Add meeting link (Zoom, Teams, Google Meet)',
        'Link to contact and deal',
        'Set reminder notifications',
        'Meeting syncs to calendar',
        'Log meeting notes after completion',
      ],
      buttonLabel: 'Schedule Meeting',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      title: 'Filter and Search Activities',
      icon: FunnelIcon,
      description: 'Quickly find specific activities by type, date, contact, or deal.',
      details: [
        'Use filter buttons: All, Email, Call, Meeting, Note, Task',
        'Search by contact name or deal title',
        'Filter by date range',
        'Filter by activity status (completed/pending)',
        'Sort by newest or oldest first',
        'View activity timeline by contact',
        'Export filtered activities to CSV',
      ],
      buttonLabel: 'Apply Filters',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const features = [
    {
      icon: EnvelopeIcon,
      title: 'Email Tracking',
      description: 'Send tracked emails with templates, personalization, and delivery tracking. See opens, clicks, and replies.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: PhoneIcon,
      title: 'Call Logging',
      description: 'Record call details, duration, outcomes, and notes. Integrate with phone systems for automatic logging.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: CalendarIcon,
      title: 'Meeting Management',
      description: 'Schedule meetings with calendar sync, video conferencing links, and automatic reminders for attendees.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: ClipboardDocumentCheckIcon,
      title: 'Task Management',
      description: 'Create tasks with due dates, priorities, and assignments. Track completion and get reminders.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: DocumentTextIcon,
      title: 'Notes & Documentation',
      description: 'Add rich text notes with formatting, attachments, and tags. Keep detailed records of interactions.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: ClockIcon,
      title: 'Activity Timeline',
      description: 'View chronological activity history per contact, deal, or company. See complete relationship context.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: BellAlertIcon,
      title: 'Smart Reminders',
      description: 'Get notifications for upcoming meetings, overdue tasks, and follow-ups. Never miss an important action.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: SparklesIcon,
      title: 'Email Templates',
      description: 'Use pre-built templates with variable substitution for consistent, personalized communication at scale.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: PaperClipIcon,
      title: 'File Attachments',
      description: 'Attach documents, images, and files to emails, notes, and activities for complete context.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: UserGroupIcon,
      title: 'Team Collaboration',
      description: 'Share activities with team members, assign tasks, and collaborate on customer interactions.',
      gradient: 'from-orange-600 to-pink-600',
    },
  ];

  const proTips = [
    {
      icon: LightBulbIcon,
      title: 'Always Link Activities to Contacts',
      description: 'Every activity should be linked to a contact or deal. This creates a complete relationship timeline and ensures no interaction is lost.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Log Activities Immediately',
      description: 'Record calls, meetings, and conversations right after they happen. Details are fresh, accuracy is higher, and follow-ups are faster.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Email Templates for Common Scenarios',
      description: 'Create templates for frequent emails (introductions, follow-ups, proposals). Saves time while maintaining quality and consistency.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Set Follow-Up Tasks During Calls',
      description: 'While logging a call, immediately create follow-up tasks. Set due dates and reminders so nothing falls through the cracks.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: LightBulbIcon,
      title: 'Add Detailed Notes',
      description: 'Include specific details in notes: customer pain points, objections, next steps, budget discussed. Future you (or team) will thank you.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Review Activity History Before Outreach',
      description: 'Always check contact\'s activity timeline before calling or emailing. Context from past interactions makes conversations more meaningful.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Track Meeting Outcomes',
      description: 'After every meeting, log what was discussed, decisions made, and next actions. Update deal stage if needed. Keeps pipeline accurate.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Activity Filters for Reporting',
      description: 'Filter activities by type and date to analyze team performance. Track call volume, email response rates, meeting-to-deal conversion.',
      gradient: 'from-rose-600 to-pink-600',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-rose-600 p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">Activities Guide</h2>
              <p className="text-orange-100 text-sm">Track every customer interaction in one place</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('quickstart')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'quickstart'
                  ? 'bg-white text-orange-600 shadow-lg'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              Quick Start
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'features'
                  ? 'bg-white text-orange-600 shadow-lg'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'tips'
                  ? 'bg-white text-orange-600 shadow-lg'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              Pro Tips
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Learn how to log and track all customer interactions in your CRM.
              </p>

              {quickStartSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;

                return (
                  <div
                    key={index}
                    className={`border-2 rounded-xl overflow-hidden transition-all cursor-pointer ${
                      isActive
                        ? 'border-orange-500 shadow-lg'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => setActiveStep(index)}
                  >
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-rose-50">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-r ${step.gradient}`}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {index + 1}. {step.title}
                          </h3>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <div className="p-4 bg-white border-t-2 border-orange-100">
                        <ul className="space-y-2 mb-4">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircleIcon className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          className={`w-full px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r ${step.gradient} hover:shadow-lg transition-all`}
                        >
                          {step.buttonLabel}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Explore powerful activity tracking features to never miss a customer interaction.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="border-2 border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-r ${feature.gradient}`}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Master these best practices to maximize your activity tracking effectiveness.
              </p>

              {proTips.map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div
                    key={index}
                    className="border-2 border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-lg transition-all bg-gradient-to-r from-orange-50 to-rose-50"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-r ${tip.gradient}`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{tip.title}</h3>
                        <p className="text-sm text-gray-600">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gradient-to-r from-orange-50 to-rose-50 border-t-2 border-orange-100">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Need more help? Contact support or check our documentation.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
