import { useState } from 'react';
import {
  SparklesIcon,
  RectangleStackIcon,
  FilmIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { TemplateLibrary } from './TemplateLibrary';
import { PexelsVideoBrowser } from './PexelsVideoBrowser';
import { VideoUploader } from './VideoUploader';
import { GenerateVideoFromPrompt } from './GenerateVideoFromPrompt';
import { videoService, type VideoTemplate } from '../services/videoService';
import { useTheme } from '../contexts/ThemeContext';

interface EnhancedTemplateLibraryProps {
  onSelectTemplate?: (template: VideoTemplate) => void;
  onSelectPexelsVideo?: (video: {
    url: string;
    thumbnailUrl: string;
    duration: number;
    width: number;
    height: number;
    source: string;
    author: string;
    pexelsId: number;
  }) => void;
  onSelectCustomVideo?: (videoUrl: string) => void;
  selectedTemplateId?: string;
  selectedPexelsVideoId?: number;
}

type ViewMode = 'saved-templates' | 'pexels-browse' | 'ai-generate' | 'upload-custom';

export function EnhancedTemplateLibrary({
  onSelectTemplate,
  onSelectPexelsVideo,
  onSelectCustomVideo,
  selectedTemplateId,
  selectedPexelsVideoId,
}: EnhancedTemplateLibraryProps) {
  const { gradients } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('saved-templates');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const handlePexelsVideoSelect = async (video: any) => {
    if (onSelectPexelsVideo) {
      onSelectPexelsVideo(video);
    }

    // Optionally save as template for future use
    if (confirm('Save this Pexels video as a reusable template?')) {
      setSavingTemplate(true);
      try {
        await videoService.createTemplate({
          name: `Pexels Video by ${video.author}`,
          description: `HD Stock video from Pexels (${video.duration}s)`,
          videoUrl: video.url,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          width: video.width,
          height: video.height,
          category: 'Tech',
          tags: ['pexels', 'stock', 'hd'],
          isSystem: false,
          isFree: true,
          sourceProvider: 'Pexels',
          metadata: {
            pexelsId: video.pexelsId,
            author: video.author,
            license: 'Pexels License (Free for commercial use)',
          },
        });
        alert('✅ Video saved as template! You can find it in "My Templates" tab.');
      } catch (err: any) {
        console.error('Failed to save template:', err);
        alert('Failed to save template. You can still use the video.');
      } finally {
        setSavingTemplate(false);
      }
    }
  };

  const tabs: { id: ViewMode; label: string; icon: any; description: string }[] = [
    {
      id: 'saved-templates',
      label: 'My Templates',
      icon: RectangleStackIcon,
      description: 'Your saved templates and system templates',
    },
    {
      id: 'pexels-browse',
      label: 'Stock Videos',
      icon: FilmIcon,
      description: 'Browse thousands of free HD videos from Pexels',
    },
    {
      id: 'ai-generate',
      label: 'AI Generate',
      icon: SparklesIcon,
      description: 'Create custom video from text prompt using AI',
    },
    {
      id: 'upload-custom',
      label: 'Upload Custom',
      icon: CloudArrowUpIcon,
      description: 'Upload your own video file or provide URL',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-200 shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Video Template Selection</h2>
          <p className="text-gray-600">
            Choose from saved templates, browse stock videos, generate with AI, or upload your own
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`group relative p-4 rounded-xl border-2 transition-all text-left ${
                  viewMode === tab.id
                    ? `bg-gradient-to-r ${gradients.brand.primary.gradient} border-transparent shadow-lg text-black`
                    : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-md text-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === tab.id
                        ? 'bg-white/20'
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm mb-1">{tab.label}</h3>
                    <p
                      className={`text-xs line-clamp-2 ${
                        viewMode === tab.id ? 'text-black/80' : 'text-gray-500'
                      }`}
                    >
                      {tab.description}
                    </p>
                  </div>
                </div>

                {/* Active Indicator */}
                {viewMode === tab.id && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-white rounded-full shadow-md"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        {savingTemplate && (
          <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-blue-800 font-medium">💾 Saving video as template...</p>
          </div>
        )}

        {viewMode === 'saved-templates' && (
          <TemplateLibrary
            onSelectTemplate={(template) => {
              if (onSelectTemplate) {
                onSelectTemplate(template);
              }
            }}
            selectedTemplateId={selectedTemplateId}
          />
        )}

        {viewMode === 'pexels-browse' && (
          <PexelsVideoBrowser
            onSelectVideo={handlePexelsVideoSelect}
            selectedVideoId={selectedPexelsVideoId}
            allowSaveAsTemplate={true}
          />
        )}

        {viewMode === 'ai-generate' && (
          <div className="max-w-3xl mx-auto">
            <GenerateVideoFromPrompt
              onVideoGenerated={(template) => {
                if (onSelectTemplate) {
                  onSelectTemplate(template);
                }
                // Auto-switch to templates view to see the generated template
                setTimeout(() => {
                  setViewMode('saved-templates');
                  alert('✅ AI-generated template created! Switched to "My Templates" view.');
                }, 1000);
              }}
            />

            {/* Info Box */}
            <div className="mt-6 bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
              <h4 className="font-bold text-purple-900 mb-2">🤖 How AI Video Generation Works</h4>
              <ul className="space-y-2 text-sm text-purple-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Enter a description of the video you want (e.g., "cloud computing benefits")</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>AI extracts keywords and searches for relevant stock footage</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Generates a professional narration script (30 seconds)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span>Creates a reusable template you can customize further</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {viewMode === 'upload-custom' && (
          <div className="max-w-3xl mx-auto">
            <VideoUploader
              onUploadComplete={(videoUrl) => {
                if (onSelectCustomVideo) {
                  onSelectCustomVideo(videoUrl);
                }
              }}
            />

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h4 className="font-bold text-blue-900 mb-2">📤 Upload Guidelines</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Supported formats: MP4, MOV, AVI, WEBM</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Maximum file size: 500MB</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Recommended: 1920×1080 (Full HD) or 1280×720 (HD)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Duration: 15-60 seconds works best for campaigns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>You can also paste a direct video URL instead of uploading</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
