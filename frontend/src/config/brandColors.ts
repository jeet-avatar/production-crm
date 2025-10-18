/**
 * BrandMonkz Design System - Centralized Color & Gradient Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all colors and gradients in the application.
 * Change colors here and they will automatically apply across ALL pages.
 *
 * Design Philosophy:
 * - Primary: Blue-Purple (Innovation, Technology, Trust)
 * - Success: Green-Emerald (Growth, Success, Prosperity)
 * - Warning: Orange-Red (Energy, Urgency, Attention)
 * - Info: Blue-Indigo (Information, Clarity, Professionalism)
 * - Danger: Red-Pink (Critical, Important, Action Required)
 * - Premium: Purple-Pink (Luxury, Premium, Exclusive)
 */

// ============================================================================
// CORE BRAND COLORS - Main brand identity
// ============================================================================
export const BRAND_COLORS = {
  primary: {
    name: 'Primary Brand',
    gradient: 'from-blue-600 to-purple-600',
    hover: 'hover:from-blue-700 hover:to-purple-700',
    solid: 'bg-blue-600',
    text: 'text-blue-600',
    border: 'border-blue-600',
    ring: 'ring-blue-600',
    shadow: 'shadow-blue-500/30',
    lightBg: 'from-blue-50 to-purple-50',
    description: 'Main brand gradient - Innovation & Technology'
  },

  secondary: {
    name: 'Secondary Accent',
    gradient: 'from-indigo-600 to-purple-600',
    hover: 'hover:from-indigo-700 hover:to-purple-700',
    solid: 'bg-indigo-600',
    text: 'text-indigo-600',
    border: 'border-indigo-600',
    ring: 'ring-indigo-600',
    shadow: 'shadow-indigo-500/30',
    lightBg: 'from-indigo-50 to-purple-50',
    description: 'Secondary brand accent - Depth & Sophistication'
  }
} as const;

// ============================================================================
// SEMANTIC COLORS - Functional color meanings
// ============================================================================
export const SEMANTIC_COLORS = {
  success: {
    name: 'Success',
    gradient: 'from-green-500 to-emerald-600',
    hover: 'hover:from-green-600 hover:to-emerald-700',
    solid: 'bg-green-500',
    text: 'text-green-600',
    border: 'border-green-500',
    ring: 'ring-green-500',
    shadow: 'shadow-green-500/30',
    lightBg: 'from-green-50 to-emerald-50',
    description: 'Success states - Growth & Prosperity'
  },

  warning: {
    name: 'Warning',
    gradient: 'from-orange-500 to-red-600',
    hover: 'hover:from-orange-600 hover:to-red-700',
    solid: 'bg-orange-500',
    text: 'text-orange-600',
    border: 'border-orange-500',
    ring: 'ring-orange-500',
    shadow: 'shadow-orange-500/30',
    lightBg: 'from-orange-50 to-red-50',
    description: 'Warning & Attention - Energy & Urgency'
  },

  danger: {
    name: 'Danger',
    gradient: 'from-red-600 to-orange-600',
    hover: 'hover:from-red-700 hover:to-orange-700',
    solid: 'bg-red-600',
    text: 'text-red-600',
    border: 'border-red-600',
    ring: 'ring-red-600',
    shadow: 'shadow-red-500/30',
    lightBg: 'from-red-50 to-orange-50',
    description: 'Critical & Destructive actions'
  },

  info: {
    name: 'Information',
    gradient: 'from-blue-500 to-indigo-600',
    hover: 'hover:from-blue-600 hover:to-indigo-700',
    solid: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-500',
    ring: 'ring-blue-500',
    shadow: 'shadow-blue-500/30',
    lightBg: 'from-blue-50 to-indigo-50',
    description: 'Information & Clarity'
  },

  premium: {
    name: 'Premium',
    gradient: 'from-purple-600 to-pink-600',
    hover: 'hover:from-purple-700 hover:to-pink-700',
    solid: 'bg-purple-600',
    text: 'text-purple-600',
    border: 'border-purple-600',
    ring: 'ring-purple-600',
    shadow: 'shadow-purple-500/30',
    lightBg: 'from-purple-50 to-pink-50',
    description: 'Premium & Exclusive features'
  }
} as const;

