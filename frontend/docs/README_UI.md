# 🎨 UI Customization Files

This folder contains configuration files that control ALL UI aspects of the CRM application.

## 📁 Configuration Files

### `src/config/theme.ts`
- **Purpose:** Colors, typography, spacing, shadows, transitions
- **Contains:**
  - Brand colors (primary, secondary, etc.)
  - Status badge colors
  - Deal stage colors
  - Priority level colors
  - Typography settings
  - Spacing scale
  - Border radius values
  - Shadow definitions

### `src/config/ui.ts`
- **Purpose:** Component configurations, text labels, layout settings
- **Contains:**
  - App branding (name, tagline)
  - Navigation menu items
  - Button style classes
  - Card/container styles
  - Table configurations
  - Form styles
  - Modal settings
  - Feature-specific configs (CSV import, duplicate detection)
  - Success/error messages

### `src/index.css`
- **Purpose:** Global CSS variables and base styles
- **Contains:**
  - CSS custom properties
  - Global resets
  - Utility classes
  - Font imports

## 🚀 Quick Start

1. **Change brand color:** Edit `src/config/theme.ts` → `colors.primary`
2. **Change app name:** Edit `src/config/ui.ts` → `branding.appName`
3. **Save file** → Browser auto-reloads
4. **Done!** ✅

## 📚 Documentation

- **Quick Reference:** `QUICK_UI_REFERENCE.md`
- **Full Guide:** `UI_CUSTOMIZATION_GUIDE.md`

## ✨ No Code Changes Needed

All UI customization is done through these config files.
**You never need to edit component files!**

---

**Need help?** Check the guides above or search for config imports in components.
