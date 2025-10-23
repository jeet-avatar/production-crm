import { useState, useEffect } from 'react';
import {
  UserCircleIcon,
  EnvelopeIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CreditCardIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

type SettingsTab = 'profile' | 'account' | 'notifications' | 'security' | 'preferences' | 'billing';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  googleVoiceNumber?: string;
  timezone: string;
  role: string;
  avatar?: string;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    googleVoiceNumber: '',
    role: '',
    timezone: 'America/New_York',
    avatar: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    dealUpdates: true,
    newContacts: false,
    weeklyReport: true,
    marketingEmails: false,
  });

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch user data');

      const data = await response.json();
      const user: UserData = data.user;

      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        googleVoiceNumber: user.googleVoiceNumber || '',
        role: user.role || '',
        timezone: user.timezone || 'America/New_York',
        avatar: user.avatar || '',
      });
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          googleVoiceNumber: profileData.googleVoiceNumber,
          timezone: profileData.timezone,
        }),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const data = await response.json();
      alert(data.message || 'Profile updated successfully!');

      // Refresh user data
      await fetchUserData();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      alert('Notification preferences updated!');
    } catch (err: any) {
      console.error('Error updating notifications:', err);
      alert('Failed to update notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, name: 'Profile', icon: UserCircleIcon },
    { id: 'account' as SettingsTab, name: 'Account', icon: EnvelopeIcon },
    { id: 'notifications' as SettingsTab, name: 'Notifications', icon: BellIcon },
    { id: 'security' as SettingsTab, name: 'Security', icon: ShieldCheckIcon },
    { id: 'preferences' as SettingsTab, name: 'Preferences', icon: GlobeAltIcon },
    { id: 'billing' as SettingsTab, name: 'Billing', icon: CreditCardIcon },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="card">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                <p className="text-sm text-gray-600 mt-1">Update your personal information</p>
              </div>
              <div className="p-6">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                      <UserCircleIcon className="h-12 w-12 text-gray-400" />
                    </div>
                    <div>
                      <button type="button" className="btn-secondary btn-sm">Change Photo</button>
                      <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max size 2MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="input bg-gray-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="input"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Google Voice Number</label>
                    <input
                      type="tel"
                      value={profileData.googleVoiceNumber}
                      onChange={(e) => setProfileData({ ...profileData, googleVoiceNumber: e.target.value })}
                      className="input"
                      placeholder="+1 (555) 987-6543"
                    />
                    <p className="text-xs text-gray-500 mt-1">Your Google Voice number for outbound calls and SMS</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <input
                      type="text"
                      value={profileData.role}
                      disabled
                      className="input bg-gray-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Role is managed by administrators</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={profileData.timezone}
                      onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                      className="input"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-100">
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="card">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your account configuration</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Email Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Email</label>
                      <input type="email" value="demo@example.com" className="input" disabled />
                      <p className="text-xs text-gray-500 mt-1">This is your login email and cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Forwarding Email</label>
                      <input type="email" placeholder="forward@example.com" className="input" />
                      <p className="text-xs text-gray-500 mt-1">Forward notifications to this email</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Account Status</h3>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Account Active</div>
                        <div className="text-xs text-gray-600">Your account is in good standing</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-medium text-red-600 mb-4">Danger Zone</h3>
                  <div className="border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Delete Account</div>
                        <div className="text-xs text-gray-600">Permanently delete your account and all data</div>
                      </div>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                <p className="text-sm text-gray-600 mt-1">Choose what notifications you want to receive</p>
              </div>
              <div className="p-6">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveNotifications(); }}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Email Notifications</div>
                        <div className="text-xs text-gray-600">Receive notifications via email</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emailNotifications}
                        onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Deal Updates</div>
                        <div className="text-xs text-gray-600">Get notified when deals change status</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.dealUpdates}
                        onChange={(e) => setNotifications({ ...notifications, dealUpdates: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">New Contacts</div>
                        <div className="text-xs text-gray-600">Alert when new contacts are added</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.newContacts}
                        onChange={(e) => setNotifications({ ...notifications, newContacts: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Weekly Report</div>
                        <div className="text-xs text-gray-600">Receive weekly activity summary</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.weeklyReport}
                        onChange={(e) => setNotifications({ ...notifications, weeklyReport: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Marketing Emails</div>
                        <div className="text-xs text-gray-600">Promotional and marketing content</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.marketingEmails}
                        onChange={(e) => setNotifications({ ...notifications, marketingEmails: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-100">
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage your password and security options</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                    <form className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                        <input type="password" className="input" placeholder="Enter current password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input type="password" className="input" placeholder="Enter new password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                        <input type="password" className="input" placeholder="Confirm new password" />
                      </div>
                      <button type="submit" className="btn-primary">Update Password</button>
                    </form>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">2FA Status</div>
                        <div className="text-xs text-gray-600">Add an extra layer of security</div>
                      </div>
                      <button className="btn-secondary btn-sm">Enable 2FA</button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Current Session</div>
                          <div className="text-xs text-gray-600">macOS • Chrome • New York, USA</div>
                        </div>
                        <span className="text-xs text-green-600 font-medium">Active Now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other tabs placeholder */}
          {(activeTab === 'preferences' || activeTab === 'billing') && (
            <div className="card">
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'preferences' && <GlobeAltIcon className="h-8 w-8 text-gray-400" />}
                  {activeTab === 'billing' && <CreditCardIcon className="h-8 w-8 text-gray-400" />}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2 capitalize">{activeTab} Settings</h3>
                <p className="text-gray-600">These settings will be available in a future update</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