// ============================================================================
// PAGE-SPECIFIC COLORS - Unique colors for different sections
// ============================================================================
export const PAGE_COLORS = {
  // Settings Page Tabs
  settings: {
    profile: {
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/30',
      description: 'Profile - Professional & Trustworthy'
    },
    account: {
      gradient: 'from-green-500 to-emerald-600',
      shadow: 'shadow-green-500/30',
      description: 'Account - Growth & Prosperity'
    },
    notifications: {
      gradient: 'from-orange-500 to-red-600',
      shadow: 'shadow-orange-500/30',
      description: 'Notifications - Attention & Alerts'
    },
    security: {
      gradient: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/30',
      description: 'Security - Protection & Trust'
    },
    preferences: {
      gradient: 'from-pink-500 to-rose-600',
      shadow: 'shadow-pink-500/30',
      description: 'Preferences - Personal & Custom'
    },
    billing: {
      gradient: 'from-red-500 to-pink-600',
      shadow: 'shadow-red-500/30',
      description: 'Billing - Financial & Important'
    }
  },

  // Super Admin Tabs
  superAdmin: {
    main: {
      gradient: 'from-red-500 to-pink-600',
      shadow: 'shadow-red-500/30',
      description: 'Super Admin - Power & Authority'
    }
  },

  // Dashboard Stats
  dashboard: {
    deals: {
      gradient: 'from-emerald-500 to-emerald-600',
      description: 'Deals - Revenue & Success'
    },
    contacts: {
      gradient: 'from-blue-500 to-blue-600',
      description: 'Contacts - Network & Connections'
    },
    companies: {
      gradient: 'from-purple-500 to-purple-600',
      description: 'Companies - Business & Growth'
    },
    activities: {
      gradient: 'from-orange-500 to-orange-600',
      description: 'Activities - Energy & Action'
    }
  },

  // Campaign Stats
  campaigns: {
    sent: {
      gradient: 'from-blue-500 to-blue-600',
      lightBg: 'from-blue-50 to-blue-100',
      description: 'Sent - Delivered & Completed'
    },
    opened: {
      gradient: 'from-green-500 to-green-600',
      lightBg: 'from-green-50 to-green-100',
      description: 'Opened - Engagement & Interest'
    },
    clicked: {
      gradient: 'from-purple-500 to-purple-600',
      lightBg: 'from-purple-50 to-purple-100',
      description: 'Clicked - Action & Conversion'
    },
    bounced: {
      gradient: 'from-orange-500 to-orange-600',
      lightBg: 'from-orange-50 to-orange-100',
      description: 'Bounced - Issues & Attention'
    }
  },

  // Pricing Plans
  pricing: {
    free: {
      gradient: 'from-gray-600 to-gray-800',
      hover: 'hover:from-gray-700 hover:to-gray-900',
      description: 'Free - Entry Level'
    },
    starter: {
      gradient: 'from-blue-500 to-indigo-600',
      hover: 'hover:from-blue-600 hover:to-indigo-700',
      shadow: 'shadow-blue-500/30',
      description: 'Starter - Getting Started'
    },
    professional: {
      gradient: 'from-red-500 to-pink-600',
      hover: 'hover:from-red-600 hover:to-pink-700',
      shadow: 'shadow-red-500/30',
      description: 'Professional - Most Popular'
    },
    enterprise: {
      gradient: 'from-purple-500 to-indigo-600',
      hover: 'hover:from-purple-600 hover:to-indigo-700',
      shadow: 'shadow-purple-500/30',
      description: 'Enterprise - Premium & Unlimited'
    }
  },

  // AI Assistant
  aiAssistant: {
    header: {
      gradient: 'from-pink-600 to-purple-600',
      description: 'AI - Intelligence & Innovation'
    },
    success: {
      lightBg: 'from-green-50 to-blue-50',
      description: 'AI Success state'
    }
  }
} as const;

