import { useState } from 'react';
import {
  XMarkIcon,
  BuildingOfficeIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  FunnelIcon,
  TagIcon,
  PhoneIcon,
  EnvelopeIcon,
  UsersIcon,
  ChartBarIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function CompaniesHelpGuide({ onClose }: HelpGuideProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      title: 'Add Your First Company',
      icon: PlusIcon,
      description: 'Click the "Add Company" button to manually add a new company to your CRM.',
      details: [
        'Fill in company name (required)',
        'Add website URL for automatic enrichment',
        'Enter industry, size, and location',
        'Add company description and notes',
        'Set status (Active, Prospect, Customer, etc.)',
        'Assign to team member',
        'Click "Create Company" to save',
      ],
      buttonLabel: 'Add Company',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      title: 'Import Companies in Bulk',
      icon: ArrowUpTrayIcon,
      description: 'Import multiple companies at once using a CSV file.',
      details: [
        'Click "Import Companies" button',
        'Download the CSV template',
        'Fill in company data (name, website, industry, etc.)',
        'Upload your CSV file',
        'Review mapped fields',
        'Confirm import to add companies in bulk',
        'System will auto-deduplicate by domain',
      ],
      buttonLabel: 'Import Companies',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Discover Company Leads',
      icon: SparklesIcon,
      description: 'Find and add new companies automatically using our lead discovery tool.',
      details: [
        'Click "Discover Leads" button',
        'Enter industry keywords (e.g., "SaaS", "E-commerce")',
        'Set company size range (employees)',
        'Choose location/region',
        'Review discovered companies',
        'Select companies to import',
        'Click "Add to CRM" to save selected leads',
      ],
      buttonLabel: 'Discover Leads',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      title: 'AI Enrich Company Data',
      icon: SparklesIcon,
      description: 'Automatically enrich company profiles with AI-powered data from Apollo.io and other sources.',
      details: [
        'Click "AI Enrich Data" button',
        'Select companies to enrich (or choose "All")',
        'AI will fetch: industry, employee count, revenue, technologies used',
        'Adds social media profiles and key contacts',
        'Updates company description and keywords',
        'View enrichment status in company cards',
        'Enriched data appears instantly in company profiles',
      ],
      buttonLabel: 'AI Enrich Data',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      title: 'Search, Sort & Filter',
      icon: MagnifyingGlassIcon,
      description: 'Find companies quickly using powerful search and filtering options.',
      details: [
        'Use search bar to find by name, website, or industry',
        'Click column headers to sort (Name, Industry, Size, etc.)',
        'Use filters to narrow by status, assigned user, or tags',
        'Filter by company size (employees)',
        'Filter by creation date or last activity',
        'Combine multiple filters for precise results',
        'Save frequently used filter combinations',
      ],
      buttonLabel: 'Try Search',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const features = [
    {
      icon: BuildingOfficeIcon,
      title: 'Company Profiles',
      description: 'Detailed company information including industry, size, location, website, and custom notes.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: UsersIcon,
      title: 'Linked Contacts',
      description: 'View and manage all contacts associated with each company in one place.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: ChartBarIcon,
      title: 'Company Analytics',
      description: 'Track engagement history, deal pipeline, and revenue metrics per company.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: TagIcon,
      title: 'Tags & Categories',
      description: 'Organize companies with custom tags, industries, and status categories.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: SparklesIcon,
      title: 'AI Enrichment',
      description: 'Automatically enhance company data with AI-powered enrichment from Apollo.io and web sources.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: PhoneIcon,
      title: 'Quick Actions',
      description: 'Call, email, or schedule meetings directly from company cards.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: FunnelIcon,
      title: 'Advanced Filtering',
      description: 'Filter companies by status, size, industry, assigned user, tags, and custom fields.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: ArrowUpTrayIcon,
      title: 'Bulk Import/Export',
      description: 'Import companies via CSV or export your company database for reporting.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: UsersIcon,
      title: 'Team Assignments',
      description: 'Assign companies to team members and track ownership.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: EnvelopeIcon,
      title: 'Email Campaigns',
      description: 'Send targeted email campaigns to companies based on filters and segments.',
      gradient: 'from-orange-600 to-pink-600',
    },
  ];

  const proTips = [
    {
      icon: LightBulbIcon,
      title: 'Use AI Enrichment First',
      description: 'After importing companies, run AI Enrichment to automatically fill missing data like employee count, industry, and social profiles.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Import from Apollo.io',
      description: 'Use the "Discover Leads" feature to search Apollo.io\'s 250M+ company database and import directly into your CRM.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Always Add Website URLs',
      description: 'Include website URLs when adding companies—this enables automatic enrichment, social profile discovery, and contact finding.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Link Contacts to Companies',
      description: 'Always associate contacts with their companies to see relationship networks and track all touchpoints in one place.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Status for Pipeline Stages',
      description: 'Update company status (Prospect → Qualified → Customer) to track progression through your sales pipeline.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Tag for Segmentation',
      description: 'Use tags to segment companies (e.g., "High Priority", "Renewal Due", "Expansion Opportunity") for targeted campaigns.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Export for Analysis',
      description: 'Export company data to CSV for advanced analytics in Excel, Google Sheets, or BI tools.',
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
              <h2 className="text-3xl font-bold mb-2">Companies Guide</h2>
              <p className="text-orange-100 text-sm">Master your company management workflow</p>
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
                Follow these steps to get started with managing companies in your CRM.
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
                Explore the powerful features available for managing your companies.
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
                Maximize your productivity with these expert tips and best practices.
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
