import { Fragment, useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  EyeIcon,
  PhotoIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// ===================================================================
// EMAIL TEMPLATE CREATOR - Clean, Type-Safe Implementation
// ===================================================================

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: {
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string;
  }) => Promise<void>;
  template?: {
    id?: string;
    name?: string;
    subject?: string;
    htmlContent?: string;
    textContent?: string | null;
    variables?: string[];
  };
}

interface TemplateVariable {
  name: string;
  value: string;
  type: 'text' | 'textarea' | 'url' | 'email' | 'color' | 'image' | 'video';
  label: string;
  placeholder: string;
  icon: string;
  category: 'basic' | 'content' | 'media' | 'contact' | 'design' | 'legal';
}

type CategoryKey = 'basic' | 'content' | 'media' | 'contact' | 'design' | 'legal';

interface CategoryLabel {
  title: string;
  icon: string;
}

export function EditTemplateModal({
  isOpen,
  onClose,
  onSave,
  template
}: EditTemplateModalProps): JSX.Element {
  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================
  const [templateName, setTemplateName] = useState<string>(template?.name || 'New Template');
  const [subject, setSubject] = useState<string>(template?.subject || '');
  const [htmlContent, setHtmlContent] = useState<string>(template?.htmlContent || '');
  const [variables, setVariables] = useState<TemplateVariable[]>([]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'html' | 'text'>('html');
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showHtmlEditor, setShowHtmlEditor] = useState<boolean>(false);
  const [showDraftBanner, setShowDraftBanner] = useState<boolean>(false);

  // ===================================================================
  // SMART VARIABLE DETECTION & CONFIGURATION
  // ===================================================================
  const getVariableConfig = (varName: string): Omit<TemplateVariable, 'name' | 'value'> => {
    const lower = varName.toLowerCase();

    // Media fields
    if (lower.includes('logo') || (lower.includes('image') && !lower.includes('url'))) {
      return {
        type: 'image',
        label: varName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Url', ''),
        placeholder: 'Upload or enter URL',
        icon: '🖼️',
        category: 'media'
      };
    }
    if (lower.includes('video')) {
      return {
        type: 'video',
        label: varName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Url', ''),
        placeholder: 'Upload video or enter URL',
        icon: '🎥',
        category: 'media'
      };
    }

    // Color fields
    if (lower.includes('color')) {
      return {
        type: 'color',
        label: varName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        placeholder: '#667eea',
        icon: '🎨',
        category: 'design'
      };
    }

    // Email fields
    if (lower.includes('email')) {
      return {
        type: 'email',
        label: varName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        placeholder: 'email@example.com',
        icon: '📧',
        category: 'contact'
      };
    }

    // URL fields
    if (lower.includes('url') || lower.includes('link')) {
      return {
        type: 'url',
        label: varName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Url', ' Link'),
        placeholder: 'https://example.com',
        icon: '🔗',
        category: 'contact'
      };
    }

    // Long text fields
    if (lower.includes('message') || lower.includes('description') || lower.includes('content') || lower.includes('body')) {
      return {
        type: 'textarea',
        label: varName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        placeholder: 'Enter your message...',
        icon: '📝',
        category: 'content'
      };
    }

    // Legal fields
    if (lower.includes('unsubscribe') || lower.includes('privacy') || lower.includes('terms') || lower.includes('legal')) {
      return {
        type: 'url',
        label: varName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        placeholder: 'https://example.com',
        icon: '⚖️',
        category: 'legal'
      };
    }

    // Default text field
    return {
      type: 'text',
      label: varName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      placeholder: `Enter ${varName}...`,
      icon: '📄',
      category: 'basic'
    };
  };

  // ===================================================================
  // EXTRACT VARIABLES FROM HTML TEMPLATE & LOAD DRAFT
  // ===================================================================
  useEffect(() => {
    if (!template?.htmlContent) return;

    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    const matches = template.htmlContent.matchAll(regex);
    const foundVars = new Set<string>();

    for (const match of matches) {
      foundVars.add(match[1]);
    }

    const vars: TemplateVariable[] = Array.from(foundVars).map(varName => ({
      name: varName,
      value: '',
      ...getVariableConfig(varName)
    }));

    // Load saved draft if exists
    const draftKey = `template_draft_${template?.id || 'new'}`;
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);

        // Show draft recovery banner
        setShowDraftBanner(true);

        // Restore template name and subject
        if (draft.templateName) setTemplateName(draft.templateName);
        if (draft.subject) setSubject(draft.subject);

        // Restore variable values from draft
        if (draft.variables && Array.isArray(draft.variables)) {
          const draftVarMap = new Map<string, string>(
            draft.variables.map((v: TemplateVariable) => [v.name, v.value])
          );

          vars.forEach(v => {
            const savedValue = draftVarMap.get(v.name);
            if (savedValue !== undefined) {
              v.value = savedValue;
            }
          });
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    }

    setVariables(vars);

    // Unescape HTML content to handle AI-generated templates with escape characters
    const cleanHtml = template.htmlContent
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");

    setHtmlContent(cleanHtml);
  }, [template?.htmlContent, template?.id]);

  // ===================================================================
  // GENERATE PREVIEW HTML
  // ===================================================================
  const previewHTML = useMemo(() => {
    // First, unescape the HTML content to handle AI-generated templates with escape characters
    let html = htmlContent
      .replace(/\\n/g, '\n')  // Replace \n with actual newlines
      .replace(/\\t/g, '\t')  // Replace \t with actual tabs
      .replace(/\\"/g, '"')   // Replace \" with actual quotes
      .replace(/\\'/g, "'");  // Replace \' with actual quotes

    // Then replace variables with their values
    variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      html = html.replace(regex, variable.value || `[${variable.label}]`);
    });

    return html;
  }, [htmlContent, variables]);

  // ===================================================================
  // GENERATE PLAIN TEXT VERSION
  // ===================================================================
  const previewText = useMemo(() => {
    const div = document.createElement('div');
    div.innerHTML = previewHTML;

    const scripts = div.getElementsByTagName('script');
    const styles = div.getElementsByTagName('style');

    while (scripts.length > 0) scripts[0].remove();
    while (styles.length > 0) styles[0].remove();

    return div.textContent || div.innerText || '';
  }, [previewHTML]);

  // ===================================================================
  // FILE UPLOAD HANDLER
  // ===================================================================
  const handleFileUpload = async (varName: string, file: File): Promise<void> => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert('Please select a valid image or video file');
      return;
    }

    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Max ${isVideo ? '100MB' : '5MB'}`);
      return;
    }

    try {
      setUploadingField(varName);

      const token = localStorage.getItem('crmToken');
      if (!token) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append(isVideo ? 'video' : 'logo', file);

      const endpoint = isVideo
        ? '/api/video-campaigns/templates/upload'
        : '/api/video-campaigns/upload-logo';

      const response = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:3000') + endpoint,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      const uploadedUrl = data.logoUrl || data.videoUrl || data.url;

      if (!uploadedUrl) throw new Error('No URL returned');

      updateVariableValue(varName, uploadedUrl);
    } catch (err) {
      const error = err as Error;
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploadingField(null);
    }
  };

  // ===================================================================
  // UPDATE VARIABLE VALUE
  // ===================================================================
  const updateVariableValue = (varName: string, value: string): void => {
    setVariables(prev =>
      prev.map(v => (v.name === varName ? { ...v, value } : v))
    );
  };

  // ===================================================================
  // UPDATE HTML AND RE-EXTRACT VARIABLES
  // ===================================================================
  const handleHtmlUpdate = (newHtml: string): void => {
    setHtmlContent(newHtml);

    // Re-extract variables from updated HTML
    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    const matches = newHtml.matchAll(regex);
    const foundVars = new Set<string>();

    for (const match of matches) {
      foundVars.add(match[1]);
    }

    // Keep existing values, add new variables
    const existingVarMap = new Map<string, string>(
      variables.map((v: TemplateVariable) => [v.name, v.value])
    );

    const updatedVars: TemplateVariable[] = Array.from(foundVars).map(varName => ({
      name: varName,
      value: existingVarMap.get(varName) || '',
      ...getVariableConfig(varName)
    }));

    setVariables(updatedVars);
    setShowHtmlEditor(false);
  };

  // ===================================================================
  // AUTO-SAVE DRAFT
  // ===================================================================
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setAutoSaving(true);

      const draft = {
        templateName,
        subject,
        variables,
        timestamp: Date.now()
      };

      localStorage.setItem(`template_draft_${template?.id || 'new'}`, JSON.stringify(draft));
      setLastSaved(new Date());

      setTimeout(() => setAutoSaving(false), 1000);
    }, 2000);

    return () => clearTimeout(timer);
  }, [templateName, subject, variables, isOpen, template?.id]);

  // ===================================================================
  // SAVE TEMPLATE
  // ===================================================================
  const handleSave = async (): Promise<void> => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    if (!subject.trim()) {
      alert('Please enter a subject line');
      return;
    }

    try {
      setIsSaving(true);

      let finalHTML = htmlContent;
      variables.forEach(variable => {
        const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
        finalHTML = finalHTML.replace(regex, variable.value || '');
      });

      await onSave({
        name: templateName,
        subject,
        htmlContent: finalHTML,
        textContent: previewText,
      });

      localStorage.removeItem(`template_draft_${template?.id || 'new'}`);
      onClose();
    } catch (err) {
      const error = err as Error;
      alert(`Save failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ===================================================================
  // RENDER VARIABLE FIELD - COMPACT & EFFICIENT
  // ===================================================================
  const renderVariableField = (variable: TemplateVariable): JSX.Element => {
    const isUploading = uploadingField === variable.name;

    // Image/Video upload field - COMPACT VERSION
    if (variable.type === 'image' || variable.type === 'video') {
      const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(variable.name, file);
      };

      return (
        <div key={variable.name} className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <span className="text-sm">{variable.icon}</span>
            {variable.label}
          </label>

          {variable.value && (
            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
              {variable.type === 'image' && (
                <img
                  src={variable.value}
                  alt={variable.label}
                  className="h-8 w-8 object-cover rounded flex-shrink-0"
                />
              )}
              <span className="text-xs text-green-700 flex-1 truncate">Uploaded</span>
              <button
                type="button"
                onClick={() => updateVariableValue(variable.name, '')}
                className="text-xs text-red-600 hover:text-red-700 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-1">
            <input
              type="url"
              value={variable.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateVariableValue(variable.name, e.target.value)}
              placeholder="URL or upload..."
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
            <label className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
              <input
                type="file"
                accept={variable.type === 'video' ? 'video/*' : 'image/*'}
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              <div className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded text-xs font-bold hover:shadow transition-all whitespace-nowrap flex items-center gap-1">
                {isUploading ? (
                  <>
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">...</span>
                  </>
                ) : (
                  <>
                    {variable.type === 'video' ? (
                      <VideoCameraIcon className="h-3.5 w-3.5" />
                    ) : (
                      <PhotoIcon className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Upload</span>
                  </>
                )}
              </div>
            </label>
          </div>
        </div>
      );
    }

    // Color picker field - COMPACT VERSION
    if (variable.type === 'color') {
      return (
        <div key={variable.name} className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <span className="text-sm">{variable.icon}</span>
            {variable.label}
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={variable.value || '#667eea'}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateVariableValue(variable.name, e.target.value)}
              className="h-8 w-12 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={variable.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateVariableValue(variable.name, e.target.value)}
              placeholder="#667eea"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-mono"
            />
          </div>
        </div>
      );
    }

    // Textarea field - COMPACT VERSION
    if (variable.type === 'textarea') {
      return (
        <div key={variable.name} className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <span className="text-sm">{variable.icon}</span>
            {variable.label}
          </label>
          <textarea
            value={variable.value}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateVariableValue(variable.name, e.target.value)}
            placeholder={variable.placeholder}
            rows={3}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-y"
          />
        </div>
      );
    }

    // Text/Email/URL input field - COMPACT VERSION
    return (
      <div key={variable.name} className="mb-3">
        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
          <span className="text-sm">{variable.icon}</span>
          {variable.label}
        </label>
        <input
          type={variable.type}
          value={variable.value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateVariableValue(variable.name, e.target.value)}
          placeholder={variable.placeholder}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>
    );
  };

  // ===================================================================
  // GROUP VARIABLES BY CATEGORY
  // ===================================================================
  const variablesByCategory = useMemo(() => {
    const grouped: Record<CategoryKey, TemplateVariable[]> = {
      basic: [],
      content: [],
      media: [],
      contact: [],
      design: [],
      legal: []
    };

    variables.forEach(v => {
      grouped[v.category].push(v);
    });

    return grouped;
  }, [variables]);

  const categoryLabels: Record<CategoryKey, CategoryLabel> = {
    basic: { title: 'Basic Information', icon: '📋' },
    content: { title: 'Content', icon: '✍️' },
    media: { title: 'Media (Logos & Videos)', icon: '🎬' },
    contact: { title: 'Contact & Links', icon: '📞' },
    design: { title: 'Design & Colors', icon: '🎨' },
    legal: { title: 'Legal & Footer', icon: '⚖️' }
  };

  // ===================================================================
  // RENDER UI
  // ===================================================================
  return (
    <Transition show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
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
              <Dialog.Panel className="w-full max-w-[95vw] h-[90vh] transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all flex flex-col">

                {/* HEADER */}
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <SparklesIcon className="h-7 w-7" />
                        Email Template Editor
                      </h2>
                      <p className="text-white text-sm opacity-90 mt-1">
                        Fill in the fields to customize your template
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {(autoSaving || lastSaved) && (
                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                          {autoSaving ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 text-white animate-spin" />
                              <span className="text-white text-sm font-medium">Saving...</span>
                            </>
                          ) : lastSaved ? (
                            <>
                              <ClockIcon className="h-4 w-4 text-white" />
                              <span className="text-white text-sm font-medium">
                                Saved {Math.floor((Date.now() - lastSaved.getTime()) / 1000)}s ago
                              </span>
                            </>
                          ) : null}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* DRAFT RECOVERY BANNER */}
                {showDraftBanner && (
                  <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Draft Recovered!</p>
                        <p className="text-xs text-blue-700">Your previous work has been restored</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDraftBanner(false)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* HTML EDITOR MODAL */}
                {showHtmlEditor && (
                  <div className="absolute inset-0 bg-white z-10 flex flex-col">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white">Edit HTML Template</h3>
                      <button
                        type="button"
                        onClick={() => setShowHtmlEditor(false)}
                        className="text-white hover:bg-white/20 p-2 rounded-lg"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                    <div className="flex-1 p-6 overflow-auto">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-sm text-gray-600">
                          Add new variables using <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{{variableName}}"}</code> syntax.
                          Examples: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{{instagramUrl}}"}</code>, <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{{clientLogo}}"}</code>
                        </p>
                        <button
                          type="button"
                          onClick={() => setHtmlContent('')}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 text-sm whitespace-nowrap ml-4"
                        >
                          Clear All
                        </button>
                      </div>
                      <textarea
                        value={htmlContent}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setHtmlContent(e.target.value)}
                        className="w-full h-[calc(100%-80px)] p-4 border-2 border-gray-300 rounded-lg font-mono text-sm"
                        placeholder="Enter your HTML template here..."
                      />
                    </div>
                    <div className="bg-gray-100 px-6 py-4 border-t-2 border-gray-200 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowHtmlEditor(false)}
                        className="px-6 py-2 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHtmlUpdate(htmlContent)}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-bold hover:shadow-lg"
                      >
                        Update & Re-scan Variables
                      </button>
                    </div>
                  </div>
                )}

                {/* BODY - Split View */}
                <div className="flex-1 flex overflow-hidden">

                  {/* LEFT: Form Editor */}
                  <div className="w-2/5 overflow-y-auto p-4 bg-gray-50" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                    <div className="space-y-3 pb-4">

                      {/* Template Name & Subject - COMPACT */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                          <span className="text-lg">📋</span>
                          <h3 className="text-sm font-bold text-gray-900">Template Settings</h3>
                          <span className="ml-auto text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">v3.0 Compact</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Template Name
                            </label>
                            <input
                              type="text"
                              value={templateName}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setTemplateName(e.target.value)}
                              placeholder="My Email Template"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Subject Line
                            </label>
                            <input
                              type="text"
                              value={subject}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                              placeholder="Your consultation is ready"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowHtmlEditor(true)}
                          className="mt-3 w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded text-xs font-bold hover:shadow transition-all flex items-center justify-center gap-1.5"
                        >
                          <SparklesIcon className="h-4 w-4" />
                          Edit HTML & Add Variables
                        </button>
                      </div>

                      {/* Render variable fields by category - COMPACT */}
                      {(Object.entries(variablesByCategory) as [CategoryKey, TemplateVariable[]][]).map(([category, vars]) => {
                        if (vars.length === 0) return null;

                        const { title, icon } = categoryLabels[category];

                        return (
                          <div key={category} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                              <span className="text-lg">{icon}</span>
                              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                              <span className="ml-auto text-xs text-gray-500">{vars.length}</span>
                            </div>
                            <div className="space-y-0">
                              {vars.map(renderVariableField)}
                            </div>
                          </div>
                        );
                      })}

                      {variables.length === 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
                          <SparklesIcon className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                          <h3 className="text-lg font-bold text-yellow-900 mb-2">No Variables Found</h3>
                          <p className="text-sm text-yellow-700">
                            This template doesn&apos;t have any editable variables.
                            <br />
                            Use <code className="bg-yellow-100 px-2 py-1 rounded">{"{{variableName}}"}</code> in your HTML to create editable fields.
                          </p>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* RIGHT: Preview */}
                  <div className="w-3/5 bg-white flex flex-col">
                    <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <EyeIcon className="h-5 w-5 text-orange-500" />
                        Live Preview
                      </h3>
                      <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setPreviewTab('html')}
                          className={`px-4 py-1.5 rounded-md font-semibold transition-all text-xs ${
                            previewTab === 'html'
                              ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          🌐 HTML
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab('text')}
                          className={`px-4 py-1.5 rounded-md font-semibold transition-all text-xs ${
                            previewTab === 'text'
                              ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          📄 Text
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-gray-50">
                      {previewTab === 'html' ? (
                        <div className="w-full h-full min-h-[calc(90vh-250px)] flex items-start justify-center p-6">
                          <iframe
                            srcDoc={previewHTML}
                            className="w-full max-w-full border-0 bg-white shadow-lg rounded"
                            title="Email Preview"
                            sandbox="allow-same-origin allow-scripts"
                            style={{ minHeight: '800px', height: 'auto' }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full p-6">
                          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed bg-white p-6 rounded shadow-lg">
                            {previewText}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* FOOTER */}
                <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-t-2 border-gray-200">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSaving}
                      className="px-6 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    {lastSaved && (
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        Draft auto-saved
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        Save Template
                      </>
                    )}
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
