import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { AIChat } from '../components/AIChat';

interface DashboardStats {
  totalContacts: number;
  totalCompanies: number;
  totalDeals: number;
  totalRevenue: number;
  activeDeals: number;
  conversionRate: number;
  monthlyGrowth: number;
  recentActivities: Activity[];
  pipelineData: PipelineStage[];
  topDeals: TopDeal[];
  performance: PerformanceMetric[];
}

interface Activity {
  id: string;
  type: 'contact_created' | 'deal_updated' | 'company_added' | 'email_sent';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

interface PipelineStage {
  name: string;
  value: number;
  count: number;
  percentage: number;
  color: string;
}

interface TopDeal {
  id: string;
  company: string;
  value: number;
  stage: string;
  probability: number;
  owner: string;
}

interface PerformanceMetric {
  label: string;
  value: number;
  target: number;
  trend: number[];
}

const emptyStats: DashboardStats = {
  totalContacts: 0,
  totalCompanies: 0,
  totalDeals: 0,
  totalRevenue: 0,
  activeDeals: 0,
  conversionRate: 0,
  monthlyGrowth: 0,
  recentActivities: [],
  pipelineData: [],
  topDeals: [],
  performance: []
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconColor: string;
  delay?: number;
}

function StatCard({ title, value, change, trend, icon: Icon, gradient, iconColor, delay = 0 }: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`card bg-gradient-to-br ${gradient} hover:shadow-lg hover:-translate-y-1 transition-all duration-200 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconColor} flex items-center justify-center shadow-md`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend === 'up'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-rose-100 text-rose-700'
          }`}>
            {trend === 'up' ? (
              <ArrowTrendingUpIcon className="h-3 w-3" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3" />
            )}
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</p>
        <p className="text-4xl font-bold tracking-tight text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function CircularProgress({ percentage, size = 80 }: { percentage: number; size?: number }) {
  const circumference = 2 * Math.PI * (size / 2 - 5);
  const offset = circumference - (percentage / 100) * circumference;
  const isGood = percentage >= 80;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          stroke="#E5E7EB"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          stroke={isGood ? '#f97316' : '#f59e0b'}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${isGood ? 'text-orange-600' : 'text-amber-600'}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function Sparkline({ data, color = '#3B82F6' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  const width = 80;
  const height = 24;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { gradients } = useTheme();
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/dashboard');
      const data = await response.json();

      setStats({
        totalContacts: data.totalContacts || 0,
        totalCompanies: data.totalCompanies || 0,
        totalDeals: data.totalDeals || 0,
        totalRevenue: data.totalRevenue || 0,
        activeDeals: data.activeDeals || 0,
        conversionRate: data.conversionRate || 0,
        monthlyGrowth: data.monthlyGrowth || 0,
        recentActivities: data.recentActivities || [],
        pipelineData: data.pipelineData || [],
        topDeals: data.topDeals || [],
        performance: data.performance || []
      });

      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats(emptyStats);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'contact_created': return '👤';
      case 'deal_updated': return '💼';
      case 'company_added': return '🏢';
      case 'email_sent': return '📧';
      default: return '📝';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header with subtle shadow */}
      <div className="mb-8 pb-6 border-b border-gray-200 bg-white/50 backdrop-blur-sm -mx-8 px-8 -mt-8 pt-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients.brand.primary.gradient} flex items-center justify-center shadow-md`}>
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        </div>
        <p className="text-sm font-medium text-gray-700">Welcome back! Here's what's happening with your business today.</p>
      </div>

      {/* Main Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={CurrencyDollarIcon}
          gradient="from-orange-50 to-white"
          iconColor="bg-gradient-to-br from-orange-500 to-rose-500"
          delay={0}
        />
        <StatCard
          title="Active Deals"
          value={stats.activeDeals}
          icon={ChartBarIcon}
          gradient="from-orange-50 to-white"
          iconColor="bg-gradient-to-br from-orange-500 to-rose-500"
          delay={100}
        />
        <StatCard
          title="Total Contacts"
          value={formatNumber(stats.totalContacts)}
          icon={UserGroupIcon}
          gradient="from-orange-50 to-white"
          iconColor="bg-gradient-to-br from-orange-500 to-rose-500"
          delay={200}
        />
        <StatCard
          title="Companies"
          value={stats.totalCompanies}
          icon={BuildingOfficeIcon}
          gradient="from-orange-50 to-white"
          iconColor="bg-gradient-to-br from-orange-500 to-rose-500"
          delay={300}
        />
      </div>

      {/* Quick Actions Bar - Elegant and Less Tall */}
      <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-black rounded-xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-200`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RocketLaunchIcon className="h-6 w-6" />
            <div>
              <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
              <p className="text-xs font-medium text-white opacity-90">Get things done faster</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/contacts')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold rounded-xl border-2 border-black transition-all shadow-md hover:scale-105"
            >
              <UserGroupIcon className="h-5 w-5" />
              <span>Add Contact</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/companies')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold rounded-xl border-2 border-black transition-all shadow-md hover:scale-105"
            >
              <BuildingOfficeIcon className="h-5 w-5" />
              <span>Add Company</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/deals')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold rounded-xl border-2 border-black transition-all shadow-md hover:scale-105"
            >
              <BoltIcon className="h-5 w-5" />
              <span>Create Deal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Performance Metrics with Circular Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {stats.performance.map((metric, index) => {
          const percentage = (metric.value / metric.target) * 100;
          const isOnTarget = percentage >= 80;

          return (
            <div
              key={index}
              className={`card bg-white hover:shadow-lg transition-all duration-200 transform ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${400 + index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{metric.label}</h4>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">
                      {metric.label.includes('Revenue') ? formatCurrency(metric.value) : metric.value}
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      / {metric.label.includes('Revenue') ? formatCurrency(metric.target) : metric.target}
                    </span>
                  </div>
                  <Sparkline data={metric.trend} color={isOnTarget ? '#f97316' : '#f59e0b'} />
                </div>
                <CircularProgress percentage={percentage} />
              </div>
              <div className={`flex items-center gap-2 text-sm font-medium ${isOnTarget ? 'text-orange-600' : 'text-rose-600'}`}>
                {isOnTarget ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  <ClockIcon className="h-5 w-5" />
                )}
                <span>
                  {isOnTarget ? 'On Target' : 'Needs Attention'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Sales Pipeline with Horizontal Bar Chart */}
        <div className="lg:col-span-2 card bg-white shadow-sm hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                  <FireIcon className="h-5 w-5 text-white" />
                </div>
                Sales Pipeline
              </h3>
              <p className="text-xs font-medium text-gray-600 mt-1">Deal distribution by stage</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/deals')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold rounded-xl border-2 border-black transition-all shadow-md hover:scale-105"
            >
              <span>View All</span>
            </button>
          </div>

          {/* Horizontal Funnel */}
          <div className="mb-6">
            <div className="flex items-center h-12 rounded-xl overflow-hidden shadow-inner bg-gray-100">
              {stats.pipelineData.map((stage, index) => (
                <div
                  key={index}
                  className="h-full flex items-center justify-center text-white font-semibold text-sm transition-all duration-300 hover:brightness-110 cursor-pointer relative group"
                  style={{
                    width: `${stage.percentage}%`,
                    backgroundColor: stage.color
                  }}
                >
                  <span className="relative z-10">{stage.percentage}%</span>
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-1">
              {stats.pipelineData.map((stage, index) => (
                <div key={index} className="text-xs font-medium text-gray-600">
                  {stage.name}
                </div>
              ))}
            </div>
          </div>

          {/* Stage Details */}
          <div className="space-y-3">
            {stats.pipelineData.map((stage, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 cursor-pointer border border-gray-200 hover:border-gray-300 hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-3 h-3 rounded-full shadow-md"
                      style={{ backgroundColor: stage.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                    <span className="text-xs font-medium text-gray-600">({stage.count} deals)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-semibold text-gray-900">{formatCurrency(stage.value)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pipeline Value</span>
              <span className="text-4xl font-bold tracking-tight text-gray-900">
                {formatCurrency(stats.pipelineData.reduce((sum, stage) => sum + stage.value, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Top Deals with Company Initials */}
        <div className="card bg-white shadow-sm hover:shadow-lg transition-all duration-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
            Top Deals
          </h3>
          <div className="space-y-3">
            {stats.topDeals.map((deal, index) => {
              const dealGradients = [
                'from-orange-500 to-rose-500',
                'from-orange-400 to-rose-400',
                'from-orange-600 to-rose-600'
              ];
              const colors = [
                `bg-gradient-to-br ${dealGradients[0]}`,
                `bg-gradient-to-br ${dealGradients[1]}`,
                `bg-gradient-to-br ${dealGradients[2]}`
              ];
              const bgColors = ['bg-orange-50', 'bg-amber-50', 'bg-yellow-50'];

              return (
                <div
                  key={deal.id}
                  className={`p-4 rounded-xl ${bgColors[index]} hover:shadow-md transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-300 group`}
                  onClick={() => navigate('/deals')}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {/* Company Logo Placeholder */}
                    <div className={`w-12 h-12 rounded-xl ${colors[index]} flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform duration-200`}>
                      {getInitials(deal.company)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-orange-600 bg-white px-2 py-0.5 rounded-full shadow-sm">
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-medium text-gray-900">{deal.company}</h4>
                      </div>
                      <p className="text-xs font-medium text-gray-600">{deal.stage}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">{formatCurrency(deal.value)}</span>
                  </div>

                  {/* Probability Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-xs font-medium text-gray-600">Win Probability</span>
                      <span className="text-sm font-medium text-gray-900">{deal.probability}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${colors[index]} transition-all duration-500 shadow-sm`}
                        style={{ width: `${deal.probability}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Owner Avatar */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700">
                      {getInitials(deal.owner)}
                    </div>
                    <span className="text-xs text-gray-600">{deal.owner}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card bg-white shadow-sm hover:shadow-lg transition-all duration-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              Recent Activity
            </h3>
            <p className="text-sm text-gray-500 mt-1">Latest updates from your team</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/activities')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold rounded-xl border-2 border-black transition-all shadow-md hover:scale-105"
          >
            <span>View All</span>
          </button>
        </div>

        <div className="space-y-2">
          {stats.recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-200 hover:shadow-sm group"
              onClick={() => navigate('/activities')}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">{getActivityIcon(activity.type)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{activity.timestamp}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">by {activity.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Assistant Floating Button */}
      <button
        type="button"
        onClick={() => setShowAIChat(true)}
        className={`fixed bottom-8 right-8 p-4 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black rounded-full shadow-2xl hover:scale-110 transition-all z-50 flex items-center justify-center group`}
        title="AI Assistant"
      >
        <SparklesIcon className="h-7 w-7" />
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          AI
        </span>
      </button>

      {/* AI Chat Modal */}
      {showAIChat && (
        <AIChat isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
      )}
    </div>
  );
}
