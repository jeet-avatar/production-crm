# 🎨 Quick UI Customization Reference

## 🚀 5-Minute Customization

### Change Brand Colors
**File:** `src/config/theme.ts`
```typescript
colors: {
  primary: {
    500: '#YOUR_COLOR', // Main brand color
  }
}
```

### Change App Name
**File:** `src/config/ui.ts`
```typescript
branding: {
  appName: 'YOUR_APP_NAME',
}
```

### Change Button Colors
**File:** `src/config/theme.ts`
```typescript
gradients: {
  primary: 'from-YOUR_COLOR-600 to-YOUR_COLOR-600',
}
```

---

## 📂 File Structure

```
src/
├── config/
│   ├── theme.ts          ← Colors, typography, spacing
│   └── ui.ts             ← Component configs, labels
├── index.css             ← Global CSS variables
└── components/           ← UI components (import configs)
```

---

## 🎯 Common Customizations

| What to Change | File | Line/Section |
|---------------|------|--------------|
| Primary color | `theme.ts` | `colors.primary` |
| App name | `ui.ts` | `branding.appName` |
| Button styles | `ui.ts` | `buttonStyles` |
| Status colors | `theme.ts` | `statusColors` |
| Success messages | `ui.ts` | `messages.success` |
| Table rows per page | `ui.ts` | `tableConfig.pagination` |
| CSV max files | `ui.ts` | `csvImportConfig.maxFiles` |
| Modal sizes | `ui.ts` | `modalConfig.sizes` |

---

## 🌈 Pre-configured Color Themes

### Blue Theme (Current)
```typescript
primary: { 500: '#3b82f6' }
```

### Purple Theme
```typescript
primary: { 500: '#a855f7' }
gradients: { primary: 'from-purple-600 to-pink-600' }
```

### Green Theme
```typescript
primary: { 500: '#22c55e' }
gradients: { primary: 'from-green-600 to-emerald-600' }
```

### Orange Theme
```typescript
primary: { 500: '#f97316' }
gradients: { primary: 'from-orange-600 to-red-600' }
```

---

## ⚡ Quick Tips

1. **Edit config files** - Don't touch component code
2. **Changes auto-reload** - Save and refresh browser
3. **Use Tailwind classes** - Consistent with the system
4. **Keep it simple** - Less customization = better UX

---

## 📍 Where Things Are

### Buttons
- Import buttons: ContactList.tsx (lines 144-164)
- Action buttons: Throughout components
- **Styles:** `src/config/ui.ts` → `buttonStyles`

### Colors
- Contact status badges: theme.ts → `statusColors`
- Deal stages: theme.ts → `dealStageColors`
- Priority levels: theme.ts → `priorityColors`

### Text Labels
- Navigation menu: ui.ts → `navigation.items`
- Messages: ui.ts → `messages`
- Modal titles: ui.ts →各modal config sections

### Layout
- Cards: ui.ts → `cardStyles`
- Tables: ui.ts → `tableConfig`
- Forms: ui.ts → `formConfig`
- Modals: ui.ts → `modalConfig`

---

## 🔧 Example: Rebrand in 3 Steps

**Step 1:** Change colors
```typescript
// src/config/theme.ts
colors: {
  primary: { 500: '#8b5cf6' }  // Purple
}
gradients: {
  primary: 'from-purple-600 to-indigo-600'
}
```

**Step 2:** Change name
```typescript
// src/config/ui.ts
branding: {
  appName: 'MyBusiness CRM',
  companyName: 'MyBusiness Inc.',
}
```

**Step 3:** Save and refresh browser ✅

---

## 📖 Full Guide
See `UI_CUSTOMIZATION_GUIDE.md` for detailed instructions.
