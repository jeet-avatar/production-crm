import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import type { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Main content - with proper margin to account for fixed sidebar */}
      <main className="ml-64">
        <Outlet />
      </main>
    </div>
  );
}
