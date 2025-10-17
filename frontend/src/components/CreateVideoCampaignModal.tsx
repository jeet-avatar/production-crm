import { useState } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { TemplateLibrary } from './TemplateLibrary';
import { VideoUploader } from './VideoUploader';
import { LogoUploader } from './LogoUploader';
import { TextLayoverEditor } from './TextLayoverEditor';
import { videoService, type VideoTemplate, type TextOverlay } from '../services/videoService';

interface CreateVideoCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyIds?: string[];
}

type StepType = 'basics' | 'source' | 'design' | 'overlays' | 'preview';

export function CreateVideoCampaignModal({
  isOpen,
  onClose,
  onSuccess,
  companyIds = [],
}: CreateVideoCampaignModalProps) {
  const [step, setStep] = useState<StepType>('basics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [script, setScript] = useState('');
  const [tone, setTone] = useState('professional');
  const [videoSource, setVideoSource] = useState<'template' | 'upload'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [clientLogo, setClientLogo] = useState('');
  const [userLogo, setUserLogo] = useState('');
  const [bgmUrl, setBgmUrl] = useState('');
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [generatingScript, setGeneratingScript] = useState(false);

  const steps: { id: StepType; label: string }[] = [
    { id: 'basics', label: 'Basics' },
    { id: 'source', label: 'Video Source' },
    { id: 'design', label: 'Design' },
    { id: 'overlays', label: 'Overlays' },
    { id: 'preview', label: 'Preview' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  const handleGenerateScript = async () => {
    if (!name) {
      setError('Please enter a campaign name first');
      return;
    }

    setGeneratingScript(true);
    setError('');

    try {
      const result = await videoService.generateScript({
        companyName: name,
        tone,
      });
      setScript(result.script);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate script');
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!name || !script) {
      setError('Name and script are required');
      return;
    }

    if (videoSource === 'template' && !selectedTemplate) {
      setError('Please select a template');
      return;
    }

    if (videoSource === 'upload' && !customVideoUrl) {
      setError('Please upload or enter a video URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const campaignData = {
        name,
        narrationScript: script,
        tone,
        videoSource: videoSource === 'template' ? 'TEMPLATE' : 'CUSTOM_UPLOAD',
        templateId: selectedTemplate?.id,
        customVideoUrl: videoSource === 'upload' ? customVideoUrl : undefined,
        clientLogoUrl: clientLogo || undefined,
        userLogoUrl: userLogo || undefined,
        bgmUrl: bgmUrl || undefined,
        textOverlays: overlays.length > 0 ? overlays : undefined,
        companyIds: companyIds.length > 0 ? companyIds : undefined,
      };

      const result = await videoService.createCampaign(campaignData);

      // Start video generation
      await videoService.generateVideo(result.campaign.id);

      onSuccess();
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('basics');
    setName('');
    setScript('');
    setTone('professional');
    setVideoSource('template');
    setSelectedTemplate(null);
    setCustomVideoUrl('');
    setClientLogo('');
    setUserLogo('');
    setBgmUrl('');
    setOverlays([]);
    setError('');
  };

  const handleNext = () => {
    if (step === 'basics' && (!name || !script)) {
      setError('Please enter campaign name and script');
      return;
    }
    if (step === 'source') {
      if (videoSource === 'template' && !selectedTemplate) {
        setError('Please select a template');
        return;
      }
      if (videoSource === 'upload' && !customVideoUrl) {
        setError('Please upload a video or enter URL');
        return;
      }
    }

    setError('');
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Create Video Campaign</h2>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      index <= currentStepIndex
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                        : 'bg-gray-200'
                    }`}
                  />
                  <p
                    className={`text-xs mt-1 font-medium ${
                      index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Step 1: Basics */}
          {step === 'basics' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Welcome Video - Q1 2025"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tone
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['professional', 'friendly', 'enthusiastic', 'persuasive'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                        tone === t
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Narration Script
                  </label>
                  <button
                    onClick={handleGenerateScript}
                    disabled={generatingScript || !name}
                    className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    {generatingScript ? 'Generating...' : 'AI Generate'}
                  </button>
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Enter the narration script for your video..."
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Keep it between 100-150 words (30-60 seconds when spoken)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Video Source */}
          {step === 'source' && (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setVideoSource('template')}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    videoSource === 'template'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📚 Template Library
                </button>
                <button
                  onClick={() => setVideoSource('upload')}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    videoSource === 'upload'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📤 Upload Custom
                </button>
              </div>

              {videoSource === 'template' ? (
                <TemplateLibrary
                  onSelectTemplate={setSelectedTemplate}
                  selectedTemplateId={selectedTemplate?.id}
                />
              ) : (
                <VideoUploader onUploadComplete={setCustomVideoUrl} />
              )}
            </div>
          )}

          {/* Step 3: Design */}
          {step === 'design' && (
            <div className="space-y-6">
              <LogoUploader
                label="Client Company Logo"
                value={clientLogo}
                onChange={setClientLogo}
                placeholder="Enter client logo URL or upload"
              />
              <LogoUploader
                label="Your Company Logo"
                value={userLogo}
                onChange={setUserLogo}
                placeholder="Enter your company logo URL or upload"
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Background Music URL (Optional)
                </label>
                <input
                  type="url"
                  value={bgmUrl}
                  onChange={(e) => setBgmUrl(e.target.value)}
                  placeholder="https://example.com/music.mp3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default background music
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Overlays */}
          {step === 'overlays' && (
            <div>
              <TextLayoverEditor overlays={overlays} onChange={setOverlays} maxDuration={60} />
            </div>
          )}

          {/* Step 5: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Summary</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-semibold text-gray-700">Name:</dt>
                    <dd className="text-gray-900">{name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-700">Video Source:</dt>
                    <dd className="text-gray-900">
                      {videoSource === 'template'
                        ? selectedTemplate?.name || 'Template'
                        : 'Custom Upload'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-700">Script:</dt>
                    <dd className="text-gray-600 text-sm">{script.substring(0, 150)}...</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-700">Text Overlays:</dt>
                    <dd className="text-gray-900">{overlays.length} overlay(s)</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-700">Logos:</dt>
                    <dd className="text-gray-900">
                      {clientLogo && userLogo
                        ? 'Both logos added'
                        : clientLogo
                        ? 'Client logo only'
                        : userLogo
                        ? 'Your logo only'
                        : 'No logos'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚡ Video generation will start immediately after creation. This may take 3-5 minutes.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 'basics'}
            className="px-6 py-2 text-gray-700 font-semibold hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>

            {step === 'preview' ? (
              <button
                onClick={handleCreateCampaign}
                disabled={loading}
                className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? 'Creating...' : '🎬 Create & Generate'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
