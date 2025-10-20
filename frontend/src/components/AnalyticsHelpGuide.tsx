import { useState } from 'react';
import {
  XMarkIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  PresentationChartLineIcon,
  BellAlertIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function AnalyticsHelpGuide({ onClose }: HelpGuideProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      title: 'Understanding Key Metrics',
      icon: ChartBarIcon,
      description: 'Learn what each metric card represents and how to interpret the data.',
      details: [
        'Total Revenue: Sum of all closed-won deals in selected period',
        'Trend percentage: Compares current period to previous period',
        'Green up arrow = growth, Red down arrow = decline',
        'Deals Won: Number of successfully closed deals',
        'Conversion Rate: Percentage of deals won vs total deals',
        'Pipeline Value: Total value of all active deals',
        'All metrics update in real-time as data changes',
      ],
      buttonLabel: 'View Metrics',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      title: 'Select Time Ranges',
      icon: CalendarIcon,
      description: 'Filter analytics by different time periods to track performance trends.',
      details: [
        'Click time range buttons: 7d, 30d, 90d, or 1y',
        'Default view: Last 30 Days',
        'All charts and metrics update automatically',
        'Compare current period to previous period',
        'Use longer ranges (90d, 1y) for trend analysis',
        'Use shorter ranges (7d) for daily performance',
        'Historical data preserved for year-over-year comparison',
      ],
      buttonLabel: 'Change Range',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Read Revenue Trends',
      icon: ArrowTrendingUpIcon,
      description: 'Analyze monthly revenue patterns with the interactive revenue chart.',
      details: [
        'Bar chart shows monthly revenue over time',
        'Hover over bars to see exact revenue amounts',
        'Taller bars = higher revenue that month',
        'Identify seasonal patterns and trends',
        'Compare month-over-month growth',
        'Use for forecasting future revenue',
        'Export data for deeper analysis',
      ],
      buttonLabel: 'View Chart',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      title: 'Analyze Pipeline Stages',
      icon: FunnelIcon,
      description: 'Monitor how deals are distributed across your sales pipeline stages.',
      details: [
        'View deal count and total value per stage',
        'Prospecting → Qualification → Proposal → Negotiation',
        'Identify bottlenecks (stages with many deals)',
        'Monitor stage-to-stage conversion rates',
        'Track deals moving through pipeline',
        'Optimize stages with low conversion',
        'Use to forecast closing deals',
      ],
      buttonLabel: 'View Pipeline',
      gradient: 'from-purple-600 to-rose-600',
    },
    {
      title: 'Track Lead Sources',
      icon: DocumentChartBarIcon,
      description: 'Understand where your best leads come from to optimize marketing spend.',
      details: [
        'See percentage breakdown by lead source',
        'Sources: Website, Referral, Cold Outreach, Events, etc.',
        'Identify highest-performing channels',
        'Track source-to-revenue conversion',
        'Optimize marketing budget allocation',
        'Focus on channels with best ROI',
        'Compare source performance over time',
      ],
      buttonLabel: 'View Sources',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const features = [
    {
      icon: ArrowTrendingUpIcon,
      title: 'Real-Time Metrics',
      description: 'All analytics update automatically as data changes. No manual refresh needed - see revenue, deals, and pipeline instantly.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: CalendarIcon,
      title: 'Flexible Time Ranges',
      description: 'View analytics for 7 days, 30 days, 90 days, or 1 year. Compare current performance to previous periods automatically.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: ChartBarIcon,
      title: 'Revenue Tracking',
      description: 'Monitor total revenue, growth trends, and month-over-month changes with visual charts and percentage indicators.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: FunnelIcon,
      title: 'Pipeline Analytics',
      description: 'Track deals by stage, identify bottlenecks, and monitor conversion rates across your entire sales funnel.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Deal Performance',
      description: 'Track won/lost/pending deals, conversion rates, average deal size, and sales velocity for performance insights.',
      gradient: 'from-purple-600 to-rose-600',
    },
    {
      icon: DocumentChartBarIcon,
      title: 'Lead Source Analysis',
      description: 'Identify which marketing channels generate the most leads and revenue to optimize your marketing strategy.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: PresentationChartLineIcon,
      title: 'Visual Dashboards',
      description: 'Beautiful, easy-to-read charts and graphs make complex data simple to understand at a glance.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: TableCellsIcon,
      title: 'Detailed Breakdowns',
      description: 'Drill down into metrics with detailed tables showing counts, values, percentages, and trends.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: ArrowPathIcon,
      title: 'Trend Comparisons',
      description: 'Automatically compare current period to previous period with percentage change indicators (growth/decline).',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: AdjustmentsHorizontalIcon,
      title: 'Customizable Views',
      description: 'Filter and segment data by time range, team member, product, or custom fields for targeted insights.',
      gradient: 'from-purple-600 to-rose-600',
    },
  ];

  const proTips = [
    {
      icon: LightBulbIcon,
      title: 'Check Analytics Daily',
      description: 'Review key metrics every morning to spot trends early. Use the 7-day view to track daily performance and quickly identify issues or opportunities.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Compare Time Periods',
      description: 'Always look at trend percentages to understand growth or decline. Compare this month vs last month, this quarter vs last quarter for context.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Monitor Pipeline Health',
      description: 'A healthy pipeline has deals evenly distributed across stages. Too many in one stage = bottleneck. Too few in early stages = future revenue risk.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Optimize Lead Sources',
      description: 'Double down on lead sources with highest conversion rates. Cut spending on low-performing channels. Track ROI per source monthly.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: LightBulbIcon,
      title: 'Set Revenue Goals',
      description: 'Use historical data to set realistic revenue targets. Track progress daily. Adjust sales tactics if trending below goal mid-month.',
      gradient: 'from-purple-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Identify Seasonal Patterns',
      description: 'Use 1-year view to spot seasonal trends. Plan inventory, staffing, and marketing campaigns around high/low revenue months.',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Share Reports with Team',
      description: 'Export analytics for team meetings. Celebrate wins, analyze losses, and align everyone on goals using real data.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Track Conversion Rates',
      description: 'Conversion rate is your most important metric. Industry average is 20-30%. Below 15% = fix pipeline. Above 40% = increase lead volume.',
      gradient: 'from-rose-600 to-pink-600',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-rose-600 p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">Analytics Guide</h2>
              <p className="text-orange-100 text-sm">Make data-driven decisions with powerful insights</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('quickstart')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'quickstart'
                  ? 'bg-white text-orange-600 shadow-lg'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              Quick Start
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'features'
                  ? 'bg-white text-orange-600 shadow-lg'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'tips'
                  ? 'bg-white text-orange-600 shadow-lg'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              Pro Tips
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Learn how to read and interpret your CRM analytics for better business decisions.
              </p>

              {quickStartSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;

                return (
                  <div
                    key={index}
                    className={`border-2 rounded-xl overflow-hidden transition-all cursor-pointer ${
                      isActive
                        ? 'border-orange-500 shadow-lg'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => setActiveStep(index)}
                  >
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-rose-50">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-r ${step.gradient}`}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {index + 1}. {step.title}
                          </h3>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <div className="p-4 bg-white border-t-2 border-orange-100">
                        <ul className="space-y-2 mb-4">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircleIcon className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          className={`w-full px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r ${step.gradient} hover:shadow-lg transition-all`}
                        >
                          {step.buttonLabel}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Discover powerful analytics features to track performance and grow your business.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="border-2 border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-r ${feature.gradient}`}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Master analytics best practices to drive revenue growth and business success.
              </p>

              {proTips.map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div
                    key={index}
                    className="border-2 border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-lg transition-all bg-gradient-to-r from-orange-50 to-rose-50"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-r ${tip.gradient}`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{tip.title}</h3>
                        <p className="text-sm text-gray-600">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gradient-to-r from-orange-50 to-rose-50 border-t-2 border-orange-100">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Need more help? Contact support or check our documentation.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
