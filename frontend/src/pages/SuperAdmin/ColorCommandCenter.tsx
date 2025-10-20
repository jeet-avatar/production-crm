import { useState, useEffect } from 'react';
import { SwatchIcon, SparklesIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import brandColors, { THEME_PRESETS, BRAND_COLORS, SEMANTIC_COLORS, PAGE_COLORS } from '../../config/brandColors';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * COLOR COMMAND CENTER - Super Admin Design System Control
 *
 * This is your central hub for managing all colors across the application.
 * Change theme presets here and they apply EVERYWHERE instantly.
 */

export function ColorCommandCenter() {
  const { gradients, refreshTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleApplyTheme = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');

      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Get the gradient configuration from brandColors based on selected theme
      const themeConfig = {
        name: THEME_PRESETS[selectedTheme as keyof typeof THEME_PRESETS].name,
        primaryColor: '#3B82F6',
        secondaryColor: '#8B5CF6',
        gradients: {
          brand: BRAND_COLORS,
          semantic: SEMANTIC_COLORS,
          pages: PAGE_COLORS,
        },
      };

      const response = await fetch(`${apiUrl}/api/ui-config/theme`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(themeConfig),
      });

      if (!response.ok) throw new Error('Failed to save theme');

      const data = await response.json();
      setSaveMessage('✅ Theme applied successfully! Refreshing...');

      // Refresh theme from server
      await refreshTheme();

      // Reload page to see changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error('Error applying theme:', error);
      setSaveMessage('❌ Failed to apply theme. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-rose-50/30 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-xl">
              <SwatchIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-rose-600 to-orange-700 bg-clip-text text-transparent">
                Color Command Center
              </h1>
              <p className="text-gray-600 mt-1">Centralized design system control - Change colors everywhere with one command</p>
            </div>
          </div>
        </div>

        {/* Theme Presets */}
        <div className="card mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-rose-600" />
              Theme Presets
            </h2>
            <p className="text-sm text-gray-600 mt-1">One-click theme changes that apply across ALL pages</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(THEME_PRESETS).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTheme(key)}
                  className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                    selectedTheme === key
                      ? 'border-rose-500 bg-rose-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {selectedTheme === key && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-rose-500 rounded-full flex items-center justify-center">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{theme.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{theme.description}</p>
                  <div className="flex gap-2">
                    {key === 'default' && (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-600 to-rose-600"></div>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-600 to-rose-600"></div>
                      </>
                    )}
                    {key === 'ocean' && (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600"></div>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600"></div>
                      </>
                    )}
                    {key === 'sunset' && (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-pink-600"></div>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-orange-600"></div>
                      </>
                    )}
                    {key === 'forest' && (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600"></div>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                      </>
                    )}
                    {key === 'royal' && (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-700"></div>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-violet-600 to-purple-700"></div>
                      </>
                    )}
                    {key === 'midnight' && (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-700 to-purple-800"></div>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-800 to-indigo-900"></div>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-rose-600 text-black rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-orange-700 hover:to-rose-700 transition-all"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  {previewMode ? 'Exit Preview' : 'Preview Theme'}
                </button>
                <button
                  onClick={handleApplyTheme}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckIcon className="w-5 h-5" />
                  {isSaving ? 'Applying...' : 'Apply Theme'}
                </button>
              </div>
              {saveMessage && (
                <div className={`p-4 rounded-lg ${saveMessage.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {saveMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Primary Brand Colors */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Brand Colors</h2>
              <p className="text-sm text-gray-600 mt-1">Core brand identity</p>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(BRAND_COLORS).map(([key, color]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{color.name}</h3>
                      <p className="text-xs text-gray-500">{color.description}</p>
                    </div>
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-r ${color.gradient} shadow-lg`}></div>
                  </div>
                  <div className="text-xs font-mono text-gray-600 bg-gray-50 rounded px-3 py-2">
                    {color.gradient}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semantic Colors */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Semantic Colors</h2>
              <p className="text-sm text-gray-600 mt-1">Functional meanings</p>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(SEMANTIC_COLORS).map(([key, color]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{color.name}</h3>
                      <p className="text-xs text-gray-500">{color.description}</p>
                    </div>
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-r ${color.gradient} shadow-lg`}></div>
                  </div>
                  <div className="text-xs font-mono text-gray-600 bg-gray-50 rounded px-3 py-2">
                    {color.gradient}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Page Colors */}
        <div className="card mb-6">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Settings Page Tab Colors</h2>
            <p className="text-sm text-gray-600 mt-1">Unique gradient for each settings section</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(PAGE_COLORS.settings).map(([key, color]) => (
                <div key={key} className="text-center">
                  <div className={`w-full h-24 rounded-lg bg-gradient-to-r ${color.gradient} shadow-lg mb-2`}></div>
                  <h3 className="font-semibold text-sm text-gray-900 capitalize">{key}</h3>
                  <p className="text-xs text-gray-500 mt-1">{color.description}</p>
                  <div className="text-xs font-mono text-gray-600 bg-gray-50 rounded px-2 py-1 mt-2">
                    {color.gradient}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard & Campaign Colors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dashboard Stats */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Dashboard Stats</h2>
              <p className="text-sm text-gray-600 mt-1">Stat card colors</p>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(PAGE_COLORS.dashboard).map(([key, color]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color.gradient} shadow-md`}></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 capitalize">{key}</h3>
                    <p className="text-xs text-gray-500">{color.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Campaign Stats</h2>
              <p className="text-sm text-gray-600 mt-1">Campaign metric colors</p>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(PAGE_COLORS.campaigns).map(([key, color]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${color.gradient} shadow-md`}></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 capitalize">{key}</h3>
                    <p className="text-xs text-gray-500">{color.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="card mt-6 bg-gradient-to-br from-orange-50 to-rose-50 border-2 border-orange-200">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📘 Implementation Guide</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How to use centralized colors:</h3>
                <code className="block bg-white rounded-lg p-4 text-xs font-mono text-gray-800 overflow-x-auto">
                  {`// Import the design system
import brandColors from '@/config/brandColors';

// Use in components
<button className={\`bg-gradient-to-r \${brandColors.brand.primary.gradient}\`}>
  Primary Button
</button>

// Or use utility functions
<button className={brandColors.utils.getButtonGradient('primary')}>
  Primary Button
</button>`}
                </code>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Change theme in one command:</h3>
                <code className="block bg-white rounded-lg p-4 text-xs font-mono text-gray-800">
                  {`// In brandColors.ts, change the BRAND_COLORS values
// Example: Switch to Ocean theme
export const BRAND_COLORS = {
  primary: {
    gradient: 'from-blue-500 to-cyan-600',
    // ... rest of config
  }
}

// ALL pages update automatically!`}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
