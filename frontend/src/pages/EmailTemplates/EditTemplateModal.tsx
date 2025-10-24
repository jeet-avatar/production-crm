import { Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, EyeIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: any) => Promise<void>;
  template: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string | null;
    variables: string[];
  };
}

interface VideoCampaign {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl: string;
}

export function EditTemplateModal({ isOpen, onClose, onSave, template }: EditTemplateModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [videos, setVideos] = useState<VideoCampaign[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Track upload states for logo fields
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});

  const getDraftKey = () => `emailTemplate_draft_${template.id}`;

  // NEW APPROACH: Extract variable values from the template's HTML
  // Instead of regenerating HTML, we preserve the original and just replace {{variables}}
  const extractVariableValues = (htmlContent: string, variables: string[]): Record<string, string> => {
    const values: Record<string, string> = {};

    variables.forEach(varName => {
      // Try to find existing value in HTML by looking for the variable placeholder
      const regex = new RegExp(`{{${varName}}}`, 'g');
      // For now, initialize with empty string - user will fill in
      values[varName] = '';
    });

    return values;
  };

  // Initialize form data with variables from the template
  const [templateName, setTemplateName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [variableValues, setVariableValues] = useState<Record<string, string>>(() =>
    extractVariableValues(template.htmlContent, template.variables || [])
  );

  // Categorize variables for better UI organization
  const categorizeVariable = (varName: string): string => {
    const lower = varName.toLowerCase();

    if (lower.includes('logo') || lower.includes('image')) return 'media';
    if (lower.includes('video') || lower.includes('thumbnail')) return 'media';
    if (lower.includes('company') || lower.includes('sender') || lower.includes('signature')) return 'company';
    if (lower.includes('social') || lower.includes('linkedin') || lower.includes('twitter') || lower.includes('facebook') || lower.includes('instagram')) return 'social';
    if (lower.includes('unsubscribe') || lower.includes('privacy') || lower.includes('legal')) return 'legal';
    if (lower.includes('address') || lower.includes('city') || lower.includes('state') || lower.includes('zip') || lower.includes('phone') || lower.includes('email')) return 'contact';
    if (lower.includes('color') || lower.includes('gradient') || lower.includes('theme')) return 'design';
    if (lower.includes('service') || lower.includes('cta') || lower.includes('button')) return 'cta';

    return 'content';
  };

  const organizedVariables = useMemo(() => {
    const organized: Record<string, string[]> = {
      content: [],
      media: [],
      cta: [],
      company: [],
      contact: [],
      social: [],
      design: [],
      legal: [],
    };

    (template.variables || []).forEach(varName => {
      const category = categorizeVariable(varName);
      organized[category].push(varName);
    });

    return organized;
  }, [template.variables]);

  // Handle logo/image upload for any variable
  const handleFileUpload = async (varName: string, file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select a valid image or video file');
      return;
    }

    const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File is too large. Maximum size is ${file.type.startsWith('video/') ? '100MB' : '5MB'}.`);
      return;
    }

    try {
      setUploadingFields(prev => ({ ...prev, [varName]: true }));

      const token = localStorage.getItem('crmToken');
      if (!token) {
        alert('Not authenticated. Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append(file.type.startsWith('video/') ? 'video' : 'logo', file);

      const endpoint = file.type.startsWith('video/')
        ? '/api/video-campaigns/templates/upload'
        : '/api/video-campaigns/upload-logo';

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      const uploadedUrl = data.logoUrl || data.videoUrl || data.url;

      if (!uploadedUrl) {
        throw new Error('Server did not return a URL');
      }

      setVariableValues(prev => ({ ...prev, [varName]: uploadedUrl }));
      setHasUnsavedChanges(true);

    } catch (err: any) {
      console.error(`Upload error for ${varName}:`, err);
      alert(`Failed to upload: ${err.message}`);
    } finally {
      setUploadingFields(prev => ({ ...prev, [varName]: false }));
    }
  };

  // Generate the updated HTML by replacing {{variables}} with actual values
  const generateUpdatedHTML = (): string => {
    let updatedHTML = template.htmlContent;

    // Replace each {{variable}} with its value
    Object.entries(variableValues).forEach(([varName, value]) => {
      const regex = new RegExp(`{{${varName}}}`, 'g');
      updatedHTML = updatedHTML.replace(regex, value || '');
    });

    return updatedHTML;
  };

  const previewHTML = useMemo(() => {
    return generateUpdatedHTML();
  }, [variableValues]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const htmlContent = generateUpdatedHTML();
      const updatedTemplate = {
        name: templateName,
        subject,
        htmlContent,
        textContent: template.textContent,
        variables: template.variables,
      };

      await onSave(updatedTemplate);

      // Clear draft
      localStorage.removeItem(getDraftKey());
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Error saving template:', err);
      alert(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  // Auto-save draft every 5 seconds
  useEffect(() => {
    if (!hasUnsavedChanges || !isOpen) return;

    const timer = setTimeout(() => {
      const draft = {
        templateName,
        subject,
        variableValues,
        timestamp: Date.now(),
      };
      localStorage.setItem(getDraftKey(), JSON.stringify(draft));
    }, 5000);

    return () => clearTimeout(timer);
  }, [templateName, subject, variableValues, hasUnsavedChanges, isOpen]);

  // Check for existing draft when modal opens
  useEffect(() => {
    if (isOpen) {
      const draftKey = getDraftKey();
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          const draftAge = Date.now() - draft.timestamp;
          if (draftAge < 24 * 60 * 60 * 1000) {
            setShowDraftRecovery(true);
          } else {
            localStorage.removeItem(draftKey);
          }
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    }
  }, [isOpen]);

  const handleRecoverDraft = () => {
    const savedDraft = localStorage.getItem(getDraftKey());
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setTemplateName(draft.templateName);
        setSubject(draft.subject);
        setVariableValues(draft.variableValues);
        setShowDraftRecovery(false);
      } catch (error) {
        console.error('Error recovering draft:', error);
      }
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(getDraftKey());
    setShowDraftRecovery(false);
  };

  // Render form field based on variable name and type
  const renderFormField = (varName: string) => {
    const isMediaField = varName.toLowerCase().includes('logo') ||
                        varName.toLowerCase().includes('image') ||
                        varName.toLowerCase().includes('video') ||
                        varName.toLowerCase().includes('thumbnail');

    const isUploading = uploadingFields[varName];
    const value = variableValues[varName] || '';

    // Format variable name for display
    const displayName = varName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()); // Capitalize first letter

    if (isMediaField) {
      return (
        <div key={varName}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <PhotoIcon className="h-4 w-4 inline mr-1" />
            {displayName}
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={value}
              onChange={(e) => {
                setVariableValues(prev => ({ ...prev, [varName]: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              placeholder={`Enter URL or upload file`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
            <label className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
              <input
                type="file"
                accept={varName.toLowerCase().includes('video') ? 'video/*' : 'image/*'}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(varName, file);
                }}
                disabled={isUploading}
              />
              <div className="px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-black rounded-lg font-bold hover:shadow-lg transition-all">
                {isUploading ? 'Uploading...' : 'Upload'}
              </div>
            </label>
          </div>
          {value && (
            <div className="mt-2">
              {varName.toLowerCase().includes('video') ? (
                <video src={value} className="w-full max-w-xs rounded" controls />
              ) : (
                <img src={value} alt={displayName} className="max-w-xs max-h-20 rounded" />
              )}
            </div>
          )}
        </div>
      );
    }

    // Text/URL fields
    const isLongText = varName.toLowerCase().includes('content') ||
                      varName.toLowerCase().includes('body') ||
                      varName.toLowerCase().includes('description');

    return (
      <div key={varName}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {displayName}
        </label>
        {isLongText ? (
          <textarea
            value={value}
            onChange={(e) => {
              setVariableValues(prev => ({ ...prev, [varName]: e.target.value }));
              setHasUnsavedChanges(true);
            }}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setVariableValues(prev => ({ ...prev, [varName]: e.target.value }));
              setHasUnsavedChanges(true);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        )}
      </div>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-2xl font-bold text-black">
                      Edit Email Template
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-xl bg-white bg-opacity-20 p-2 text-black hover:bg-opacity-30"
                      aria-label="Close"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Draft Recovery Banner */}
                {showDraftRecovery && (
                  <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500 text-white rounded-full p-2">
                          <DocumentTextIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-blue-900">Draft Found!</h4>
                          <p className="text-sm text-blue-700">We found unsaved changes from your previous editing session.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleRecoverDraft}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
                        >
                          Recover Draft
                        </button>
                        <button
                          type="button"
                          onClick={handleDiscardDraft}
                          className="px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg font-bold hover:bg-blue-50"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto-save Indicator */}
                <div className="bg-gray-100 border-b border-gray-200 px-6 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600">
                      {hasUnsavedChanges ? (
                        <span className="text-orange-600 font-medium">● Auto-saving every 5 seconds...</span>
                      ) : (
                        <span className="text-green-600 font-medium">✓ All changes saved</span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4" />
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex h-[80vh]">
                  {/* Left: Form */}
                  <div className="w-1/2 overflow-y-auto border-r border-gray-200 p-6">
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Basic Information</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                            <input
                              type="text"
                              value={templateName}
                              onChange={(e) => {
                                setTemplateName(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                            <input
                              type="text"
                              value={subject}
                              onChange={(e) => {
                                setSubject(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Form Fields Based on Template Variables */}
                      {organizedVariables.content.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Content</h3>
                          <div className="space-y-3">
                            {organizedVariables.content.map(renderFormField)}
                          </div>
                        </div>
                      )}

                      {organizedVariables.media.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Media (Logos & Videos)</h3>
                          <div className="space-y-3">
                            {organizedVariables.media.map(renderFormField)}
                          </div>
                        </div>
                      )}

                      {organizedVariables.cta.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Call-to-Action</h3>
                          <div className="space-y-3">
                            {organizedVariables.cta.map(renderFormField)}
                          </div>
                        </div>
                      )}

                      {organizedVariables.company.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Company & Sender Info</h3>
                          <div className="space-y-3">
                            {organizedVariables.company.map(renderFormField)}
                          </div>
                        </div>
                      )}

                      {organizedVariables.contact.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Contact Information</h3>
                          <div className="space-y-3">
                            {organizedVariables.contact.map(renderFormField)}
                          </div>
                        </div>
                      )}

                      {organizedVariables.social.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Social Media Links</h3>
                          <div className="space-y-3">
                            {organizedVariables.social.map(renderFormField)}
                          </div>
                        </div>
                      )}

                      {organizedVariables.design.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Design & Colors</h3>
                          <div className="space-y-3">
                            {organizedVariables.design.map(renderFormField)}
                          </div>
                        </div>
                      )}

                      {organizedVariables.legal.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Legal & Footer</h3>
                          <div className="space-y-3">
                            {organizedVariables.legal.map(renderFormField)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Preview */}
                  <div className="w-1/2 overflow-y-auto bg-gray-50 p-6">
                    {showPreview ? (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Preview</h3>
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                          <iframe
                            srcDoc={previewHTML}
                            className="w-full h-[70vh] border-0"
                            title="Email Preview"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                          <EyeIcon className="h-16 w-16 mx-auto mb-4" />
                          <p>Click "Show Preview" to see your email template</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-black rounded-lg font-bold hover:shadow-lg disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
