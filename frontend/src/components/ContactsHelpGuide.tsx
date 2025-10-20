import React, { useState } from 'react';
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  SparklesIcon,
  PlusIcon,
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  LightBulbIcon,
  RocketLaunchIcon,
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
      description: 'Click the "Add Contact" button in the top right to create a new contact manually.',
      details: [
        'Enter contact details: First Name, Last Name, Email',
        'Optionally add phone number, role, and company',
        'Select a status (Lead, Prospect, Customer, etc.)',
        'Add tags to categorize your contact',
        'Click "Save" to add the contact to your CRM',
      ],
      buttonLabel: 'Add Contact',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      title: 'Import Contacts in Bulk',
      icon: DocumentArrowUpIcon,
      description: 'Use AI CSV Import to upload multiple contacts at once from a spreadsheet.',
      details: [
        'Click "AI CSV Import" button',
        'Upload your CSV file (Excel or Google Sheets export)',
        'AI will automatically map columns to contact fields',
        'Review the mapping and make adjustments if needed',
        'Import all contacts with one click',
      ],
      buttonLabel: 'AI CSV Import',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Discover New Leads',
      icon: SparklesIcon,
      description: 'Use AI-powered lead discovery to find potential customers based on your criteria.',
      details: [
        'Click "Discover Leads" button',
        'Describe your ideal customer profile',
        'AI will search and suggest relevant leads',
        'Review suggested contacts',
        'Add promising leads to your CRM',
      ],
      buttonLabel: 'Discover Leads',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      title: 'Search & Filter Contacts',
      icon: MagnifyingGlassIcon,
      description: 'Quickly find contacts using search and filters.',
      details: [
        'Use the search bar to find contacts by name, email, or company',
        'Filter by status: Lead, Prospect, Customer, etc.',
        'Contacts are grouped by company for easy organization',
        'Click on a company to expand and see all contacts',
        'View contact details by clicking on any contact name',
      ],
      buttonLabel: 'Search',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const features = [
    {
      icon: PlusIcon,
      title: 'Add Contact',
      description: 'Create a new contact manually with full details',
      howTo: 'Click the blue "Add Contact" button → Fill in the form → Click Save',
    },
    {
      icon: DocumentArrowUpIcon,
      title: 'AI CSV Import',
      description: 'Import multiple contacts from a CSV file with AI-powered field mapping',
      howTo: 'Click "AI CSV Import" → Upload CSV → Review AI mapping → Import',
    },
    {
      icon: SparklesIcon,
      title: 'Discover Leads',
      description: 'Use AI to find and suggest new potential customers',
      howTo: 'Click "Discover Leads" → Describe ideal customer → Review suggestions → Add to CRM',
    },
    {
      icon: MagnifyingGlassIcon,
      title: 'Search Contacts',
      description: 'Instantly search across all contact fields',
      howTo: 'Type in the search box → Results filter in real-time',
    },
    {
      icon: FunnelIcon,
      title: 'Filter by Status',
      description: 'View contacts by their current status (Lead, Prospect, Customer, etc.)',
      howTo: 'Use the "All Statuses" dropdown → Select desired status',
    },
    {
      icon: PencilIcon,
      title: 'Edit Contact',
      description: 'Update contact information, status, or tags',
      howTo: 'Click the pencil icon next to any contact → Update details → Save',
    },
    {
      icon: TrashIcon,
      title: 'Delete Contact',
      description: 'Remove contacts from your CRM',
      howTo: 'Click the trash icon → Confirm deletion',
    },
  ];

  const tips = [
    {
      icon: LightBulbIcon,
      title: 'Use Tags for Organization',
      tip: 'Add tags like "VIP", "Hot Lead", or "Follow-up" to quickly categorize and filter contacts.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: SparklesIcon,
      title: 'Let AI Do the Work',
      tip: 'Use "Discover Leads" to automatically find potential customers that match your ideal profile.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: DocumentArrowUpIcon,
      title: 'Bulk Import Saves Time',
      tip: 'Have a list of contacts in Excel or Google Sheets? Use AI CSV Import to add hundreds of contacts in seconds.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: RocketLaunchIcon,
      title: 'Update Status Regularly',
      tip: 'Move contacts through stages: Lead → Prospect → Customer. This helps track your sales pipeline.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: CheckCircleIcon,
      title: 'Group by Company',
      tip: 'Contacts are automatically grouped by company. Expand companies to see all decision-makers in one place.',
      gradient: 'from-purple-600 to-rose-600',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-rose-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QuestionMarkCircleIcon className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Contacts Page Guide</h2>
              <p className="text-orange-100 text-sm mt-1">Learn how to manage your contacts effectively</p>
            </div>
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
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex gap-1 p-2">
            <button
              type="button"
              onClick={() => setActiveTab('quickstart')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'quickstart'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'text-gray-600 hover:bg-white hover:bg-opacity-50'
              }`}
            >
              🚀 Quick Start
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'features'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'text-gray-600 hover:bg-white hover:bg-opacity-50'
              }`}
            >
              ⚡ Features
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tips')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'tips'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'text-gray-600 hover:bg-white hover:bg-opacity-50'
              }`}
            >
              💡 Pro Tips
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quick Start Tab */}
          {activeTab === 'quickstart' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-orange-50 to-rose-50 border-l-4 border-orange-600 p-4 rounded-r-lg">
                <p className="text-gray-700">
                  Follow these steps to get started with managing your contacts effectively
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {quickStartSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = activeStep === index;
                  return (
                    <div
                      key={index}
                      className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
                        isActive ? 'border-orange-500 shadow-lg' : 'border-gray-200 hover:border-orange-300'
                      }`}
                      onClick={() => setActiveStep(index)}
                    >
                      <div className="p-4 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${step.gradient} text-white`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">Step {index + 1}: {step.title}</h3>
                            <p className="text-sm text-gray-600">{step.description}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${step.gradient} text-white`}>
                          {step.buttonLabel}
                        </span>
                      </div>

                      {isActive && (
                        <div className="p-4 bg-white border-t border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-3">How to do it:</h4>
                          <ul className="space-y-2">
                            {step.details.map((detail, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl p-5 hover:border-orange-400 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-orange-100 to-rose-100 rounded-lg">
                        <Icon className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                        <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r">
                          <p className="text-xs font-semibold text-orange-900">How to use:</p>
                          <p className="text-sm text-orange-800 mt-1">{feature.howTo}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tips Tab */}
          {activeTab === 'tips' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-orange-50 to-rose-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                <p className="text-gray-700">
                  <strong>Pro tips</strong> to help you get the most out of the Contacts page
                </p>
              </div>

              {tips.map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 bg-gradient-to-r ${tip.gradient} rounded-lg text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">{tip.title}</h3>
                        <p className="text-gray-700">{tip.tip}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Need more help? Check our documentation or contact support
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-rose-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
