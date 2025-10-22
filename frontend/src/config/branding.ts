/**
 * Branding Configuration
 * Centralized place for all branding text, colors, and messaging
 * Edit this file to customize the application branding
 */

export const BRANDING = {
  // Company Information
  companyName: 'BrandMonkz',
  tagline: 'Your AI-Powered Marketing CRM',

  // Login Page
  login: {
    welcomeTitle: 'Welcome back',
    welcomeSubtitle: 'Sign in to your account to continue',
    googleButtonText: 'Continue with Google',
    orDividerText: 'Or continue with email',
    emailLabel: 'Email address',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    rememberMeText: 'Remember me',
    forgotPasswordText: 'Forgot password?',
    signInButtonText: 'Sign in',
    signingInButtonText: 'Signing in...',
    noAccountText: "Don't have an account?",
    signUpLinkText: 'Sign up for free',

    // Right side branding panel
    brandingPanel: {
      heading: 'Manage Your Business Like a Pro',
      description: 'Streamline your customer relationships, boost sales, and grow your business with our powerful CRM platform.',
      features: [
        {
          title: '360° Customer View',
          description: 'Track every interaction and deal in one place'
        },
        {
          title: 'AI-Powered Video Campaigns',
          description: 'Create professional marketing videos in minutes'
        },
        {
          title: 'Seamless Integration',
          description: 'Connect with Google, Outlook, and more'
        }
      ]
    }
  },

  // Colors (using Tailwind color names)
  colors: {
    primary: 'orange',
    secondary: 'rose',
    gradientFrom: 'from-orange-500',
    gradientVia: 'via-rose-500',
    gradientTo: 'to-rose-600',
  }
} as const;
