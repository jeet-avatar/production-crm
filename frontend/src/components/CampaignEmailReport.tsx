import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ServerIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface EmailLogEntry {
  id: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  serverUsed: string | null;
  messageId: string | null;
  spamScore: number | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
  } | null;
}

interface Props {
  campaignId: string;
  campaignName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CampaignEmailReport({ campaignId, campaignName, isOpen, onClose }: Props) {
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadEmailLogs();
    }
  }, [isOpen, campaignId]);

  const loadEmailLogs = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/campaigns/${campaignId}/email-logs`);
      const data = await response.json();
      setEmailLogs(data.emailLogs || []);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      SENT: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon },
      DELIVERED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircleIcon },
      OPENED: { bg: 'bg-purple-100', text: 'text-purple-700', icon: EyeIcon },
      CLICKED: { bg: 'bg-orange-100', text: 'text-orange-700', icon: CursorArrowRaysIcon },
      BOUNCED: { bg: 'bg-red-100', text: 'text-red-700', icon: ExclamationCircleIcon },
      PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', icon: ClockIcon },
      FAILED: { bg: 'bg-red-100', text: 'text-red-700', icon: ExclamationCircleIcon },
    };
    const config = badges[status] || badges.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        <Icon className="h-4 w-4" />
        {status}
      </span>
    );
  };

  const filteredLogs = emailLogs.filter(log => {
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesSearch =
      searchQuery === '' ||
      log.toEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.company?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter(l => l.status === 'SENT' || l.status === 'DELIVERED').length,
    opened: emailLogs.filter(l => l.status === 'OPENED').length,
    clicked: emailLogs.filter(l => l.status === 'CLICKED').length,
    bounced: emailLogs.filter(l => l.status === 'BOUNCED').length,
    failed: emailLogs.filter(l => l.status === 'FAILED').length,
  };

  // Group by server used
  const serverStats = emailLogs.reduce((acc, log) => {
    const server = log.serverUsed || 'Unknown';
    acc[server] = (acc[server] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border-4 border-gray-300 max-w-7xl w-full my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Email Delivery Report</h2>
              <p className="text-blue-100 text-lg">{campaignName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="border-b-2 border-gray-100 p-6 bg-gray-50 flex-shrink-0">
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
              <div className="text-xs text-gray-600 font-medium uppercase mb-1">Total</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <div className="text-xs text-green-700 font-medium uppercase mb-1">Sent</div>
              <div className="text-3xl font-bold text-green-600">{stats.sent}</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="text-xs text-purple-700 font-medium uppercase mb-1">Opened</div>
              <div className="text-3xl font-bold text-purple-600">{stats.opened}</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="text-xs text-orange-700 font-medium uppercase mb-1">Clicked</div>
              <div className="text-3xl font-bold text-orange-600">{stats.clicked}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
              <div className="text-xs text-red-700 font-medium uppercase mb-1">Bounced</div>
              <div className="text-3xl font-bold text-red-600">{stats.bounced}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-300">
              <div className="text-xs text-gray-600 font-medium uppercase mb-1">Failed</div>
              <div className="text-3xl font-bold text-gray-700">{stats.failed}</div>
            </div>
          </div>

          {/* Server Usage Stats */}
          {Object.keys(serverStats).length > 0 && (
            <div className="mt-4 bg-white rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <ServerIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Email Servers Used</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(serverStats).map(([server, count]) => (
                  <div key={server} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-semibold text-gray-900">{server}</span>
                    <span className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full">{count} emails</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filters & Search */}
        <div className="border-b-2 border-gray-100 p-6 bg-white flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              {['all', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterStatus === status
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, name, or company..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <button
              onClick={loadEmailLogs}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Email Logs Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <EnvelopeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No email logs found</h3>
              <p className="text-gray-600">No emails match your current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">From Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Server</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sent At</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Spam Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">
                              {log.contact.firstName[0]}{log.contact.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {log.contact.firstName} {log.contact.lastName}
                            </div>
                            <div className="text-sm text-gray-600">{log.toEmail || log.contact.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {log.company ? (
                          <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{log.company.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <EnvelopeIcon className="h-4 w-4 text-blue-500" />
                          <span>{log.fromEmail || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {log.serverUsed ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-medium text-blue-700">
                            <ServerIcon className="h-3 w-3" />
                            {log.serverUsed}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(log.status)}</td>
                      <td className="px-4 py-4">
                        {log.sentAt ? (
                          <div className="text-sm text-gray-700">
                            {new Date(log.sentAt).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not sent</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {log.spamScore !== null ? (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                            log.spamScore < 3 ? 'bg-green-100 text-green-700' :
                            log.spamScore < 5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            <ShieldCheckIcon className="h-3 w-3" />
                            {log.spamScore.toFixed(1)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {emailLogs.length} email logs
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default CampaignEmailReport;
