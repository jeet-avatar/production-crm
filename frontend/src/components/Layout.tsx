import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import type { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient decorations */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: '-15%',
          left: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          top: '40%',
          left: '50%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
        }}
      />

      {/* Sidebar */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Main content — offset for floating sidebar (16rem + 24px margin) */}
      <main style={{ marginLeft: 'calc(16rem + 36px)', padding: '12px 24px 24px 12px' }}>
        <Outlet />
      </main>
    </div>
  );
}
