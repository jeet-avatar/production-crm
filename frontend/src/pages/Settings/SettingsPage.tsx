import { useState, useEffect } from 'react';
import {
  UserCircleIcon,
  EnvelopeIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CreditCardIcon,
  KeyIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  PhoneIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

type SettingsTab = 'profile' | 'account' | 'notifications' | 'security' | 'preferences' | 'billing' | 'integrations';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  timezone: string;
  role: string;
  avatar?: string;
  emailNotifications?: boolean;
  dealUpdates?: boolean;
  newContacts?: boolean;
  weeklyReport?: boolean;
  marketingEmails?: boolean;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  theme?: string;
  compactView?: boolean;
}

export function SettingsPage() {
  const { gradients } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    timezone: 'America/New_York',
    avatar: '',
  });

  // Account settings
  const [accountData, setAccountData] = useState({
    forwardingEmail: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    dealUpdates: true,
    newContacts: false,
    weeklyReport: true,
    marketingEmails: false,
  });

  // Session information
  const [sessionInfo, setSessionInfo] = useState({
    browser: '',
    os: '',
    location: '',
  });

  // Display preferences
  const [displayPreferences, setDisplayPreferences] = useState({
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    theme: 'light',
    compactView: false,
    timezone: 'America/New_York',
  });

  // Billing & Pricing Plans
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);

  // Integrations
  const [googleVoiceNumber, setGoogleVoiceNumber] = useState('');
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [showGoogleVoiceGuide, setShowGoogleVoiceGuide] = useState(false);

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
    detectSessionInfo();
    fetchPricingPlans();
    fetchCurrentSubscription();
  }, []);

  const detectSessionInfo = () => {
    // Detect browser
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect OS
    let os = 'Unknown';
    if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    setSessionInfo({
      browser,
      os,
      location: 'Location unavailable', // We'd need a geolocation API for this
    });
  };

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
        role: user.role || '',
        timezone: user.timezone || 'America/New_York',
        avatar: user.avatar || '',
      });

      // Load notification preferences from user data
      if (user.emailNotifications !== undefined) {
        setNotifications({
          emailNotifications: user.emailNotifications ?? true,
          dealUpdates: user.dealUpdates ?? true,
          newContacts: user.newContacts ?? false,
          weeklyReport: user.weeklyReport ?? true,
          marketingEmails: user.marketingEmails ?? false,
        });
      }

      // Load Google Voice number from user data
      if (user.googleVoiceNumber) {
        setGoogleVoiceNumber(user.googleVoiceNumber);
      }

      // Load display preferences from user data
      if (user.language !== undefined) {
        setDisplayPreferences({
          language: user.language ?? 'en',
          dateFormat: user.dateFormat ?? 'MM/DD/YYYY',
          timeFormat: user.timeFormat ?? '12h',
          theme: user.theme ?? 'light',
          compactView: user.compactView ?? false,
          timezone: user.timezone ?? 'America/New_York',
        });
      }
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
      const response = await fetch(`${apiUrl}/api/users/me/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      const data = await response.json();
      alert(data.message || 'Notification preferences updated!');
    } catch (err: any) {
      console.error('Error updating notifications:', err);
      alert('Failed to update notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/me/account`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forwardingEmail: accountData.forwardingEmail,
        }),
      });

      if (!response.ok) throw new Error('Failed to update account settings');

      alert('Account settings updated successfully!');
    } catch (err: any) {
      console.error('Error updating account settings:', err);
      alert('Failed to update account settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete account');

      alert('Account deleted successfully. You will be logged out.');
      localStorage.removeItem('crmToken');
      localStorage.removeItem('crmUser');
      window.location.href = '/login';
    } catch (err: any) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDisplayPreferences = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/me/display-preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(displayPreferences),
      });

      if (!response.ok) throw new Error('Failed to update display preferences');

      const data = await response.json();
      alert(data.message || 'Preferences updated successfully!');
    } catch (err: any) {
      console.error('Error updating display preferences:', err);
      alert('Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchPricingPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/pricing/config`);

      if (!response.ok) throw new Error('Failed to fetch pricing plans');

      const data = await response.json();
      setPricingPlans(data.plans || []);
    } catch (err: any) {
      console.error('Error fetching pricing plans:', err);
      // Set empty array if API fails - show error to user instead of outdated fallback
      setPricingPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);

        // Set current plan from subscription
        if (data.subscription) {
          setCurrentPlan({
            name: data.subscription.planName || 'Free',
            status: data.subscription.status || 'active',
            nextBillingDate: data.subscription.nextBillingDate,
            amount: data.subscription.amount,
            interval: data.subscription.interval,
          });
        } else {
          // Default to free plan
          setCurrentPlan({
            name: 'Free',
            status: 'active',
            nextBillingDate: null,
          });
        }
      } else {
        // Default to free plan if no subscription found
        setCurrentPlan({
          name: 'Free',
          status: 'active',
          nextBillingDate: null,
        });
      }
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      // Default to free plan on error
      setCurrentPlan({
        name: 'Free',
        status: 'active',
        nextBillingDate: null,
      });
    }
  };

  const handleUpgrade = async (plan: any) => {
    try {
      setIsSaving(true);

      // Handle Free plan - no Stripe checkout needed
      if (plan.id === 'free' || plan.monthlyPrice === 0) {
        alert('You are already on the Free plan. Choose a paid plan to upgrade.');
        setIsSaving(false);
        return;
      }

      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const priceId = billingCycle === 'monthly' ? plan.stripeMonthlyPriceId : plan.stripeAnnualPriceId;

      const response = await fetch(`${apiUrl}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          billingCycle,
          planId: plan.id,
          planName: plan.name,
        }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      alert('Failed to start checkout process. Please try again.');
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
    { id: 'integrations' as SettingsTab, name: 'Integrations', icon: PhoneIcon },
    { id: 'billing' as SettingsTab, name: 'Billing', icon: CreditCardIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradients.brand.primary.gradient} flex items-center justify-center shadow-xl`}>
              <UserCircleIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Settings
              </h1>
              <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        {/* Top Tab Navigation - Super Admin Style */}
        <div className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              // Get gradient classes from dynamic theme
              const tabGradient = gradients.pages.settings[tab.id as keyof typeof gradients.pages.settings];
              const gradientClass = `bg-gradient-to-r ${tabGradient.gradient}`;
              const shadowClass = tabGradient.shadow;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-200 text-black ${gradientClass} ${
                    activeTab === tab.id
                      ? `shadow-lg ${shadowClass}`
                      : 'opacity-60 hover:opacity-80 shadow-md'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div>
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
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveAccount(); }}>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Email Configuration</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Email</label>
                        <input
                          type="email"
                          value={profileData.email || ''}
                          className="input bg-gray-50 cursor-not-allowed"
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">This is your login email and cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Forwarding Email</label>
                        <input
                          type="email"
                          value={accountData.forwardingEmail}
                          onChange={(e) => setAccountData({ ...accountData, forwardingEmail: e.target.value })}
                          placeholder="forward@example.com"
                          className="input"
                        />
                        <p className="text-xs text-gray-500 mt-1">Forward notifications to this email</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Account Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">User ID</div>
                          <div className="text-xs text-gray-600 font-mono">{profileData.email ? profileData.email.split('@')[0] : 'N/A'}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Account Role</div>
                          <div className="text-xs text-gray-600 capitalize">{profileData.role || 'Member'}</div>
                        </div>
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

                  <div className="flex justify-end pt-6 border-t border-gray-100">
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Account Settings'}
                    </button>
                  </div>
                </form>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-medium text-red-600 mb-4">Danger Zone</h3>
                  <div className="border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Delete Account</div>
                        <div className="text-xs text-gray-600">Permanently delete your account and all data</div>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                      >
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
                          <div className="text-xs text-gray-600">
                            {sessionInfo.os} • {sessionInfo.browser} • {sessionInfo.location}
                          </div>
                        </div>
                        <span className="text-xs text-green-600 font-medium">Active Now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="card">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Display Preferences</h2>
                <p className="text-sm text-gray-600 mt-1">Customize how you interact with the application</p>
              </div>
              <div className="p-6">
                <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSaveDisplayPreferences(); }}>
                  {/* Language & Region */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Language & Region</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Language</label>
                        <select
                          value={displayPreferences.language}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, language: e.target.value })}
                          className="input"
                        >
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="fr">Français</option>
                          <option value="de">Deutsch</option>
                          <option value="pt">Português</option>
                          <option value="zh">中文</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Select your preferred language for the interface</p>
                      </div>

                      <div>
                        <label className="label">Timezone</label>
                        <select
                          value={displayPreferences.timezone}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, timezone: e.target.value })}
                          className="input"
                        >
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="America/Phoenix">Arizona</option>
                          <option value="America/Anchorage">Alaska</option>
                          <option value="Pacific/Honolulu">Hawaii</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Paris">Paris (CET)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Australia/Sydney">Sydney (AEDT)</option>
                          <option value="UTC">UTC</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">All times will be displayed in this timezone</p>
                      </div>

                      <div>
                        <label className="label">Date Format</label>
                        <select
                          value={displayPreferences.dateFormat}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, dateFormat: e.target.value })}
                          className="input"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
                          <option value="MMM DD, YYYY">MMM DD, YYYY (Dec 31, 2025)</option>
                          <option value="DD MMM YYYY">DD MMM YYYY (31 Dec 2025)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Choose how dates are displayed throughout the app</p>
                      </div>

                      <div>
                        <label className="label">Time Format</label>
                        <select
                          value={displayPreferences.timeFormat}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, timeFormat: e.target.value })}
                          className="input"
                        >
                          <option value="12h">12-hour (2:30 PM)</option>
                          <option value="24h">24-hour (14:30)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Select your preferred time format</p>
                      </div>
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Appearance</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Theme</label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setDisplayPreferences({ ...displayPreferences, theme: 'light' })}
                            className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                              displayPreferences.theme === 'light'
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="w-12 h-12 bg-white border-2 border-gray-300 rounded mb-2"></div>
                            <span className="text-sm font-medium text-gray-900">Light</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDisplayPreferences({ ...displayPreferences, theme: 'dark' })}
                            className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                              displayPreferences.theme === 'dark'
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded mb-2"></div>
                            <span className="text-sm font-medium text-gray-900">Dark</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDisplayPreferences({ ...displayPreferences, theme: 'system' })}
                            className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                              displayPreferences.theme === 'system'
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="w-12 h-12 bg-gradient-to-br from-white to-gray-800 border-2 border-gray-400 rounded mb-2"></div>
                            <span className="text-sm font-medium text-gray-900">System</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Choose your color theme preference (Note: Dark mode coming soon)</p>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Compact View</div>
                          <div className="text-xs text-gray-600">Reduce spacing and show more content</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={displayPreferences.compactView}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, compactView: e.target.checked })}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                      </div>
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

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="card">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
                <p className="text-sm text-gray-600 mt-1">Connect external services to enhance your CRM</p>
              </div>
              <div className="p-6 space-y-8">
                {/* Google Voice Integration */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <PhoneIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Google Voice (FREE)</h3>
                        <p className="text-sm text-gray-600">Make calls & send SMS FREE - No Twilio required!</p>
                      </div>
                    </div>
                    {googleVoiceNumber ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckIcon className="h-4 w-4" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    {/* Show setup guide if no number configured */}
                    {!googleVoiceNumber && (
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                              <PhoneIcon className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 mb-2">
                              🎉 Get Your FREE Google Voice Number in 2 Minutes!
                            </h4>
                            <p className="text-sm text-gray-700 mb-4">
                              Get a free phone number for calls and SMS. No credit card required. Takes less than 2 minutes!
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowGoogleVoiceGuide(true)}
                              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Get FREE Google Voice Number Now
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Google Voice Number
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="tel"
                          value={googleVoiceNumber}
                          onChange={(e) => setGoogleVoiceNumber(e.target.value)}
                          placeholder="Enter your Google Voice number (e.g., +1 234 567 8900)"
                          className="input flex-1"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setIsSaving(true);
                              // Save Google Voice number to user profile
                              const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
                                method: 'PUT',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('crmToken')}`,
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ googleVoiceNumber }),
                              });

                              if (!response.ok) {
                                const errorData = await response.json();
                                console.error('Failed to save Google Voice number:', errorData);
                                throw new Error(errorData.message || 'Failed to save');
                              }

                              const data = await response.json();
                              console.log('✅ Google Voice number saved:', data);
                              alert('✅ Google Voice number saved successfully! You can now use FREE calls and SMS.');
                            } catch (err: any) {
                              console.error('Error saving Google Voice number:', err);
                              alert(`❌ Failed to save Google Voice number: ${err.message}`);
                            } finally {
                              setIsSaving(false);
                            }
                          }}
                          className="btn-primary whitespace-nowrap"
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        📱 Don't have a Google Voice number? <a href="https://voice.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Get one for free</a>
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">✨ Features (Completely FREE):</h4>
                      <ul className="text-sm text-gray-600 space-y-1.5">
                        <li>📞 <strong>Free Calls:</strong> Click "Make Call" on any contact - opens Google Voice</li>
                        <li>💬 <strong>Free SMS:</strong> Click "Send SMS" - opens Google Messages with message pre-filled</li>
                        <li>📝 <strong>Auto Logging:</strong> All calls & messages automatically logged in CRM</li>
                        <li>🚫 <strong>No Twilio Needed:</strong> Save $1/month + $0.0075 per SMS</li>
                        <li>✅ <strong>Works Everywhere:</strong> Desktop (voice.google.com) & Mobile (Google Voice app)</li>
                      </ul>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">💰 Cost Comparison:</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="font-bold text-green-900">Google Voice</p>
                          <p className="text-green-700 mt-1">$0/month</p>
                          <p className="text-green-700">$0 per SMS</p>
                          <p className="text-green-700">$0 per call</p>
                          <p className="font-medium text-green-900 mt-2">= FREE FOREVER</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="font-bold text-red-900">Twilio</p>
                          <p className="text-red-700 mt-1">$1/month</p>
                          <p className="text-red-700">$0.0075 per SMS</p>
                          <p className="text-red-700">$0.014 per min call</p>
                          <p className="font-medium text-red-900 mt-2">= $$$ adds up fast</p>
                        </div>
                      </div>
                    </div>

                    {googleVoiceNumber && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-blue-900">Your Google Voice number is connected!</p>
                            <p className="text-blue-700 mt-1">Number: {googleVoiceNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Google Calendar Integration */}
                <div className="border-t border-gray-200 pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Google Calendar</h3>
                        <p className="text-sm text-gray-600">Sync meetings and activities with your Google Calendar</p>
                      </div>
                    </div>
                    {googleCalendarConnected ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckIcon className="h-4 w-4" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    {!googleCalendarConnected ? (
                      <>
                        <p className="text-sm text-gray-600">
                          Connect your Google Calendar to automatically sync meetings, create calendar events, and send invitations.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `${import.meta.env.VITE_API_URL}/api/calendar/google/connect`;
                          }}
                          className="btn-primary"
                        >
                          Connect Google Calendar
                        </button>
                      </>
                    ) : (
                      <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                        <div className="flex gap-3">
                          <CheckIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-green-900">Google Calendar is connected!</p>
                            <p className="text-green-700 mt-1">Meetings and activities are automatically synced</p>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm('Are you sure you want to disconnect Google Calendar?')) {
                                  try {
                                    await fetch(`${import.meta.env.VITE_API_URL}/api/calendar/google/disconnect`, {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('crmToken')}`,
                                        'Content-Type': 'application/json',
                                      },
                                    });
                                    setGoogleCalendarConnected(false);
                                    alert('✅ Google Calendar disconnected');
                                  } catch (err) {
                                    alert('❌ Failed to disconnect');
                                  }
                                }
                              }}
                              className="text-sm text-green-700 hover:text-green-800 underline mt-2"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Coming Soon: Other Integrations */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 opacity-60">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <SparklesIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Zoom</h4>
                          <p className="text-xs text-gray-600">Video conferencing</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 opacity-60">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <EnvelopeIcon className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Gmail</h4>
                          <p className="text-xs text-gray-600">Email integration</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current Plan Section */}
              <div className="card">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage your subscription and billing</p>
                </div>
                <div className="p-6">
                  {!currentPlan ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                      <p className="text-gray-600 mt-4">Loading subscription...</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-orange-50 to-rose-50 rounded-lg border border-primary-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                          <CreditCardIcon className="h-8 w-8 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{currentPlan.name} Plan</h3>
                          {currentPlan.amount && currentPlan.interval ? (
                            <p className="text-sm text-gray-600">
                              ${(currentPlan.amount / 100).toFixed(2)}/{currentPlan.interval === 'month' ? 'month' : 'year'}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600">Free - No payment required</p>
                          )}
                          {currentPlan.nextBillingDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Next billing: {new Date(currentPlan.nextBillingDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          currentPlan.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : currentPlan.status === 'past_due'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {currentPlan.status === 'active' ? '✓ Active' : currentPlan.status?.replace('_', ' ') || 'Active'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Plans Section */}
              <div className="card">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Available Plans</h2>
                      <p className="text-sm text-gray-600 mt-1">Upgrade or change your plan anytime</p>
                    </div>
                    {/* Billing Cycle Toggle */}
                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          billingCycle === 'monthly'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          billingCycle === 'annual'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Annual
                        <span className="ml-2 text-xs text-green-600 font-semibold">Save 17%</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {isLoadingPlans ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                      <p className="text-gray-600 mt-4">Loading pricing plans...</p>
                    </div>
                  ) : pricingPlans.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-red-600 font-semibold mb-2">Failed to load pricing plans</p>
                      <p className="text-gray-600 mb-4">Please try refreshing the page</p>
                      <button
                        onClick={fetchPricingPlans}
                        className="px-4 py-2 bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-lg hover:from-orange-700 hover:to-rose-700"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {pricingPlans.map((plan) => {
                        // Get dynamic gradient for this plan
                        const planGradient = gradients.pages.pricing[plan.id as keyof typeof gradients.pages.pricing];
                        const headerGradientClass = planGradient ? `bg-gradient-to-r ${planGradient.gradient}` : 'bg-gradient-to-r from-gray-500 to-gray-700';
                        const buttonGradientClass = planGradient ? `bg-gradient-to-r ${planGradient.gradient} ${planGradient.hover}` : 'bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700';

                        return (
                        <div
                          key={plan.id}
                          className={`relative rounded-2xl overflow-visible transition-all hover:shadow-xl hover:-translate-y-1 ${
                            plan.popular ? 'shadow-lg mt-8' : 'shadow-md mt-8'
                          } flex flex-col`}
                        >
                          {/* Most Popular Badge */}
                          {plan.popular && (
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                              <span className={`bg-gradient-to-r ${planGradient?.gradient || gradients.semantic.premium.gradient} text-white px-6 py-2 rounded-full text-xs font-bold shadow-xl whitespace-nowrap`}>
                                ⭐ Most Popular
                              </span>
                            </div>
                          )}

                          {/* Gradient Header - Dynamic from database */}
                          <div className={`px-6 py-8 text-black text-center flex-shrink-0 rounded-t-2xl ${headerGradientClass}`}>
                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                            <p className="text-sm opacity-90 mb-4">{plan.description}</p>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-5xl font-bold">
                                ${billingCycle === 'monthly' ? plan.monthlyPrice : Math.floor(plan.annualPrice / 12)}
                              </span>
                              <span className="text-lg opacity-90">/mo</span>
                            </div>
                            {billingCycle === 'annual' && plan.annualPrice > 0 && (
                              <p className="text-xs opacity-75 mt-2">
                                Billed ${plan.annualPrice} annually
                              </p>
                            )}
                          </div>

                          {/* White Card Body */}
                          <div className="bg-white p-6 flex-1 flex flex-col">
                            <ul className="space-y-2 mb-6 flex-1 max-h-96 overflow-y-auto pr-2">
                            {plan.features.map((feature: any, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                {feature.included ? (
                                  <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XMarkIcon className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                                )}
                                <span className={feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}>
                                  {feature.text}
                                </span>
                              </li>
                            ))}
                          </ul>

                            <button
                              onClick={() => handleUpgrade(plan)}
                              disabled={isSaving}
                              className={`w-full py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg mt-auto text-white disabled:opacity-50 disabled:cursor-not-allowed ${buttonGradientClass}`}
                            >
                              {isSaving ? 'Processing...' : plan.buttonText}
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="card">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage your payment information</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="h-6 w-6 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">No payment method on file</div>
                        <div className="text-xs text-gray-600">Add a payment method when you upgrade</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Voice Setup Guide Modal */}
      {showGoogleVoiceGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Get Your FREE Google Voice Number</h2>
                <p className="text-sm text-gray-600 mt-1">Takes less than 2 minutes • No credit card required</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleVoiceGuide(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Visit Google Voice</h3>
                  <p className="text-gray-700 mb-3">
                    Open a new tab and go to <strong>voice.google.com</strong>
                  </p>
                  <a
                    href="https://voice.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Google Voice
                  </a>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      💡 <strong>Tip:</strong> Make sure you're signed in to your Google account
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Your Number</h3>
                  <p className="text-gray-700 mb-3">
                    Click <strong>"Get a Voice number"</strong> and search for a number by:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Area code (e.g., 415, 212, 310)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>City name</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Specific digits you want</span>
                    </li>
                  </ul>
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      🎯 <strong>Pro Tip:</strong> Pick a number in your local area code for better deliverability
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Setup</h3>
                  <p className="text-gray-700 mb-3">
                    Google will ask for a <strong>forwarding number</strong> (your real phone):
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">📱</span>
                      <span>Enter your mobile number</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">✉️</span>
                      <span>Verify with the code sent via SMS</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">✅</span>
                      <span>Click "Finish" - you're done!</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Copy Your Number</h3>
                  <p className="text-gray-700 mb-3">
                    After setup, copy your new Google Voice number. It will look like:
                  </p>
                  <div className="p-4 bg-gray-100 rounded-lg font-mono text-lg text-center">
                    +1 (555) 123-4567
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Make sure to include the <strong>+1</strong> country code!
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    5
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Add to BrandMonkz CRM</h3>
                  <p className="text-gray-700 mb-3">
                    Come back to this page and:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600">1.</span>
                      <span>Paste your Google Voice number in the input field above</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600">2.</span>
                      <span>Click "Save"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600">3.</span>
                      <span>Start making FREE calls and sending FREE SMS!</span>
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => setShowGoogleVoiceGuide(false)}
                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-orange-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                  >
                    Got it! Close Guide
                  </button>
                </div>
              </div>

              {/* Bonus Benefits */}
              <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-200">
                <h4 className="font-bold text-gray-900 mb-3">🎁 Bonus: What You Get FREE</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-gray-700">Unlimited SMS</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-gray-700">Unlimited calling (US/Canada)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-gray-700">Voicemail transcription</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-gray-700">Call screening</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-gray-700">Spam filtering</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-gray-700">Mobile & desktop apps</span>
                  </div>
                </div>
                <p className="mt-4 text-center text-lg font-bold text-green-800">
                  💰 Total Value: $102/year • Your Cost: $0 FOREVER
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
