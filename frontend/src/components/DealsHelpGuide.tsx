import { useState } from 'react';
import {
  XMarkIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  CalendarIcon,
  UserGroupIcon,
  TagIcon,
  FunnelIcon,
  ClipboardDocumentListIcon,
  BellAlertIcon,
  LightBulbIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function DealsHelpGuide({ onClose }: HelpGuideProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      title: 'Create Your First Deal',
      icon: PlusIcon,
      description: 'Click "Add Deal" to create a new sales opportunity in your pipeline.',
      details: [
        'Enter deal title (e.g., "Acme Corp - Enterprise Plan")',
        'Set deal value (expected revenue)',
        'Assign win probability (0-100%)',
        'Link to company and primary contact',
        'Set expected close date',
        'Choose initial stage (usually "Prospecting")',
        'Add notes or description',
        'Click "Create Deal" to save',
      ],
      buttonLabel: 'Add Deal',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      title: 'Move Deals Through Stages',
      icon: ArrowsRightLeftIcon,
      description: 'Drag and drop deals between stages as they progress through your sales pipeline.',
      details: [
        'Deals start in "Prospecting" stage',
        'Drag deal cards to move between stages',
        'Stages: Prospecting → Qualification → Proposal → Negotiation',
        'Update probability as deal progresses',
        'Add notes when changing stages',
        'End stages: "Closed Won" or "Closed Lost"',
        'Pipeline automatically calculates weighted value',
      ],
      buttonLabel: 'Try Drag & Drop',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Track Deal Progress',
      icon: ChartBarIcon,
      description: 'Monitor deal metrics, win probability, and expected close dates.',
      details: [
        'View deal value and weighted value (value × probability)',
        'Track days in current stage',
        'Monitor expected close dates',
        'View deal history and activity log',
        'See linked contacts and companies',
        'Track email and call interactions',
        'Identify stalled or at-risk deals',
      ],
      buttonLabel: 'View Analytics',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      title: 'Set Deal Reminders',
      icon: CalendarIcon,
      description: 'Schedule follow-ups and set reminders to stay on top of your deals.',
      details: [
        'Click on a deal to view details',
        'Set expected close date',
        'Add tasks and reminders',
        'Schedule follow-up calls or meetings',
        'Get notifications for upcoming deadlines',
        'Track overdue deals',
        'Update dates as deal progresses',
      ],
      buttonLabel: 'Set Reminder',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      title: 'Collaborate with Your Team',
      icon: UserGroupIcon,
      description: 'Assign deals to team members and collaborate on closing opportunities.',
      details: [
        'Assign deal owner (primary responsible person)',
        'Add team members as collaborators',
        'Share notes and updates',
        'Track team activity on each deal',
        'Filter deals by assigned user',
        'View team pipeline and forecasts',
        'Collaborate on proposals and negotiations',
      ],
      buttonLabel: 'Assign Team',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const features = [
    {
      icon: CurrencyDollarIcon,
      title: 'Pipeline Value Tracking',
      description: 'Automatically calculate total pipeline value, weighted value, and forecast revenue based on deal probabilities.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: ArrowsRightLeftIcon,
      title: 'Drag & Drop Pipeline',
      description: 'Visually manage your sales pipeline with intuitive drag-and-drop cards across 6 deal stages.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: ChartBarIcon,
      title: 'Deal Analytics',
      description: 'Track conversion rates, average deal size, sales velocity, and win/loss ratios with built-in analytics.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: CalendarIcon,
      title: 'Close Date Management',
      description: 'Set expected close dates, track overdue deals, and get automatic reminders for upcoming deadlines.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: UserGroupIcon,
      title: 'Team Collaboration',
      description: 'Assign deals to team members, share notes, and collaborate on closing opportunities together.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: TagIcon,
      title: 'Deal Categorization',
      description: 'Tag deals by product, industry, deal type, or custom categories for better organization and reporting.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: FunnelIcon,
      title: 'Advanced Filtering',
      description: 'Filter deals by stage, value range, close date, assigned user, probability, and custom fields.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: ClipboardDocumentListIcon,
      title: 'Activity Timeline',
      description: 'Track all deal activities including emails, calls, meetings, stage changes, and notes in one timeline.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: BellAlertIcon,
      title: 'Smart Notifications',
      description: 'Get alerts for deals approaching close dates, stalled deals, and stage changes requiring action.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: SparklesIcon,
      title: 'Deal Insights',
      description: 'AI-powered insights identify at-risk deals, suggest next actions, and predict win likelihood.',
      gradient: 'from-orange-600 to-pink-600',
    },
  ];

  const proTips = [
    {
      icon: LightBulbIcon,
      title: 'Update Probability as Deals Progress',
      description: 'Adjust win probability at each stage. Typical ranges: Prospecting 10%, Qualification 25%, Proposal 50%, Negotiation 75%, to ensure accurate forecasting.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Link Every Deal to a Company & Contact',
      description: 'Always associate deals with both a company and primary contact. This enables activity tracking, email integration, and complete relationship visibility.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Set Realistic Close Dates',
      description: 'Use expected close dates to prioritize work and generate accurate sales forecasts. Update dates as situations change to maintain forecast accuracy.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Add Notes When Changing Stages',
      description: 'Document why a deal moved stages, next steps, and key decisions. This creates valuable history and helps with handoffs or team collaboration.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: LightBulbIcon,
      title: 'Review Stalled Deals Weekly',
      description: 'Identify deals that haven\'t moved in 2+ weeks. Either advance them, close them as lost, or schedule follow-ups to keep pipeline healthy.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Weighted Value for Forecasting',
      description: 'Weighted value (deal value × probability) gives realistic revenue forecasts. Focus on high weighted-value deals for best ROI on your time.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Track Lost Reasons',
      description: 'When marking deals "Closed Lost", always note the reason (price, timing, competitor, etc.). This data improves future win rates.',
      gradient: 'from-amber-600 to-orange-600',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-rose-600 p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">Deals Pipeline Guide</h2>
              <p className="text-orange-100 text-sm">Master your sales pipeline and close more deals</p>
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
                Follow these steps to effectively manage your sales pipeline and close deals faster.
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
                Explore the powerful features designed to help you close more deals.
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
                Master these best practices to maximize your sales effectiveness and win rates.
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
