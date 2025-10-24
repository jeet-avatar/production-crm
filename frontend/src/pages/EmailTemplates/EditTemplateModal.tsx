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
  const [previewTab, setPreviewTab] = useState<'html' | 'text'>('html');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);

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

  const generatePlainText = (): string => {
    if (!template.textContent) {
      // If no text content, strip HTML tags from HTML content
      const html = generateUpdatedHTML();
      return html
        .replace(/<style[^>]*>.*?<\/style>/gs, '')
        .replace(/<script[^>]*>.*?<\/script>/gs, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    let updatedText = template.textContent;

    // Replace each {{variable}} with its value
    Object.entries(variableValues).forEach(([varName, value]) => {
      const regex = new RegExp(`{{${varName}}}`, 'g');
      updatedText = updatedText.replace(regex, value || '');
    });

    return updatedText;
  };

  const previewHTML = useMemo(() => {
    return generateUpdatedHTML();
  }, [variableValues, template.htmlContent]);

  const previewText = useMemo(() => {
    return generatePlainText();
  }, [variableValues, template.htmlContent, template.textContent]);

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

  // User-friendly field configuration - Maps technical variable names to friendly labels
  const getFieldConfig = (varName: string) => {
    const configs: Record<string, { label: string; description: string; placeholder: string; icon: string; type: 'image' | 'video' | 'text' | 'textarea' | 'email' | 'url' | 'color' }> = {
      // Logo & Image Fields
      logoUrl: { label: 'Company Logo', description: 'Upload your company logo (PNG, JPG, or SVG recommended)', placeholder: 'https://example.com/logo.png', icon: '🏢', type: 'image' },
      companyLogoUrl: { label: 'Company Logo', description: 'Your company\'s brand logo', placeholder: 'Upload or paste logo URL', icon: '🏢', type: 'image' },
      clientLogoUrl: { label: 'Client Logo', description: 'Your client\'s company logo', placeholder: 'Upload or paste client logo URL', icon: '👔', type: 'image' },

      // Video Fields
      videoUrl: { label: 'Video Content', description: 'Upload video or paste YouTube/Vimeo link', placeholder: 'https://youtube.com/watch?v=...', icon: '🎥', type: 'video' },
      videoThumbnailUrl: { label: 'Video Thumbnail', description: 'Preview image for the video', placeholder: 'Auto-generated or upload custom', icon: '🖼️', type: 'image' },
      videoTitle: { label: 'Video Title', description: 'Descriptive title for your video', placeholder: 'e.g., "Watch Our Product Demo"', icon: '📝', type: 'text' },

      // Content Fields
      headline: { label: 'Email Headline', description: 'Main heading displayed at the top of your email', placeholder: 'e.g., "Transform Your Business Today"', icon: '📰', type: 'text' },
      tagline: { label: 'Tagline', description: 'Short subtitle under the headline', placeholder: 'e.g., "Your Success Partner"', icon: '✨', type: 'text' },
      subject: { label: 'Email Subject', description: 'Subject line recipients see in their inbox', placeholder: 'e.g., "Exclusive Offer Inside"', icon: '📧', type: 'text' },
      previewText: { label: 'Preview Text', description: 'Text shown in email preview (before opening)', placeholder: 'e.g., "Don\'t miss this opportunity..."', icon: '👁️', type: 'text' },
      bodyContent: { label: 'Main Message', description: 'The main body content of your email', placeholder: 'Write your message here...', icon: '📝', type: 'textarea' },
      closingText: { label: 'Closing Message', description: 'Text displayed before your signature', placeholder: 'e.g., "Looking forward to working with you"', icon: '✍️', type: 'textarea' },

      // Recipient Fields
      firstName: { label: 'First Name', description: 'Recipient\'s first name', placeholder: 'e.g., John', icon: '👤', type: 'text' },
      lastName: { label: 'Last Name', description: 'Recipient\'s last name', placeholder: 'e.g., Smith', icon: '👤', type: 'text' },
      toName: { label: 'Recipient Name', description: 'Full name of the person receiving this email', placeholder: 'e.g., John Smith', icon: '👤', type: 'text' },
      email: { label: 'Email Address', description: 'Recipient\'s email address', placeholder: 'email@example.com', icon: '📧', type: 'email' },

      // Company Info
      companyName: { label: 'Company Name', description: 'Your company\'s legal name', placeholder: 'e.g., Acme Corporation', icon: '🏢', type: 'text' },
      companyAddress: { label: 'Street Address', description: 'Company street address', placeholder: '123 Main Street', icon: '📍', type: 'text' },
      companyCity: { label: 'City', description: 'City name', placeholder: 'New York', icon: '🏙️', type: 'text' },
      companyState: { label: 'State/Province', description: 'State or province', placeholder: 'NY', icon: '🗺️', type: 'text' },
      companyZip: { label: 'ZIP/Postal Code', description: 'Postal code', placeholder: '10001', icon: '📮', type: 'text' },

      // Sender Info
      senderName: { label: 'Your Name', description: 'Name that appears in the signature', placeholder: 'e.g., Jane Doe', icon: '✍️', type: 'text' },
      senderTitle: { label: 'Your Title', description: 'Your job title', placeholder: 'e.g., Sales Manager', icon: '💼', type: 'text' },
      senderEmail: { label: 'Your Email', description: 'Your contact email', placeholder: 'you@company.com', icon: '📧', type: 'email' },

      // Contact Info
      contactEmail: { label: 'Contact Email', description: 'General contact email address', placeholder: 'contact@company.com', icon: '📧', type: 'email' },
      contactPhone: { label: 'Phone Number', description: 'Contact phone number', placeholder: '+1 (555) 123-4567', icon: '📞', type: 'text' },
      phone: { label: 'Phone', description: 'Phone number', placeholder: '+1 (555) 123-4567', icon: '📞', type: 'text' },

      // CTA Fields
      ctaText: { label: 'Button Text', description: 'Text displayed on your call-to-action button', placeholder: 'e.g., "Get Started Now"', icon: '🔘', type: 'text' },
      ctaUrl: { label: 'Button Link', description: 'URL the button links to', placeholder: 'https://yoursite.com/signup', icon: '🔗', type: 'url' },
      addToFeedUrl: { label: 'Feed URL', description: 'Link to add to daily feed', placeholder: 'https://yoursite.com/feed', icon: '📰', type: 'url' },

      // Services
      service1Title: { label: 'Service 1 Name', description: 'First service offering', placeholder: 'e.g., "Consulting"', icon: '📊', type: 'text' },
      service1Url: { label: 'Service 1 Link', description: 'Link to service 1 details', placeholder: 'https://yoursite.com/consulting', icon: '🔗', type: 'url' },
      service2Title: { label: 'Service 2 Name', description: 'Second service offering', placeholder: 'e.g., "Training"', icon: '📈', type: 'text' },
      service2Url: { label: 'Service 2 Link', description: 'Link to service 2 details', placeholder: 'https://yoursite.com/training', icon: '🔗', type: 'url' },
      service3Title: { label: 'Service 3 Name', description: 'Third service offering', placeholder: 'e.g., "Support"', icon: '💡', type: 'text' },
      service3Url: { label: 'Service 3 Link', description: 'Link to service 3 details', placeholder: 'https://yoursite.com/support', icon: '🔗', type: 'url' },

      // Social Media
      linkedInUrl: { label: 'LinkedIn', description: 'Your LinkedIn profile or company page', placeholder: 'https://linkedin.com/company/yourcompany', icon: '💼', type: 'url' },
      twitterUrl: { label: 'Twitter/X', description: 'Your Twitter/X profile', placeholder: 'https://twitter.com/yourcompany', icon: '🐦', type: 'url' },
      facebookUrl: { label: 'Facebook', description: 'Your Facebook page', placeholder: 'https://facebook.com/yourcompany', icon: '👥', type: 'url' },
      instagramUrl: { label: 'Instagram', description: 'Your Instagram profile', placeholder: 'https://instagram.com/yourcompany', icon: '📷', type: 'url' },
      youtubeUrl: { label: 'YouTube', description: 'Your YouTube channel', placeholder: 'https://youtube.com/@yourcompany', icon: '▶️', type: 'url' },

      // Design/Colors
      primaryColor: { label: 'Primary Color', description: 'Main brand color (hex code)', placeholder: '#667eea', icon: '🎨', type: 'color' },
      secondaryColor: { label: 'Secondary Color', description: 'Accent color (hex code)', placeholder: '#764ba2', icon: '🎨', type: 'color' },
      textOnGradient: { label: 'Text Color', description: 'Text color on gradient backgrounds', placeholder: '#ffffff', icon: '🖍️', type: 'color' },

      // Legal/Footer
      unsubscribeUrl: { label: 'Unsubscribe Link', description: 'Link to unsubscribe page', placeholder: 'https://yoursite.com/unsubscribe', icon: '🔗', type: 'url' },
      privacyPolicyUrl: { label: 'Privacy Policy', description: 'Link to your privacy policy', placeholder: 'https://yoursite.com/privacy', icon: '🔒', type: 'url' },
      preferencesUrl: { label: 'Email Preferences', description: 'Link to email preferences page', placeholder: 'https://yoursite.com/preferences', icon: '⚙️', type: 'url' },
      trackingPixelUrl: { label: 'Tracking Pixel', description: 'Analytics tracking pixel URL', placeholder: 'https://analytics.com/pixel.gif', icon: '📊', type: 'url' },

      // Date/Time
      currentYear: { label: 'Current Year', description: 'Auto-filled with current year', placeholder: new Date().getFullYear().toString(), icon: '📅', type: 'text' },
      date: { label: 'Date', description: 'Current date', placeholder: new Date().toLocaleDateString(), icon: '📅', type: 'text' },

      // Position/Role
      position: { label: 'Position/Role', description: 'Job position or role', placeholder: 'e.g., Marketing Director', icon: '💼', type: 'text' },
    };

    // Return config if exists, otherwise generate a generic one
    return configs[varName] || {
      label: varName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      description: `Enter value for ${varName}`,
      placeholder: `Enter ${varName}...`,
      icon: '📄',
      type: varName.toLowerCase().includes('url') ? 'url' :
            varName.toLowerCase().includes('email') ? 'email' :
            varName.toLowerCase().includes('color') ? 'color' : 'text'
    };
  };

  // Render form field based on variable name and type
  const renderFormField = (varName: string) => {
    const config = getFieldConfig(varName);
    const isUploading = uploadingFields[varName];
    const value = variableValues[varName] || '';

    // Check if this is a media field (image/video)
    const isMediaField = config.type === 'image' || config.type === 'video';

    if (isMediaField) {
      return (
        <div key={varName} className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            <span className="text-xl mr-2">{config.icon}</span>
            {config.label}
          </label>
          <p className="text-xs text-gray-500 mb-2">{config.description}</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={value}
              onChange={(e) => {
                setVariableValues(prev => ({ ...prev, [varName]: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              placeholder={config.placeholder}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
              aria-label={config.label}
            />
            <label className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
              <input
                type="file"
                accept={config.type === 'video' ? 'video/*' : 'image/*'}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(varName, file);
                }}
                disabled={isUploading}
                aria-label={`Upload ${config.label}`}
              />
              <div className="px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-lg font-bold hover:shadow-lg transition-all whitespace-nowrap">
                {isUploading ? '⏳ Uploading...' : '📤 Upload'}
              </div>
            </label>
          </div>
          {value && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Preview:</p>
              {config.type === 'video' ? (
                <video src={value} className="w-full max-w-md rounded shadow-sm" controls />
              ) : (
                <img src={value} alt={config.label} className="max-w-md max-h-32 rounded shadow-sm object-contain" />
              )}
            </div>
          )}
        </div>
      );
    }

    // Color picker for color fields
    if (config.type === 'color') {
      return (
        <div key={varName} className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            <span className="text-xl mr-2">{config.icon}</span>
            {config.label}
          </label>
          <p className="text-xs text-gray-500 mb-2">{config.description}</p>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={value || config.placeholder}
              onChange={(e) => {
                setVariableValues(prev => ({ ...prev, [varName]: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              aria-label={config.label}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setVariableValues(prev => ({ ...prev, [varName]: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              placeholder={config.placeholder}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm font-mono"
              aria-label={`${config.label} hex code`}
            />
          </div>
        </div>
      );
    }

    // Text/Textarea fields
    const isLongText = config.type === 'textarea';

    return (
      <div key={varName} className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 mb-1">
          <span className="text-xl mr-2">{config.icon}</span>
          {config.label}
        </label>
        <p className="text-xs text-gray-500 mb-2">{config.description}</p>
        {isLongText ? (
          <textarea
            value={value}
            onChange={(e) => {
              setVariableValues(prev => ({ ...prev, [varName]: e.target.value }));
              setHasUnsavedChanges(true);
            }}
            placeholder={config.placeholder}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm resize-y"
            aria-label={config.label}
          />
        ) : (
          <input
            type={config.type}
            value={value}
            onChange={(e) => {
              setVariableValues(prev => ({ ...prev, [varName]: e.target.value }));
              setHasUnsavedChanges(true);
            }}
            placeholder={config.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
            aria-label={config.label}
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
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900">Preview</h3>

                          {/* Tab Buttons */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewTab('html')}
                              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                previewTab === 'html'
                                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              HTML
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewTab('text')}
                              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                previewTab === 'text'
                                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              Plain Text
                            </button>
                          </div>
                        </div>

                        {/* Preview Content */}
                        <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
                          {previewTab === 'html' ? (
                            <iframe
                              srcDoc={previewHTML}
                              className="w-full h-full border-0"
                              title="Email HTML Preview"
                            />
                          ) : (
                            <div className="w-full h-full overflow-auto p-6">
                              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                                {previewText}
                              </pre>
                            </div>
                          )}
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
