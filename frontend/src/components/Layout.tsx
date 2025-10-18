import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AIChat } from './AIChat';
import type { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar with AI Chat button */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        onOpenChat={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Main content - with proper margin to account for fixed sidebar */}
      <main className="ml-64">
        <Outlet />
      </main>

      {/* AI Chat Component (ChatGPT) */}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
