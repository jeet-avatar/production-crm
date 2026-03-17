import { NavLink } from 'react-router-dom';
import {
  ChartPieIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ChartBarSquareIcon,
  TagIcon,
  MegaphoneIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import type { User } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartPieIcon },
  { name: 'Contacts', href: '/contacts', icon: UserGroupIcon },
  { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
  { name: 'Deals', href: '/deals', icon: ChartBarIcon },
  { name: 'Activities', href: '/activities', icon: ClipboardDocumentListIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarSquareIcon },
  { name: 'Tags', href: '/tags', icon: TagIcon },
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar({ user, onLogout }: SidebarProps) {
  return (
    <div
      className="fixed flex flex-col"
      style={{
        left: '12px',
        top: '12px',
        width: '16rem',
        height: 'calc(100vh - 24px)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 30,
      }}
    >
      {/* Logo Section */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div className="flex items-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
            }}
          >
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-3">
            <span
              className="text-xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #818CF8, #A78BFA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              BrandMonkz
            </span>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>CRM Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer group transition-all duration-200"
            style={({ isActive }) => ({
              borderRadius: '12px',
              background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              color: isActive ? '#818CF8' : 'var(--text-secondary)',
              boxShadow: isActive ? '0 0 12px rgba(99, 102, 241, 0.1)' : 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
                <span className="font-medium text-sm">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="p-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
        {/* User Info */}
        <div
          className="rounded-xl p-3 mb-2"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                }}
              >
                <span className="text-white font-bold text-xs">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95"
          style={{
            borderRadius: '12px',
            background: 'transparent',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            color: '#F87171',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.3)';
          }}
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
