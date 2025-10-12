# 🎨 UI Customization Guide

This guide explains how to customize every aspect of the CRM application's user interface without touching component code.

## 📁 Configuration Files

All UI customization is centralized in these files:

### 1. **Theme Configuration** (`src/config/theme.ts`)
Controls colors, typography, spacing, shadows, and transitions.

### 2. **UI Configuration** (`src/config/ui.ts`)
Controls component styles, labels, messages, and layout settings.

### 3. **Global Styles** (`src/index.css`)
Contains CSS custom properties and global styles.

---

## 🎨 Color Customization

### Change Primary Brand Color

**File:** `src/config/theme.ts`

```typescript
colors: {
  primary: {
    500: '#3b82f6', // Change this to your brand color
    600: '#2563eb', // Darker shade for hover states
    700: '#1d4ed8', // Even darker for active states
  }
}
```

**Example:** To use purple as primary:
```typescript
primary: {
  500: '#a855f7',
  600: '#9333ea',
  700: '#7e22ce',
}
```

### Change Contact Status Colors

**File:** `src/config/theme.ts`

```typescript
export const statusColors = {
  LEAD: 'bg-blue-100 text-blue-700 border border-blue-200',
  PROSPECT: 'bg-purple-100 text-purple-700 border border-purple-200',
  // Modify these to change badge appearance
}
```

### Change Button Gradients

**File:** `src/config/theme.ts`

```typescript
gradients: {
  primary: 'from-blue-600 to-purple-600',    // Main action buttons
  success: 'from-green-600 to-emerald-600',  // Success/import buttons
  danger: 'from-red-600 to-orange-600',      // Delete/warning buttons
}
```

---

## 🔤 Text & Labels Customization

### Change Application Name

**File:** `src/config/ui.ts`

```typescript
export const branding = {
  appName: 'CRM Email Marketing Automation',  // Change this
  companyName: 'Your Company',                 // Change this
  tagline: 'Manage your customer relationships', // Change this
}
```

### Change Navigation Menu

**File:** `src/config/ui.ts`

```typescript
export const navigation = {
  items: [
    { name: 'Dashboard', path: '/', icon: 'HomeIcon' },
    { name: 'Contacts', path: '/contacts', icon: 'UserGroupIcon' },
    // Add, remove, or reorder items
  ]
}
```

### Change Success/Error Messages

**File:** `src/config/ui.ts`

```typescript
export const messages = {
  success: {
    contactCreated: 'Contact created successfully',  // Customize
    csvImported: 'CSV imported successfully',         // Customize
  },
  error: {
    generic: 'Something went wrong. Please try again.', // Customize
  }
}
```

---

## 🖼️ Component Styles Customization

### Button Styles

**File:** `src/config/ui.ts`

```typescript
export const buttonStyles = {
  primary: 'px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600...',
  // Modify these classes to change button appearance
}
```

**How to use in components:**
```typescript
import { buttonStyles } from '@/config/ui';

<button className={buttonStyles.primary}>
  Click me
</button>
```

### Card/Container Styles

**File:** `src/config/ui.ts`

```typescript
export const cardStyles = {
  default: 'border-2 border-gray-200 rounded-2xl bg-white shadow-sm...',
  header: 'p-8 border-b-2 border-gray-200 bg-gradient-to-r...',
}
```

### Form Input Styles

**File:** `src/config/ui.ts`

```typescript
export const formConfig = {
  inputClasses: 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl...',
  labelClasses: 'block text-sm font-semibold text-gray-700 mb-2',
}
```

---

## 📊 Feature Configuration

### CSV Import Settings

**File:** `src/config/ui.ts`

```typescript
export const csvImportConfig = {
  maxFiles: 10,                          // Change max files
  maxFileSize: 10 * 1024 * 1024,        // Change max file size (bytes)
  acceptedFormats: ['.csv', 'text/csv'], // Change accepted formats

  modal: {
    title: 'AI CSV Import',              // Change modal title
    subtitle: 'Intelligently import...',  // Change subtitle
  }
}
```

### Table Pagination

**File:** `src/config/ui.ts`

```typescript
export const tableConfig = {
  pagination: {
    defaultPageSize: 10,                    // Change default rows per page
    pageSizeOptions: [10, 25, 50, 100],     // Change page size options
  }
}
```

### Contact List Columns

**File:** `src/config/ui.ts`

```typescript
export const contactListConfig = {
  columns: [
    { key: 'name', label: 'Contact', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    // Add, remove, or reorder columns
  ]
}
```

---

## 🎯 Quick Customization Examples

### Example 1: Change to Dark Theme Colors

**File:** `src/config/theme.ts`

```typescript
colors: {
  primary: {
    500: '#818cf8',  // Lighter blue for dark theme
    600: '#6366f1',
    700: '#4f46e5',
  },
  gray: {
    50: '#1e293b',   // Darker background
    100: '#334155',
    // ... reverse the gray scale
  }
}
```

### Example 2: Make Buttons Rounded Pills

**File:** `src/config/ui.ts`

