import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    trend: number;
    data: Array<{ month: string; value: number }>;
  };
  deals: {
    won: number;
    lost: number;
    pending: number;
    conversionRate: number;
  };
  pipeline: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
  leadSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(
        `${apiUrl}/api/analytics?timeRange=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-600">
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...analytics.revenue.data.map(d => d.value), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
          <p className="text-gray-600">Real-time insights from your CRM data</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
              {range === '90d' && 'Last 90 Days'}
              {range === '1y' && 'Last Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className={`flex items-center text-sm font-medium ${analytics.revenue.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics.revenue.trend >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(analytics.revenue.trend)}%
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(analytics.revenue.current)}</h3>
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-xs text-gray-500 mt-2">Previous: {formatCurrency(analytics.revenue.previous)}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-sm font-medium text-blue-600">
              {analytics.deals.conversionRate}%
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{analytics.deals.won}</h3>
          <p className="text-sm text-gray-600">Deals Won</p>
          <p className="text-xs text-gray-500 mt-2">
            {analytics.deals.lost} lost • {analytics.deals.pending} pending
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(analytics.pipeline.reduce((sum, stage) => sum + stage.value, 0))}
          </h3>
          <p className="text-sm text-gray-600">Pipeline Value</p>
          <p className="text-xs text-gray-500 mt-2">
            {analytics.pipeline.reduce((sum, stage) => sum + stage.count, 0)} deals in pipeline
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card mb-8">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <p className="text-sm text-gray-600">Monthly revenue over the past year</p>
        </div>
        <div className="p-6">
          <div className="h-80 flex items-end justify-between gap-2">
            {analytics.revenue.data.map((item, index) => {
              const height = (item.value / maxRevenue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full">
                    <div
                      className="w-full bg-primary-600 rounded-t-lg transition-all duration-300 hover:bg-primary-700 cursor-pointer"
                      style={{ height: `${height * 2.5}px` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap transition-opacity">
                        {formatCurrency(item.value)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">{item.month}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pipeline and Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pipeline Distribution */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Pipeline Distribution</h3>
            <p className="text-sm text-gray-600">Deals by stage</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analytics.pipeline.map((stage, index) => {
                const colors = ['bg-gray-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-green-500'];
                const totalValue = analytics.pipeline.reduce((sum, s) => sum + s.value, 0);
                const percentage = totalValue > 0 ? (stage.value / totalValue) * 100 : 0;

                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(stage.value)}</span>
                        <span className="text-xs text-gray-500 ml-2">({stage.count} deals)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${colors[index]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lead Sources */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Lead Sources</h3>
            <p className="text-sm text-gray-600">Where your leads come from</p>
          </div>
          <div className="p-6">
            {analytics.leadSources.length > 0 ? (
              <div className="space-y-4">
                {analytics.leadSources.map((source, index) => {
                  const colors = [
                    'bg-blue-500',
                    'bg-purple-500',
                    'bg-pink-500',
                    'bg-orange-500',
                    'bg-gray-500',
                  ];

                  return (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-sm font-medium text-gray-700">{source.source}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">{source.count}</span>
                          <span className="text-xs text-gray-500 ml-2">({source.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[index % colors.length]}`}
                          style={{ width: `${source.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No lead sources data available yet.</p>
                <p className="text-sm mt-2">Add contacts with source information to see this data.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
