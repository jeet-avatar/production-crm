import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AIChat } from './AIChat';
import { Bars3Icon, SparklesIcon } from '@heroicons/react/24/outline';
import type { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-gray-900">BrandMonkz</span>
          </div>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        <div className="pt-16 lg:pt-0">
          <Outlet />
        </div>
      </main>

      {/* AI Chat Button */}
      <button
        type="button"
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center z-40"
        aria-label="AI Assistant"
        title="AI Assistant"
      >
        <SparklesIcon className="w-6 h-6" />
      </button>

      {/* AI Chat Component */}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