```typescript
export const buttonStyles = {
  primary: 'px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full...',
  //                                                                                    ^^^^^^ Change to 'rounded-full'
}
```

### Example 3: Change Modal Sizes

**File:** `src/config/ui.ts`

```typescript
export const modalConfig = {
  sizes: {
    sm: 'max-w-lg',   // Make small modals larger
    md: 'max-w-3xl',  // Make medium modals larger
    lg: 'max-w-5xl',  // Make large modals larger
  }
}
```

### Example 4: Add New Contact Status

**File:** `src/config/theme.ts`

```typescript
export const statusColors = {
  // ... existing statuses
  ARCHIVED: 'bg-gray-200 text-gray-600 border border-gray-300',  // Add new status
}
```

**File:** `src/config/ui.ts`

```typescript
export const contactListConfig = {
  statusOptions: [
    'LEAD',
    'PROSPECT',
    'CUSTOMER',
    'ARCHIVED',  // Add to dropdown
  ]
}
```

---

## 🌈 CSS Custom Properties

For advanced customization, edit CSS variables in `src/index.css`:

```css
:root {
  /* Primary colors */
  --color-primary-500: #3b82f6;   /* Change main brand color */
  --color-primary-600: #2563eb;

  /* Background colors */
  --color-gray-50: #f8fafc;       /* Change page background */
  --color-gray-100: #f1f5f9;

  /* Shadows */
  --shadow-md: 0 4px 6px -1px...  /* Change shadow depth */

  /* Border radius */
  --radius-xl: 1rem;               /* Change card roundness */

  /* Transitions */
  --transition-normal: 200ms...    /* Change animation speed */
}
```

---

## 📱 Responsive Design

All components use Tailwind's responsive classes. To customize breakpoints:

**File:** `tailwind.config.js` (create if needed)

```javascript
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    }
  }
}
```

---

## 🔧 How to Apply Changes

1. **Edit Configuration Files**
   - Modify `src/config/theme.ts` for colors and styling
   - Modify `src/config/ui.ts` for text and component configs
   - Modify `src/index.css` for global CSS

2. **No Build Required**
   - Vite dev server auto-reloads on file changes
   - Changes appear instantly in browser

3. **Import Config in Components**
   ```typescript
   import { theme, statusColors } from '@/config/theme';
   import { buttonStyles, messages } from '@/config/ui';
   ```

---

## 🎨 Color Palette Generator

Need help choosing colors? Use these tools:

1. **Tailwind Color Palette:** https://tailwindcss.com/docs/customizing-colors
2. **Color Hunt:** https://colorhunt.co/
3. **Coolors:** https://coolors.co/
4. **Adobe Color:** https://color.adobe.com/

---

## 📚 Component-Specific Guides

### ContactList Component

**Colors:**
- Header gradient: `cardStyles.header` in `ui.ts`
- Status badges: `statusColors` in `theme.ts`
- Action buttons: `buttonStyles` in `ui.ts`

**Layout:**
- Columns: `contactListConfig.columns` in `ui.ts`
- Pagination: `tableConfig.pagination` in `ui.ts`

### CSV Import Modal

**Colors:**
- Header: Green gradient (change in component or extract to config)
- Step indicators: Green (change in component or extract to config)
- Buttons: `buttonStyles.success` in `ui.ts`

**Settings:**
- Max files: `csvImportConfig.maxFiles`
- File size limit: `csvImportConfig.maxFileSize`
- Modal title: `csvImportConfig.modal.title`

### Duplicate Detection Modal

**Colors:**
- Header: Red/orange gradient (change in component)
- Warning indicators: Red/orange theme

**Settings:**
- Step labels: `duplicateDetectionConfig.modal.stepLabels`
- Detection criteria: `duplicateDetectionConfig.detectionCriteria`

---

## 🚀 Best Practices

1. **Always use config files** instead of hardcoding values in components
2. **Maintain consistency** - use the same color palette throughout
3. **Test responsiveness** on different screen sizes
4. **Keep accessibility** in mind (contrast ratios, font sizes)
5. **Document custom changes** in comments

---

## 🐛 Troubleshooting

### Changes not appearing?
- Clear browser cache (Ctrl+F5 / Cmd+Shift+R)
- Check browser console for errors
- Verify file paths are correct

### Import errors?
- Ensure TypeScript paths are configured
- Check file extensions (.ts not .tsx for config files)

### Colors not matching?
- Use Tailwind color classes consistently
- Check CSS specificity (inline styles override classes)

---

## 📞 Need Help?

- Check component files to see how configs are imported
- Look for `import { ... } from '@/config/theme'` or `'@/config/ui'`
- Most hardcoded styles should be extracted to these config files

---

## 🎉 You're Ready!

With these configuration files, you can customize:
- ✅ All colors and themes
- ✅ Button and card styles
- ✅ Text labels and messages
- ✅ Table layouts and pagination
- ✅ Modal appearances
- ✅ Form styles
- ✅ Navigation menu
- ✅ Feature settings

**No need to touch component code!** 🚀
