import { Fragment, useState, useEffect } from 'react';
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

  // Template customization fields
  const [formData, setFormData] = useState({
    // Basic Info
    templateName: template.name,
    subject: template.subject,

    // Content
    headline: 'Transform Your Business with AI',
    bodyContent: "We're excited to share our latest insights on how AI is transforming the enterprise landscape.",

    // Video
    selectedVideoId: '',
    videoUrl: '',
    videoThumbnailUrl: '',
    videoTitle: '',

    // Logos
    clientLogoUrl: '',
    companyLogoUrl: 'https://via.placeholder.com/200x60/F97316/000000?text=Critical+River',

    // Colors
    primaryColor: '#F97316', // Orange
    secondaryColor: '#FB7185', // Rose
    textOnGradient: '#000000', // Black text on gradient

    // Company Info
    companyName: 'Critical River',
    senderName: 'Jane Smith',
    senderTitle: 'VP of Marketing',
    companyAddress: '123 Innovation Drive',
    companyCity: 'Seattle',
    companyState: 'WA',
    companyZip: '98101',
    contactEmail: 'hello@criticalriver.com',
    contactPhone: '+1 (206) 555-0123',

    // Social Media
    linkedInUrl: 'https://linkedin.com/company/critical-river',
    twitterUrl: 'https://twitter.com/criticalriver',
    facebookUrl: 'https://facebook.com/criticalriver',
    youtubeUrl: 'https://youtube.com/@criticalriver',

    // Legal
    unsubscribeUrl: 'https://criticalriver.com/unsubscribe',
    privacyPolicyUrl: 'https://criticalriver.com/privacy',
  });

  useEffect(() => {
    if (isOpen) {
      fetchVideoCampaigns();
    }
  }, [isOpen]);

  const fetchVideoCampaigns = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/video-campaigns', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.campaigns || []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleVideoSelect = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (video) {
      setFormData(prev => ({
        ...prev,
        selectedVideoId: video.id,
        videoUrl: video.videoUrl,
        videoThumbnailUrl: video.thumbnailUrl,
        videoTitle: video.name,
      }));
    }
  };

  const generateUpdatedHTML = () => {
    const gradient = `linear-gradient(to right, ${formData.primaryColor}, ${formData.secondaryColor})`;

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${formData.subject}</title><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background-color:#f3f4f6}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:${gradient};padding:30px 40px;text-align:center;border-radius:8px 8px 0 0}.header img{height:60px;max-width:200px;margin-bottom:10px}.header h1{margin:20px 0 0;color:${formData.textOnGradient};font-size:28px;font-weight:bold}.content{padding:40px;color:#1f2937;line-height:1.6}.greeting{font-size:18px;font-weight:600;margin-bottom:20px;color:#111827}.body-text{font-size:16px;color:#374151;margin-bottom:30px}.video-section{background:linear-gradient(135deg,#fef3c7 0%,#fce7f3 100%);border-radius:12px;padding:20px;margin:30px 0;border:2px solid ${formData.primaryColor};text-align:center}.video-section a{text-decoration:none}.video-thumbnail{width:100%;border-radius:8px;margin-bottom:15px}.video-title{margin:15px 0 5px;color:#1f2937;font-size:18px;font-weight:bold}.video-subtitle{color:#6b7280;font-size:14px}.cta-container{text-align:center;margin:30px 0}.cta-button{display:inline-block;background:${gradient};color:${formData.textOnGradient};font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:8px;margin:10px;border:2px solid ${formData.textOnGradient}}.cta-button-secondary{display:inline-block;background:#fff;color:${formData.primaryColor};font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:8px;margin:10px;border:2px solid ${formData.primaryColor}}.signature{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:14px}.signature-name{font-weight:600;color:#111827;font-size:16px}.footer{background-color:#1f2937;color:#9ca3af;padding:30px 40px;text-align:center;font-size:13px;line-height:1.6;border-radius:0 0 8px 8px}.footer a{color:${formData.primaryColor};text-decoration:underline;font-weight:600}@media screen and (max-width:600px){.container{width:100%!important}.header{padding:20px!important}.header h1{font-size:24px!important}.content{padding:20px!important}.cta-button,.cta-button-secondary{display:block!important;width:100%!important;margin:10px 0!important}.footer{padding:20px!important}}</style></head><body><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;padding:40px 0"><tr><td align="center"><table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600"><tr><td class="header">${formData.clientLogoUrl ? `<img src="${formData.clientLogoUrl}" alt="Client Logo" style="margin-bottom:15px"/>` : ''}<img src="${formData.companyLogoUrl}" alt="Company Logo"><h1>${formData.headline}</h1></td></tr><tr><td class="content"><div class="greeting">Hi {{firstName}},</div><div class="body-text">${formData.bodyContent}</div>${formData.videoUrl ? `<div class="video-section"><a href="${formData.videoUrl}" target="_blank"><img src="${formData.videoThumbnailUrl}" alt="Watch Video" class="video-thumbnail"><h3 class="video-title">${formData.videoTitle}</h3><p class="video-subtitle">▶ Click to watch the video</p></a></div>` : ''}<div class="cta-container"><a href="{{addToFeedUrl}}" class="cta-button" target="_blank">📰 Add to Daily Feed</a><br><a href="${formData.videoUrl || '{{videoUrl}}'}" class="cta-button-secondary" target="_blank">▶ Watch Video</a></div><div class="signature"><div class="signature-name">${formData.senderName}</div><div>${formData.senderTitle}</div><div style="margin-top:10px">${formData.companyName}</div></div></td></tr><tr><td class="footer"><div style="margin-bottom:20px"><strong>${formData.companyName}</strong><br>${formData.companyAddress}<br>${formData.companyCity}, ${formData.companyState} ${formData.companyZip}<br><a href="mailto:${formData.contactEmail}">${formData.contactEmail}</a> | ${formData.contactPhone}</div><div style="margin:20px 0"><a href="${formData.linkedInUrl}" target="_blank">LinkedIn</a> | <a href="${formData.twitterUrl}" target="_blank">Twitter</a> | <a href="${formData.facebookUrl}" target="_blank">Facebook</a> | <a href="${formData.youtubeUrl}" target="_blank">YouTube</a></div><div style="margin:20px 0"><a href="${formData.unsubscribeUrl}" target="_blank">Unsubscribe</a> | <a href="${formData.privacyPolicyUrl}" target="_blank">Privacy Policy</a></div><div style="margin-top:20px;font-size:12px;color:#6b7280">&copy; ${new Date().getFullYear()} ${formData.companyName}. All rights reserved.</div></td></tr></table></td></tr></table></body></html>`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedTemplate = {
        name: formData.templateName,
        subject: formData.subject,
        htmlContent: generateUpdatedHTML(),
        textContent: template.textContent,
        variables: template.variables,
      };

      await onSave(updatedTemplate);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setIsSaving(false);
    }
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
                      onClick={onClose}
                      className="rounded-xl bg-white bg-opacity-20 p-2 text-black hover:bg-opacity-30"
                    >
                      <XMarkIcon className="h-6 w-6" />
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
                              value={formData.templateName}
                              onChange={(e) => setFormData(prev => ({ ...prev, templateName: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                            <input
                              type="text"
                              value={formData.subject}
                              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Email Content</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                            <input
                              type="text"
                              value={formData.headline}
                              onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Body Content</label>
                            <textarea
                              value={formData.bodyContent}
                              onChange={(e) => setFormData(prev => ({ ...prev, bodyContent: e.target.value }))}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Video Selection */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Video</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select from Video Campaigns</label>
                            <select
                              value={formData.selectedVideoId}
                              onChange={(e) => handleVideoSelect(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="">-- Select a video --</option>
                              {videos.map(video => (
                                <option key={video.id} value={video.id}>{video.name}</option>
                              ))}
                            </select>
                          </div>
                          {formData.videoUrl && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm font-medium text-green-900">✓ Video selected: {formData.videoTitle}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Logos */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Logos</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <PhotoIcon className="h-4 w-4 inline mr-1" />
                              Client Logo URL (Optional)
                            </label>
                            <input
                              type="url"
                              value={formData.clientLogoUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, clientLogoUrl: e.target.value }))}
                              placeholder="https://example.com/client-logo.png"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <PhotoIcon className="h-4 w-4 inline mr-1" />
                              Company Logo URL (Critical River)
                            </label>
                            <input
                              type="url"
                              value={formData.companyLogoUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, companyLogoUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Colors */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Brand Colors</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                            <input
                              type="color"
                              value={formData.primaryColor}
                              onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                              className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 mt-1">{formData.primaryColor}</span>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                            <input
                              type="color"
                              value={formData.secondaryColor}
                              onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                              className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 mt-1">{formData.secondaryColor}</span>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Text on Gradient</label>
                            <input
                              type="color"
                              value={formData.textOnGradient}
                              onChange={(e) => setFormData(prev => ({ ...prev, textOnGradient: e.target.value }))}
                              className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 mt-1">{formData.textOnGradient}</span>
                          </div>
                        </div>
                      </div>

                      {/* Company Info */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Company Information</h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                              <input
                                type="text"
                                value={formData.companyName}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
                              <input
                                type="text"
                                value={formData.senderName}
                                onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sender Title</label>
                            <input
                              type="text"
                              value={formData.senderTitle}
                              onChange={(e) => setFormData(prev => ({ ...prev, senderTitle: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                            <input
                              type="text"
                              value={formData.companyAddress}
                              onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                              <input
                                type="text"
                                value={formData.companyCity}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyCity: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                              <input
                                type="text"
                                value={formData.companyState}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyState: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                              <input
                                type="text"
                                value={formData.companyZip}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyZip: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                              <input
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                              <input
                                type="tel"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Social Media */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Social Media Links</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                            <input
                              type="url"
                              value={formData.linkedInUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, linkedInUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                            <input
                              type="url"
                              value={formData.twitterUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, twitterUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                            <input
                              type="url"
                              value={formData.facebookUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, facebookUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
                            <input
                              type="url"
                              value={formData.youtubeUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Legal Links */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Legal Links</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unsubscribe URL</label>
                            <input
                              type="url"
                              value={formData.unsubscribeUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, unsubscribeUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy URL</label>
                            <input
                              type="url"
                              value={formData.privacyPolicyUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, privacyPolicyUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="w-1/2 bg-gray-50 p-6 overflow-y-auto">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Live Preview</h3>
                      <p className="text-sm text-gray-600">See your changes in real-time</p>
                    </div>
                    <div
                      className="bg-white rounded-lg shadow-lg"
                      dangerouslySetInnerHTML={{ __html: generateUpdatedHTML() }}
                    />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-black rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
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
