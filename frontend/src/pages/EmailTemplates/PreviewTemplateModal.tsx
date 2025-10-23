import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, EyeIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

interface PreviewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string | null;
    variables: string[];
  };
}

export function PreviewTemplateModal({ isOpen, onClose, template }: PreviewTemplateModalProps) {
  const [viewMode, setViewMode] = useState<'rendered' | 'html' | 'text'>('rendered');

  // Sample data to fill in variables for preview
  const sampleData: Record<string, string> = {
    subject: 'Transform Your Business with AI',
    previewText: 'Watch our latest insights on digital transformation',
    logoUrl: 'https://via.placeholder.com/200x60/F97316/000000?text=Your+Logo',
    headline: 'Transform Your Business with AI',
    firstName: 'John',
    bodyContent: "We're excited to share our latest insights on how AI is transforming the enterprise landscape. Our team has put together a comprehensive video that covers the latest trends and strategies.",
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoThumbnailUrl: 'https://via.placeholder.com/600x400/F97316/000000?text=Video+Thumbnail',
    videoTitle: 'AI Transformation in 2025: What You Need to Know',
    addToFeedUrl: 'https://example.com/feed/add',
    senderName: 'Jane Smith',
    senderTitle: 'VP of Marketing',
    companyAddress: '123 Innovation Drive',
    companyCity: 'Seattle',
    companyState: 'WA',
    companyZip: '98101',
    contactEmail: 'hello@example.com',
    contactPhone: '+1 (206) 555-0123',
    linkedInUrl: 'https://linkedin.com/company/example',
    twitterUrl: 'https://twitter.com/example',
    facebookUrl: 'https://facebook.com/example',
    youtubeUrl: 'https://youtube.com/@example',
    unsubscribeUrl: 'https://example.com/unsubscribe',
    preferencesUrl: 'https://example.com/preferences',
    privacyPolicyUrl: 'https://example.com/privacy',
    trackingPixelUrl: 'https://example.com/track/pixel.gif',
    currentYear: new Date().getFullYear().toString(),
  };

  // Replace variables in HTML with sample data
  const getPreviewHtml = () => {
    let html = template.htmlContent;

    // Replace all variables
    template.variables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      html = html.replace(regex, sampleData[variable] || `{{${variable}}}`);
    });

    return html;
  };

  const getPreviewText = () => {
    if (!template.textContent) return 'No text version available';

    let text = template.textContent;

    // Replace all variables
    template.variables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      text = text.replace(regex, sampleData[variable] || `{{${variable}}}`);
    });

    return text;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Dialog.Title className="text-2xl font-bold text-black">
                        Template Preview
                      </Dialog.Title>
                      <p className="mt-1 text-sm text-gray-800 font-medium">
                        {template.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl bg-white bg-opacity-20 p-2 text-black hover:bg-opacity-30 transition-all"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* View Mode Tabs */}
                <div className="border-b border-gray-200 bg-gray-50 px-6">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setViewMode('rendered')}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                        viewMode === 'rendered'
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <EyeIcon className="h-5 w-5" />
                      Rendered View (What Users See)
                    </button>
                    <button
                      onClick={() => setViewMode('html')}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                        viewMode === 'html'
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <CodeBracketIcon className="h-5 w-5" />
                      HTML Code
                    </button>
                    <button
                      onClick={() => setViewMode('text')}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                        viewMode === 'text'
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Plain Text Version
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  {/* Info Banner */}
                  <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-900 font-medium">
                          This preview uses <span className="font-bold">sample data</span> to show how the template will look. When you send the actual email, real data from your contacts will be used.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rendered View */}
                  {viewMode === 'rendered' && (
                    <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                      <div
                        className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto"
                        dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                      />
                    </div>
                  )}

                  {/* HTML Code View */}
                  {viewMode === 'html' && (
                    <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-sm overflow-x-auto">
                      <pre className="whitespace-pre-wrap break-words">
                        {template.htmlContent}
                      </pre>
                    </div>
                  )}

                  {/* Plain Text View */}
                  {viewMode === 'text' && (
                    <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                        {getPreviewText()}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">Template Variables: {template.variables.length}</p>
                      <p className="text-xs mt-1">Subject: {template.subject}</p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-black rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
