import { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

interface CreateSystemTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTemplate?: {
    id: string;
    name: string;
    type: string;
    subject: string;
    htmlContent: string;
    textContent: string | null;
    variables: string[];
    fromEmail: string;
    fromName: string | null;
    isActive: boolean;
  } | null;
  templateTypes: Array<{
    key: string;
    value: string;
    label: string;
  }>;
}

export function CreateSystemTemplateModal({
  isOpen,
  onClose,
  onSuccess,
  editingTemplate,
  templateTypes,
}: CreateSystemTemplateModalProps) {
  const { gradients } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedEmails, setVerifiedEmails] = useState<Array<{ email: string; name: string; isDefault: boolean }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom',
    subject: '',
    htmlContent: '',
    textContent: '',
    fromEmail: '',
    fromName: '',
    isActive: true,
  });

  // Common variables that can be used in templates
  const commonVariables = [
    'firstName',
    'lastName',
    'email',
    'companyName',
    'planName',
    'amount',
    'nextBillingDate',
    'verificationLink',
    'resetLink',
    'teamName',
    'inviterName',
  ];

  useEffect(() => {
    if (isOpen) {
      fetchVerifiedEmails();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        type: editingTemplate.type,
        subject: editingTemplate.subject,
        htmlContent: editingTemplate.htmlContent,
        textContent: editingTemplate.textContent || '',
        fromEmail: editingTemplate.fromEmail,
        fromName: editingTemplate.fromName || '',
        isActive: editingTemplate.isActive,
      });
    } else {
      setFormData({
        name: '',
        type: 'custom',
        subject: '',
        htmlContent: '',
        textContent: '',
        fromEmail: '',
        fromName: '',
        isActive: true,
      });
    }
    setError(null);
  }, [editingTemplate, isOpen]);

  const fetchVerifiedEmails = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates/verified-emails`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVerifiedEmails(data.emails || []);

        // Set default email if not editing
        if (!editingTemplate && data.emails.length > 0) {
          const defaultEmail = data.emails.find((e: any) => e.isDefault) || data.emails[0];
          setFormData(prev => ({
            ...prev,
            fromEmail: defaultEmail.email,
            fromName: defaultEmail.name,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching verified emails:', err);
    }
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(regex);
    const variables = new Set<string>();
    for (const match of matches) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  };

  const insertVariable = (variable: string) => {
    const variableText = `{{${variable}}}`;
    setFormData({
      ...formData,
      htmlContent: formData.htmlContent + variableText,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!formData.type.trim()) {
      setError('Template type is required');
      return;
    }

    if (!formData.subject.trim()) {
      setError('Email subject is required');
      return;
    }

    if (!formData.htmlContent.trim()) {
      setError('Email content is required');
      return;
    }

    if (!formData.fromEmail.trim()) {
      setError('From email is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('crmToken');
      const variables = extractVariables(formData.htmlContent + formData.subject);

      const url = editingTemplate
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates/${editingTemplate.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/system-templates`;

      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          variables,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const detectedVariables = extractVariables(formData.htmlContent + formData.subject);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} p-6 text-black rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <EnvelopeIcon className="h-6 w-6 text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {editingTemplate ? 'Edit System Template' : 'Create System Template'}
                </h2>
                <p className="text-black/80 text-sm mt-1">
                  System-wide email templates for automated messages
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-black/80 hover:text-black hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Welcome Email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Template Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Template Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select type...</option>
                {templateTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* From Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                From Email *
              </label>
              <select
                value={formData.fromEmail}
                onChange={(e) => {
                  const selectedEmail = verifiedEmails.find(email => email.email === e.target.value);
                  setFormData({
                    ...formData,
                    fromEmail: e.target.value,
                    fromName: selectedEmail?.name || formData.fromName,
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select verified email...</option>
                {verifiedEmails.map((email) => (
                  <option key={email.email} value={email.email}>
                    {email.name} &lt;{email.email}&gt; {email.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Only AWS SES verified emails can be used
              </p>
            </div>

            {/* From Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                placeholder="e.g., BrandMonkz"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Email Subject */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Welcome to {{companyName}}!"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Variable Suggestions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Available Variables
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  Click to insert variables into your template. Use {`{{variableName}}`} syntax.
                </p>
                <div className="flex flex-wrap gap-2">
                  {commonVariables.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="px-3 py-1 bg-white text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      {`{{${variable}}}`}
                    </button>
                  ))}
                </div>
                {detectedVariables.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Detected in template: {detectedVariables.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* HTML Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Content (HTML) *
            </label>
            <textarea
              value={formData.htmlContent}
              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
              placeholder="Enter your email HTML content here. Use {{variable}} for dynamic content."
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports HTML tags and variable placeholders like {`{{firstName}}`}
            </p>
          </div>

          {/* Text Content (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Plain Text Content (Optional)
            </label>
            <textarea
              value={formData.textContent}
              onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
              placeholder="Plain text version for email clients that don't support HTML"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Template is active and can be used
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-rose-600 text-black rounded-lg hover:opacity-90 font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>{editingTemplate ? 'Update Template' : 'Create Template'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
