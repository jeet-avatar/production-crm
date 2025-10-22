# BrandMonkz - Branding Customization Guide

## Overview

All branding text, colors, and messaging are now centralized in a single configuration file. This makes it easy to update copy, change messaging, or rebrand the application without touching component code.

## Configuration File Location

```
frontend/src/config/branding.ts
```

## How to Customize

### 1. Edit Branding Text

Open `src/config/branding.ts` and modify any text values:

```typescript
export const BRANDING = {
  companyName: 'BrandMonkz',  // Change company name
  tagline: 'Your AI-Powered Marketing CRM',  // Change tagline

  login: {
    welcomeTitle: 'Welcome back',  // Login page title
    welcomeSubtitle: 'Sign in to your account to continue',
    // ... edit any other login text
  }
}
```

### 2. Update Feature Descriptions

You can easily modify the features shown on the login page:

```typescript
brandingPanel: {
  heading: 'Manage Your Business Like a Pro',
  description: 'Streamline your customer relationships...',
  features: [
    {
      title: '360° Customer View',
      description: 'Track every interaction and deal in one place'
    },
    // Add, remove, or modify features
  ]
}
```

### 3. After Making Changes

1. Save the `branding.ts` file
2. Rebuild the frontend:
   ```bash
   cd /Users/jeet/Documents/production-crm.BACKUP-20251021/frontend
   VITE_API_URL=https://brandmonkz.com npm run build
   ```
3. Deploy to production:
   ```bash
   cd /Users/jeet/Documents/CRM\ Module
   ./deploy-complete.sh
   ```

## Logo Information

### Current Logo

The login page now uses the **exact same logo** as the dashboard (`Logo.tsx`):

- **Orange circular icon** with white "B" letter
- **"BrandMonkz" text** - "Brand" in black/white, "Monkz" in orange
- Full SVG format for crisp rendering at any size

### Logo Locations

The logo appears in two places on the login page:

1. **Left side (form area):** Dark background version (orange circle, black text)
2. **Right side (branding panel):** Light version for gradient background (white circle, white text)

Both use the same SVG code from `Logo.tsx`, ensuring perfect consistency.

### To Change the Logo

If you want to change the logo design:

1. Edit the SVG in **both** locations in `LoginPage.tsx`:
   - Lines 63-110 (left side logo)
   - Lines 269-318 (right side logo)
2. Also update `src/components/Logo.tsx` to keep dashboard consistent

## Files Modified

- ✅ `src/config/branding.ts` - **NEW** Centralized branding config
- ✅ `src/pages/Auth/LoginPage.tsx` - Now uses branding config + real logo
- ✅ `src/components/Logo.tsx` - Dashboard logo (unchanged, used as reference)

## Benefits

✅ **No hardcoded text** - All text comes from config file
✅ **Consistent logo** - Same logo on dashboard and login page
✅ **Easy to update** - Change wording in one place
✅ **TypeScript safety** - Autocomplete and type checking for config
✅ **Easy maintenance** - Future developers can find all branding in one file

## Example: Changing Welcome Message

**Before:** Had to find and edit text in LoginPage.tsx
**Now:** Just edit `branding.ts`:

```typescript
login: {
  welcomeTitle: 'Hello Again!',  // Changed from "Welcome back"
  welcomeSubtitle: 'Ready to grow your business?',  // Changed
}
```

Save, rebuild, deploy - done! 🚀