// ============================================================================
// NEUTRAL COLORS - Backgrounds, borders, text
// ============================================================================
export const NEUTRAL_COLORS = {
  background: {
    page: 'from-gray-50 via-blue-50/30 to-purple-50/30',
    card: 'bg-white',
    subtle: 'from-gray-50 to-gray-100',
    description: 'Page backgrounds - Clean & Professional'
  },

  border: {
    default: 'border-gray-200',
    hover: 'hover:border-gray-300',
    focus: 'focus:border-blue-500',
    description: 'Borders & Dividers'
  },

  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    muted: 'text-gray-500',
    white: 'text-white',
    description: 'Text colors - Hierarchy & Readability'
  }
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get gradient class for a button with full styling
 */
export function getButtonGradient(type: keyof typeof BRAND_COLORS | keyof typeof SEMANTIC_COLORS) {
  const color = (BRAND_COLORS[type as keyof typeof BRAND_COLORS] || SEMANTIC_COLORS[type as keyof typeof SEMANTIC_COLORS]);
  return `bg-gradient-to-r ${color.gradient} ${color.hover} text-white shadow-lg ${color.shadow} hover:shadow-xl transition-all duration-200`;
}

/**
 * Get gradient background for cards/sections
 */
export function getCardGradient(type: keyof typeof BRAND_COLORS | keyof typeof SEMANTIC_COLORS) {
  const color = (BRAND_COLORS[type as keyof typeof BRAND_COLORS] || SEMANTIC_COLORS[type as keyof typeof SEMANTIC_COLORS]);
  return `bg-gradient-to-br ${color.lightBg}`;
}

/**
 * Get icon gradient for stat cards
 */
export function getIconGradient(type: keyof typeof BRAND_COLORS | keyof typeof SEMANTIC_COLORS) {
  const color = (BRAND_COLORS[type as keyof typeof BRAND_COLORS] || SEMANTIC_COLORS[type as keyof typeof SEMANTIC_COLORS]);
  return `bg-gradient-to-br ${color.gradient}`;
}

// ============================================================================
// THEME PRESETS - One-command theme changes
// ============================================================================

export const THEME_PRESETS = {
  default: {
    name: 'BrandMonkz Original',
    description: 'Blue-Purple brand with vibrant accents',
    colors: BRAND_COLORS
  },

  ocean: {
    name: 'Ocean Breeze',
    description: 'Cool blues and teals for a calm, professional feel',
    primary: 'from-blue-500 to-cyan-600',
    secondary: 'from-teal-500 to-blue-600'
  },

  sunset: {
    name: 'Sunset Vibes',
    description: 'Warm oranges and pinks for energy and creativity',
    primary: 'from-orange-500 to-pink-600',
    secondary: 'from-red-500 to-orange-600'
  },

  forest: {
    name: 'Forest Fresh',
    description: 'Greens and earthy tones for growth and stability',
    primary: 'from-green-600 to-emerald-600',
    secondary: 'from-emerald-500 to-teal-600'
  },

  royal: {
    name: 'Royal Purple',
    description: 'Deep purples for luxury and premium feel',
    primary: 'from-purple-600 to-indigo-700',
    secondary: 'from-violet-600 to-purple-700'
  },

  midnight: {
    name: 'Midnight Dark',
    description: 'Dark blues and purples for a modern, sleek look',
    primary: 'from-indigo-700 to-purple-800',
    secondary: 'from-blue-800 to-indigo-900'
  }
} as const;

// ============================================================================
// EXPORT ALL
// ============================================================================
export default {
  brand: BRAND_COLORS,
  semantic: SEMANTIC_COLORS,
  page: PAGE_COLORS,
  neutral: NEUTRAL_COLORS,
  presets: THEME_PRESETS,
  utils: {
    getButtonGradient,
    getCardGradient,
    getIconGradient
  }
};
