import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MousePointer, Eye, TrendingUp, Users, Clock, MapPin, Monitor, Smartphone, Download, Send, BarChart3, Activity } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  sentAt: string;
}

interface Stats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  openRate: string;
  clickRate: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: { name: string } | null;
}

interface EmailLog {
  id: string;
  contact: Contact;
  status: string;
  sentAt: string;
  totalOpens: number;
  totalClicks: number;
  engagementScore: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  ipAddress: string | null;
  deviceType: string | null;
  emailClient: string | null;
  browser: string | null;
  location: string | null;
  recentEvents: any[];
}

interface TopPerformer {
  contact: Contact;
  engagementScore: number;
  opens: number;
  clicks: number;
  firstOpenedAt: string | null;
  firstClickedAt: string | null;
}

interface AnalyticsData {
  campaign: Campaign;
  stats: Stats;
  topPerformers: TopPerformer[];
  emailLogs: EmailLog[];
}

export default function CampaignAnalytics() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
    // Refresh every 10 seconds to get real-time updates
    const interval = setInterval(loadAnalytics, 10000);
    return () => clearInterval(interval);
  }, [campaignId]);

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/tracking/analytics/${campaignId}`);
      if (!response.ok) throw new Error('Failed to load analytics');
      const data = await response.json();
      setAnalytics(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-red-600">Error: {error || 'Analytics not found'}</div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, subtext, color }: any) => (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          {subtext && <div className="text-sm text-gray-500 mt-1">{subtext}</div>}
        </div>
      </div>
      <div className="text-sm text-gray-600 font-medium mt-2">{label}</div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/campaigns')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Back to Campaigns</span>
      </button>

      {/* Enhanced Campaign Header */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {analytics.campaign.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {analytics.campaign.subject}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Sent: {new Date(analytics.campaign.sentAt).toLocaleString()}
              </span>
            </div>

            {/* Campaign metadata */}
            <div className="flex gap-3 mt-4">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium uppercase">
                {analytics.campaign.status}
              </span>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Recipients: {analytics.stats.totalSent} contact{analytics.stats.totalSent !== 1 ? 's' : ''}
              </span>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Activity className="w-4 h-4" />
                Auto-refreshing every 10s
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-black rounded-lg hover:from-orange-700 hover:to-rose-700 transition-colors font-medium flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send Follow-up
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          icon={Mail}
          label="Total Sent"
          value={analytics.stats.totalSent}
          color="bg-gradient-to-r from-orange-500 to-rose-500"
        />
        <StatCard
          icon={Eye}
          label="Opened"
          value={analytics.stats.totalOpened}
          subtext={`${analytics.stats.openRate}% open rate`}
          color="bg-green-600"
        />
        <StatCard
          icon={MousePointer}
          label="Clicked"
          value={analytics.stats.totalClicked}
          subtext={`${analytics.stats.clickRate}% click rate`}
          color="bg-gradient-to-r from-orange-500 to-rose-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Bounced"
          value={analytics.stats.totalBounced}
          color="bg-red-600"
        />
      </div>

      {/* Top Performers */}
      {analytics.topPerformers.length > 0 && analytics.topPerformers[0].engagementScore > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Top Engaged Recipients
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.topPerformers.slice(0, 6).map((performer) => (
              <div key={performer.contact.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900">
                    {performer.contact.firstName} {performer.contact.lastName}
                  </div>
                  <div className="text-lg font-bold text-orange-600">
                    {performer.engagementScore}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">{performer.contact.email}</div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{performer.opens} opens</span>
                  <span>{performer.clicks} clicks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Email Logs Table */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Email Activity Details
          </h2>
          <span className="text-sm text-gray-500">
            {analytics.emailLogs.length} recipient{analytics.emailLogs.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Opens/Clicks
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  First Opened
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Device/Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Engagement
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.emailLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {log.contact.firstName} {log.contact.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{log.contact.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600">
                      {log.contact.company?.name || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'OPENED'
                          ? 'bg-green-100 text-green-700'
                          : log.status === 'CLICKED'
                          ? 'bg-rose-100 text-rose-700'
                          : log.status === 'SENT'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-green-500" />
                        <span className="font-semibold text-gray-900">{log.totalOpens}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MousePointer className="w-4 h-4 text-rose-500" />
                        <span className="font-semibold text-gray-900">{log.totalClicks}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600">
                      {log.firstOpenedAt ? (
                        <>
                          <div>{new Date(log.firstOpenedAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.firstOpenedAt).toLocaleTimeString()}
                          </div>
                        </>
                      ) : (
                        '-'
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {log.deviceType || log.emailClient ? (
                      <div className="text-sm">
                        {log.deviceType && (
                          <div className="flex items-center gap-1 text-gray-700">
                            {log.deviceType === 'mobile' ? (
                              <Smartphone className="w-3 h-3" />
                            ) : (
                              <Monitor className="w-3 h-3" />
                            )}
                            <span className="capitalize">{log.deviceType}</span>
                          </div>
                        )}
                        {log.emailClient && (
                          <div className="text-xs text-gray-500">{log.emailClient}</div>
                        )}
                        {log.browser && (
                          <div className="text-xs text-gray-500">{log.browser}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600">
                      {log.location || log.ipAddress ? (
                        <>
                          {log.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {log.location}
                            </div>
                          )}
                          {log.ipAddress && (
                            <div className="text-xs text-gray-500">{log.ipAddress}</div>
                          )}
                        </>
                      ) : (
                        '-'
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-[60px] h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            log.engagementScore >= 70
                              ? 'bg-gradient-to-r from-green-500 to-green-600'
                              : log.engagementScore >= 40
                              ? 'bg-gradient-to-r from-orange-500 to-rose-500'
                              : 'bg-gradient-to-r from-gray-400 to-gray-500'
                          }`}
                          style={{ width: `${log.engagementScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 min-w-[30px]">
                        {log.engagementScore}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {analytics.emailLogs.length === 0 && (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No email activity yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Analytics will appear here once recipients open the emails
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
