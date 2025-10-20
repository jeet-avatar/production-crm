import { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTemplate?: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string | null;
    variables: string[];
    isActive: boolean;
  } | null;
}

export function CreateTemplateModal({ isOpen, onClose, onSuccess, editingTemplate }: CreateTemplateModalProps) {
  const { gradients } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    isActive: true,
  });

  // Variable suggestions
  const commonVariables = [
    'firstName',
    'lastName',
    'email',
    'companyName',
    'position',
    'phone',
  ];

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        htmlContent: editingTemplate.htmlContent,
        textContent: editingTemplate.textContent || '',
        isActive: editingTemplate.isActive,
      });
    } else {
      setFormData({
        name: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        isActive: true,
      });
    }
    setError(null);
  }, [editingTemplate, isOpen]);

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

    if (!formData.subject.trim()) {
      setError('Email subject is required');
      return;
    }

    if (!formData.htmlContent.trim()) {
      setError('Email content is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('crmToken');
      const variables = extractVariables(formData.htmlContent + formData.subject);

      const url = editingTemplate
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email-templates/${editingTemplate.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email-templates`;

      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
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
        className="bg-white rounded-2xl shadow-2xl border-4 border-black max-w-4xl w-full my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} p-6 text-white rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {editingTemplate ? 'Edit Template' : 'Create Email Template'}
              </h2>
              <p className="text-white text-opacity-90 text-sm mt-1">
                Design reusable email templates with personalization
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Welcome Email, Follow-up Template"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Subject *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Welcome to {{companyName}}, {{firstName}}!"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {`{{variableName}}`} to insert personalized data
              </p>
            </div>

            {/* Variable Suggestions */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <SparklesIcon className="h-4 w-4 inline mr-1" />
                Quick Insert Variables
              </label>
              <div className="flex flex-wrap gap-2">
                {commonVariables.map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 rounded-lg text-xs font-bold hover:from-orange-200 hover:to-amber-200 transition-all"
                  >
                    {`{{${variable}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* HTML Content */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Content (HTML) *
              </label>
              <textarea
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                placeholder="Write your email content here. You can use HTML tags and {{variables}}."
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                required
              />
              <div className="mt-2 text-xs text-gray-500">
                <p className="font-medium mb-1">Tips:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Use HTML tags for formatting: &lt;h1&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;a href=""&gt;, etc.</li>
                  <li>Insert variables using double curly braces: {`{{firstName}}`}</li>
                  <li>Preview your email before sending to ensure proper formatting</li>
                </ul>
              </div>
            </div>

            {/* Plain Text Version */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Plain Text Version (Optional)
              </label>
              <textarea
                value={formData.textContent}
                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                placeholder="Plain text version for email clients that don't support HTML"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Detected Variables */}
            {detectedVariables.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                <p className="text-sm font-bold text-blue-900 mb-2">
                  Detected Variables ({detectedVariables.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {detectedVariables.map((variable, index) => (
                    <span
                      key={index}
                      className="inline-block px-3 py-1 rounded-lg text-xs font-bold text-blue-700 bg-blue-100"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Template is active and ready to use
              </label>
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-xl font-bold tracking-wide hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`px-6 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
