/**
 * UI Theme Configuration
 *
 * This file contains all UI customization options.
 * Change these values to customize the entire application's appearance.
 */

export const theme = {
  // Brand Colors
  colors: {
    // Primary brand color (used for main actions, links)
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main primary color
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    // Secondary colors for variety
    purple: {
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
    },

    green: {
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },

    red: {
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },

    orange: {
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
    },

    yellow: {
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
    },

    // Neutral grays
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },

  // Gradient combinations (used in buttons, headers)
  gradients: {
    primary: 'from-orange-500 to-rose-500',
    success: 'from-green-600 to-emerald-600',
    danger: 'from-red-600 to-orange-600',
    warning: 'from-yellow-600 to-orange-600',
    info: 'from-orange-500 to-rose-500',
    apollo: 'from-orange-600 to-rose-600',
  },

  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },
};

/**
 * Contact Status Colors
 * Customize the badge colors for different contact statuses
 */
export const statusColors = {
  LEAD: 'bg-orange-100 text-orange-700 border border-orange-200',
  PROSPECT: 'bg-rose-100 text-rose-700 border border-rose-200',
  CUSTOMER: 'bg-green-100 text-green-700 border border-green-200',
  COLD: 'bg-gray-100 text-gray-700 border border-gray-200',
  WARM: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  HOT: 'bg-red-100 text-red-700 border border-red-200',
  CLOSED_WON: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  CLOSED_LOST: 'bg-slate-100 text-slate-700 border border-slate-200',
};

/**
 * Deal Stage Colors
 * Customize colors for deal pipeline stages
 */
export const dealStageColors = {
  QUALIFICATION: 'bg-yellow-500',
  PROPOSAL: 'bg-orange-500',
  NEGOTIATION: 'bg-rose-500',
  CLOSED_WON: 'bg-green-500',
  CLOSED_LOST: 'bg-gray-400',
};

/**
 * Priority Colors
 * Customize colors for priority levels
 */
export const priorityColors = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export default theme;
