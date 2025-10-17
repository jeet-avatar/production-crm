import { useState, useRef } from 'react';
import { PhotoIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface LogoUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  accept?: string;
}

export function LogoUploader({
  label,
  value,
  onChange,
  placeholder = 'Enter logo URL or upload image',
  accept = 'image/png,image/jpeg,image/jpg,image/svg+xml',
}: LogoUploaderProps) {
  const [url, setUrl] = useState(value || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setError('');
    if (newUrl.trim()) {
      onChange(newUrl.trim());
    }
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PNG, JPG, or SVG');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Create a FormData object for upload
      const formData = new FormData();
      formData.append('logo', file);

      // TODO: Upload to your backend/S3
      // For now, create a local preview URL
      const previewUrl = URL.createObjectURL(file);
      setUrl(previewUrl);
      onChange(previewUrl);

      // In production, you would upload to S3 and get the URL:
      // const response = await fetch('/api/upload/logo', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${token}` },
      //   body: formData,
      // });
      // const { url } = await response.json();
      // setUrl(url);
      // onChange(url);

    } catch (err) {
      setError('Failed to upload image');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setUrl('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>

      {/* Preview or Upload Area */}
      {url ? (
        <div className="relative">
          {/* Logo Preview */}
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[120px]">
            <img
              src={url}
              alt={label}
              className="max-h-24 max-w-full object-contain"
              onError={() => setError('Failed to load image')}
            />
          </div>

          {/* Remove Button */}
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            title="Remove logo"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>

          {/* Change URL */}
          <button
            onClick={() => setUrl('')}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Change logo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ArrowUpTrayIcon className="w-10 h-10 text-gray-400" />
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, or SVG (max 5MB)</p>
              </div>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* OR Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-500 uppercase">Or</span>
            </div>
          </div>

          {/* URL Input */}
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <XMarkIcon className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        For best results, use a transparent PNG with your logo centered
      </p>
    </div>
  );
}
