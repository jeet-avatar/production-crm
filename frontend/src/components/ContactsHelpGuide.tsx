import { useState } from 'react';
import {
  XMarkIcon,
  PlusIcon,
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UserGroupIcon,
  TagIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  ArrowPathIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function ContactsHelpGuide({ onClose }: HelpGuideProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      title: 'Add Your First Contact',
      icon: PlusIcon,
      description: 'Click "Add Contact" to manually create a new contact in your CRM.',
      details: [
        'Click the "Add Contact" button',
        'Enter required fields: First Name, Last Name, Email',
        'Add optional details: Phone, Role, Company',
        'Select contact status (Lead, Prospect, Customer, etc.)',
        'Add tags for categorization (e.g., "VIP", "Hot Lead")',
        'Add notes or additional information',
        'Click "Save" to add contact to CRM',
      ],
      buttonLabel: 'Add Contact',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      title: 'Import Contacts in Bulk',
      icon: DocumentArrowUpIcon,
      description: 'Upload CSV files to import hundreds of contacts at once with AI mapping.',
      details: [
        'Click "AI CSV Import" button',
        'Prepare CSV with columns: Name, Email, Phone, Company',
        'Upload your CSV file',
        'AI automatically maps columns to CRM fields',
        'Review and adjust field mappings if needed',
        'Preview imported data',
        'Click "Import" to add all contacts',
        'System auto-deduplicates by email',
      ],
      buttonLabel: 'AI CSV Import',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Discover New Leads',
      icon: SparklesIcon,
      description: 'Use AI to find and add potential customers matching your ideal profile.',
      details: [
        'Click "Discover Leads" button',
        'Describe your ideal customer profile',
        'Set filters: Industry, company size, location',
        'AI searches database for matching prospects',
        'Review AI-suggested leads',
        'Select leads to add to CRM',
        'Click "Add Selected" to import',
      ],
      buttonLabel: 'Discover Leads',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      title: 'Search and Filter Contacts',
      icon: MagnifyingGlassIcon,
      description: 'Quickly find specific contacts using search and advanced filters.',
      details: [
        'Use search bar to find by name, email, or company',
        'Click status filter: All, Lead, Prospect, Customer',
        'Filter by tags (VIP, Hot Lead, Follow-up)',
        'Filter by assigned team member',
        'Contacts grouped by company automatically',
        'Click company name to expand/collapse',
        'Results update in real-time',
      ],
      buttonLabel: 'Try Search',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      title: 'Edit and Manage Contacts',
      icon: PencilIcon,
      description: 'Update contact information, change status, and manage relationships.',
      details: [
        'Click pencil icon next to contact name',
        'Update any contact field',
        'Change contact status as relationship progresses',
        'Add or remove tags',
        'Link contact to deals and campaigns',
        'View activity history timeline',
        'Click "Save" to update',
      ],
      buttonLabel: 'Edit Contact',
      gradient: 'from-purple-600 to-rose-600',
    },
  ];

  const features = [
    {
      icon: PlusIcon,
      title: 'Manual Contact Creation',
      description: 'Add contacts one-by-one with full control over all fields, tags, and status settings.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: DocumentArrowUpIcon,
      title: 'AI-Powered CSV Import',
      description: 'Import bulk contacts from CSV files with automatic field mapping and duplicate detection.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: SparklesIcon,
      title: 'AI Lead Discovery',
      description: 'Find new prospects automatically based on your ideal customer profile and industry filters.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: MagnifyingGlassIcon,
      title: 'Advanced Search',
      description: 'Search contacts by name, email, company, or any field with instant results and fuzzy matching.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: FunnelIcon,
      title: 'Smart Filtering',
      description: 'Filter contacts by status, tags, company, assigned user, or custom fields for targeted views.',
      gradient: 'from-purple-600 to-rose-600',
    },
    {
      icon: UserGroupIcon,
      title: 'Company Grouping',
      description: 'Contacts automatically organized by company. Expand to see all decision-makers in one view.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: TagIcon,
      title: 'Tag Management',
      description: 'Organize contacts with custom tags like "VIP", "Hot Lead", "Follow-up" for easy segmentation.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: PencilIcon,
      title: 'Quick Edit',
      description: 'Update contact details, status, tags, and relationships with inline editing and auto-save.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: ArrowPathIcon,
      title: 'Auto-Sync',
      description: 'Contacts sync with email, calendar, and other integrations to keep data always up-to-date.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: TrashIcon,
      title: 'Safe Deletion',
      description: 'Delete contacts with confirmation prompts. Deleted contacts can be restored from archive.',
      gradient: 'from-purple-600 to-rose-600',
    },
  ];

  const proTips = [
    {
      icon: LightBulbIcon,
      title: 'Always Link Contacts to Companies',
      description: 'Associate every contact with their company. This creates powerful organizational views and helps you see all decision-makers at each account.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Tags for Segmentation',
      description: 'Create tags like "VIP", "Hot Lead", "Needs Follow-up" to quickly filter and target specific contact groups for campaigns.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Update Status as Relationships Progress',
      description: 'Move contacts through stages: Lead → Prospect → Customer. This helps track pipeline and conversion rates accurately.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Import Bulk, Not Manual Entry',
      description: 'Have contacts in Excel or Google Sheets? Use CSV import instead of manual entry. It\'s 10x faster and AI handles field mapping.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: LightBulbIcon,
      title: 'Use AI Discovery for Lead Generation',
      description: 'Instead of buying lead lists, use AI Discovery to find prospects matching your ideal customer profile. Higher quality, lower cost.',
      gradient: 'from-purple-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Keep Contact Data Clean',
      description: 'Regularly review and merge duplicate contacts. Clean data = better reporting, more accurate campaigns, and higher email deliverability.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Add Notes After Every Interaction',
      description: 'Log call notes, meeting outcomes, and key details immediately. Future you (or team members) will thank you for the context.',
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
              <h2 className="text-3xl font-bold mb-2">Contacts Guide</h2>
              <p className="text-orange-100 text-sm">Master contact management and relationship building</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              title="Close guide"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
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
              type="button"
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
              type="button"
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
                Follow these steps to effectively manage your contacts and build strong relationships.
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
                          type="button"
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
                Explore powerful contact management features to organize and grow your relationships.
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
                Master these best practices to maximize your contact management effectiveness.
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
              type="button"
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
