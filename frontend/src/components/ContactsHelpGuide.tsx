import { useState } from 'react';
import {
  PlusIcon,
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UserGroupIcon,
  TagIcon,
  CheckCircleIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function ContactsHelpGuide({ onClose }: HelpGuideProps) {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black rounded-[40px] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 p-8 relative rounded-t-[40px]">
          <div className="flex items-center gap-3 mb-3">
            <UserGroupIcon className="w-12 h-12 text-black" />
            <h2 className="text-4xl font-bold text-black">
              Contacts Guide
            </h2>
          </div>
          <p className="text-lg text-black/90 mb-6">
            Master contact management and build stronger relationships
          </p>

          {/* Tab Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('quickstart')}
              className={activeTab === 'quickstart'
                ? "bg-white text-black font-bold px-6 py-3 rounded-xl shadow-lg"
                : "bg-white/40 text-black/70 hover:bg-white/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              Quick Start
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={activeTab === 'features'
                ? "bg-white text-black font-bold px-6 py-3 rounded-xl shadow-lg"
                : "bg-white/40 text-black/70 hover:bg-white/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tips')}
              className={activeTab === 'tips'
                ? "bg-white text-black font-bold px-6 py-3 rounded-xl shadow-lg"
                : "bg-white/40 text-black/70 hover:bg-white/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              Pro Tips
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {activeTab === 'quickstart' && (
            <>
              <p className="text-lg text-black mb-6">
                Follow these steps to effectively manage your contacts and build strong relationships.
              </p>

              {/* Step 1 */}
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-orange-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 rounded-xl w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-orange-600">1</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PlusIcon className="w-6 h-6 text-orange-600" />
                      <h3 className="text-xl font-semibold text-gray-900">Add Your First Contact</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Click "Add Contact" to manually create a new contact in your CRM.
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Click the "Add Contact" button</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Enter required fields: First Name, Last Name, Email</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Add optional details: Phone, Role, Company</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Select contact status and add tags</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-green-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 rounded-xl w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-green-600">2</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <DocumentArrowUpIcon className="w-6 h-6 text-green-600" />
                      <h3 className="text-xl font-semibold text-gray-900">Import Contacts in Bulk</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Upload CSV files to import hundreds of contacts at once with AI mapping.
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Click "Import CSV" button</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Upload your CSV file with contacts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">AI automatically maps columns to fields</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 rounded-xl w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-blue-600">3</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <SparklesIcon className="w-6 h-6 text-blue-600" />
                      <h3 className="text-xl font-semibold text-gray-900">Discover & Enrich Leads</h3>
                    </div>
                    <p className="text-gray-600">
                      Use AI to automatically discover companies, find decision-makers, and enrich contact data with company details and social profiles.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'features' && (
            <>
              <p className="text-lg text-black mb-6">
                Powerful features to manage and grow your contact database.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-gray-300 hover:shadow-md transition-all">
                  <MagnifyingGlassIcon className="w-8 h-8 text-gray-700 mb-3" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Smart Search</h4>
                  <p className="text-gray-600">Find contacts instantly by name, email, company, or tags</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-gray-300 hover:shadow-md transition-all">
                  <TagIcon className="w-8 h-8 text-purple-600 mb-3" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Tags & Segments</h4>
                  <p className="text-gray-600">Organize contacts with custom tags and create targeted segments</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-gray-300 hover:shadow-md transition-all">
                  <SparklesIcon className="w-8 h-8 text-blue-600 mb-3" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">AI Enrichment</h4>
                  <p className="text-gray-600">Automatically discover company info, social profiles, and more</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-gray-300 hover:shadow-md transition-all">
                  <DocumentArrowUpIcon className="w-8 h-8 text-green-600 mb-3" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Bulk Import</h4>
                  <p className="text-gray-600">Import thousands of contacts from CSV with AI column mapping</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'tips' && (
            <>
              <p className="text-lg text-black mb-6">
                Pro tips to get the most out of contact management.
              </p>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-r-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <LightBulbIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-xl font-bold text-black mb-2">Use Tags Consistently</h4>
                      <p className="text-black/80">Create a standard tagging system and stick to it for better organization and reporting</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-r-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <LightBulbIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-xl font-bold text-black mb-2">Enrich Early</h4>
                      <p className="text-black/80">Use AI enrichment right after importing to get complete contact profiles immediately</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-r-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <LightBulbIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-xl font-bold text-black mb-2">Regular Cleanup</h4>
                      <p className="text-black/80">Schedule monthly reviews to remove duplicates and update outdated information</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
}
