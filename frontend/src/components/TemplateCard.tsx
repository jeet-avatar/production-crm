import { useState } from 'react';
import { PlayIcon, StarIcon, EyeIcon, ClockIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import type { VideoTemplate } from '../services/videoService';

interface TemplateCardProps {
  template: VideoTemplate;
  onSelect?: (template: VideoTemplate) => void;
  onPreview?: (template: VideoTemplate) => void;
  onToggleFavorite?: (templateId: string) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

export function TemplateCard({
  template,
  onSelect,
  onPreview,
  onToggleFavorite,
  isSelected = false,
  showActions = true,
}: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const categoryColors: Record<string, string> = {
    Business: 'bg-blue-100 text-blue-800',
    Tech: 'bg-purple-100 text-purple-800',
    Creative: 'bg-pink-100 text-pink-800',
    Minimal: 'bg-gray-100 text-gray-800',
    Abstract: 'bg-indigo-100 text-indigo-800',
  };

  const categoryColor = categoryColors[template.category] || 'bg-gray-100 text-gray-800';

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    return `${seconds}s`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  return (
    <div
      className={`relative group rounded-xl overflow-hidden transition-all duration-300 ${
        isSelected
          ? 'ring-4 ring-blue-500 shadow-2xl scale-105'
          : 'hover:shadow-xl hover:scale-105 shadow-md'
      } bg-white`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlayIcon className="w-16 h-16 text-gray-400" />
          </div>
        )}

        {/* Hover Overlay */}
        {isHovered && showActions && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 transition-opacity">
            {onPreview && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(template);
                }}
                className="p-3 bg-white/90 rounded-full hover:bg-white transition-colors"
                title="Preview"
              >
                <EyeIcon className="w-6 h-6 text-gray-800" />
              </button>
            )}
            {onSelect && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(template);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                {isSelected ? 'Selected' : 'Select'}
              </button>
            )}
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${categoryColor}`}>
            {template.category}
          </span>
        </div>

        {/* Duration Badge */}
        {template.duration && (
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {formatDuration(template.duration)}
          </div>
        )}

        {/* System Badge */}
        {template.isSystem && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-semibold">
              System
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Title and Favorite */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 line-clamp-1 flex-1">
            {template.name}
          </h3>
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(template.id);
              }}
              className="flex-shrink-0 transition-transform hover:scale-110"
              title={template.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {template.isFavorite ? (
                <StarIconSolid className="w-5 h-5 text-yellow-500" />
              ) : (
                <StarIcon className="w-5 h-5 text-gray-400 hover:text-yellow-500" />
              )}
            </button>
          )}
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {template.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {template.usageCount > 0 && (
              <span className="flex items-center gap-1">
                <PlayIcon className="w-3 h-3" />
                {template.usageCount} uses
              </span>
            )}
            {template.fileSize && (
              <span>{formatFileSize(template.fileSize)}</span>
            )}
          </div>
          {template.tags && template.tags.length > 0 && (
            <div className="flex gap-1">
              {template.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Select Button (Always Visible) */}
        {onSelect && !showActions && (
          <button
            onClick={() => onSelect(template)}
            className={`mt-3 w-full py-2 rounded-lg font-semibold transition-all ${
              isSelected
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:text-white'
            }`}
          >
            {isSelected ? '✓ Selected' : 'Select Template'}
          </button>
        )}
      </div>
    </div>
  );
}
