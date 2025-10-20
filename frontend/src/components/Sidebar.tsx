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
  EnvelopeIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  SparklesIcon,
  VideoCameraIcon,
  ShieldCheckIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { Logo } from './Logo';
import type { User } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onOpenChat?: () => void;
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
  { name: 'Video Campaigns', href: '/video-campaigns', icon: VideoCameraIcon },
  { name: 'Email Templates', href: '/email-templates', icon: EnvelopeIcon },
  { name: 'Team', href: '/team', icon: UserCircleIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar({ user, onLogout, onOpenChat }: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r-2 border-gray-200 flex flex-col shadow-lg">
      {/* BrandMonkz Logo */}
      <div className="flex items-center py-6 px-4 border-b-2 border-gray-200">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1.5 px-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-black shadow-lg shadow-orange-500/30 scale-105'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-rose-50 hover:text-orange-600 hover:shadow-sm hover:scale-105 border border-transparent hover:border-gray-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
                <span className="font-semibold text-sm">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Super Admin Link - Only for ethan@brandmonkz.com */}
        {user.email === 'ethan@brandmonkz.com' && (
          <>
            <div className="my-4 border-t border-gray-200"></div>
            <NavLink
              to="/super-admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 scale-105'
                    : 'text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 hover:shadow-sm hover:scale-105 border border-transparent hover:border-red-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <ShieldCheckIcon className={`h-5 w-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
                  <span className="font-semibold text-sm">Super Admin</span>
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* AI ChatGPT Button - Positioned below Super Admin for ethan */}
      {user.email === 'ethan@brandmonkz.com' && onOpenChat && (
        <div className="px-4 py-3">
          <button
            onClick={onOpenChat}
            className="w-full flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-rose-600 text-black rounded-xl shadow-lg hover:shadow-xl hover:scale-105 hover:from-orange-700 hover:to-rose-700 transition-all duration-200 cursor-pointer"
            title="ChatGPT AI Assistant - Campaign & Contact Help"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="font-semibold text-sm">AI Assistant</span>
            <SparklesIcon className="w-4 h-4 ml-auto animate-pulse" />
          </button>
        </div>
      )}

      {/* User Profile Section */}
      <div className="border-t-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white">
        <div className="p-4">
          {/* User Info Card */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-3 mb-3 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-600 to-rose-600 flex items-center justify-center shadow-md">
                  <span className="text-black font-bold text-sm">
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-600 truncate font-medium">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 border-2 border-red-600 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
