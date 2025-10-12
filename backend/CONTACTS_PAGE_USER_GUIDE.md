# 📇 Contacts Page - User Guide

**Feature**: Expand/Collapse Contacts by Company
**Status**: ✅ FULLY IMPLEMENTED AND WORKING
**Last Updated**: October 11, 2025

---

## 🎯 How It Works

The Contacts page **automatically groups contacts by company** and shows only the first contact from each company. You can expand to see all contacts from that company.

---

## 📊 Display Format

### Default View (Collapsed)
When you first open the Contacts page, you'll see:

```
👤 John Doe (+2 more)      CEO          Acme Corp        [Status]  [Phone]  [Actions]
   john@acme.com

👤 Jane Smith              CTO          Tech Inc         [Status]  [Phone]  [Actions]
   jane@tech.com

👤 Bob Johnson (+9 more)   Manager      Big Co           [Status]  [Phone]  [Actions]
   bob@bigco.com
```

### Key Features:

1. **First Contact Shown**: Only the first contact from each company is displayed
2. **"+X more" Indicator**: Shows how many additional contacts exist for that company
   - Example: `+2 more` means there are 2 more contacts from that company
   - Example: `+9 more` means there are 9 more contacts from that company
3. **Chevron Icon**:
   - `▶` (right arrow) = Company is collapsed
   - `▼` (down arrow) = Company is expanded

---

## 🔽 Expanding Companies

### To View All Contacts from a Company:

**Method 1: Click the Chevron Icon**
- Click the small arrow button (▶) next to the contact's avatar
- The arrow will change to ▼
- All contacts from that company will be displayed below

**Method 2: Look for "+X more"**
- If you see "+X more" next to a contact's name, that company has multiple contacts
- Click the chevron to expand

### Example:

**Before (Collapsed)**:
```
▶ 👤 John Doe (+2 more)
     john@acme.com
```

**After (Expanded)**:
```
▼ 👤 John Doe (+2 more)
     john@acme.com

  👤 Sarah Miller
     sarah@acme.com

  👤 Mike Wilson
     mike@acme.com
```

---

## 🔼 Collapsing Companies

### To Hide Additional Contacts:

- Click the down arrow (▼) next to the first contact
- The company group will collapse back to showing only the first contact
- The arrow changes back to ▶

---

## 🎨 Visual Indicators

### Company with Multiple Contacts:
- **Chevron Button**: Visible (clickable arrow)
- **"+X more" Badge**: Displayed next to first contact's name
- **Hover Effect**: Chevron button highlights when you hover over it

### Company with Single Contact:
- **No Chevron**: No arrow button shown
- **No "+X more"**: No badge displayed
- **Normal Display**: Just the single contact

### Expanded Contacts Styling:
- **Background Color**: Slightly darker/lighter background (gray-50)
- **Indentation**: Slightly indented to show hierarchy
- **Full Information**: All contact details visible

---

## 💡 Why This Design?

### Benefits:

1. **Cleaner View** 📋
   - Don't see 100+ contacts all at once
   - Only see one contact per company by default
   - Page loads faster

2. **Easy Navigation** 🧭
   - Quickly scan through companies
   - Expand only the companies you're interested in
   - Reduce visual clutter

3. **Better Organization** 🗂️
   - Contacts grouped by company
   - See company relationships at a glance
   - Easier to manage large contact lists

4. **Performance** ⚡
   - Renders less DOM elements initially
   - Smoother scrolling
   - Better user experience with large datasets

---

## 📱 Example Scenarios

### Scenario 1: Finding Contacts from Acme Corp

1. Scroll through contacts list
2. Find "Acme Corp" company name in Company column
3. See first contact: `John Doe (+5 more)`
4. Click chevron ▶ to expand
5. See all 6 contacts from Acme Corp
6. Click specific contact to view details

### Scenario 2: Importing 100 Contacts from 20 Companies

**What happens**:
- Contacts page shows 20 rows (one per company)
- Each row shows first contact + "+X more" indicator
- Page is clean and organized

**To see all contacts from a specific company**:
- Click the chevron next to that company's first contact
- All contacts from that company expand below

### Scenario 3: Company with 1 Contact

**What you see**:
- No chevron button (not needed)
- No "+X more" badge
- Just the single contact displayed
- Clean, simple view

---

## 🔧 Technical Details

### Grouping Logic

Contacts are grouped by the `company.name` field:

```typescript
const groupedContacts = contacts.reduce((acc, contact) => {
  const companyName = contact.company?.name || 'No Company';
  if (!acc[companyName]) {
    acc[companyName] = [];
  }
  acc[companyName].push(contact);
  return acc;
}, {});
```

### Display Logic

For each company group:
- **First contact**: Always displayed
- **Remaining contacts**: Displayed only if company is expanded
- **"+X more" indicator**: Shown if `companyContacts.length > 1`

```typescript
const displayContact = companyContacts[0]; // First contact
const hasMultipleContacts = companyContacts.length > 1;

{hasMultipleContacts && (
  <span>+{companyContacts.length - 1} more</span>
)}
```

### Expand/Collapse State

Managed using a `Set` of expanded company names:

```typescript
const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

const toggleCompany = (companyName: string) => {
  const newExpanded = new Set(expandedCompanies);
  if (newExpanded.has(companyName)) {
    newExpanded.delete(companyName); // Collapse
  } else {
    newExpanded.add(companyName); // Expand
  }
  setExpandedCompanies(newExpanded);
};
```

---

## 🎯 Key Information

### File Location
**Frontend**: `/CRM Frontend/crm-app/src/pages/Contacts/ContactList.tsx`

### State Variables
- `expandedCompanies: Set<string>` - Tracks which companies are expanded
- `groupedContacts: GroupedContacts` - Contacts grouped by company

### Functions
- `toggleCompany(companyName)` - Expands/collapses a company group
- Lines 188-196: Toggle logic
- Lines 199-206: Grouping logic
- Lines 347-451: Display logic

---

## ✅ Testing

### To Verify It's Working:

1. **Import Multiple Contacts** from same company
   - Use CSV import with multiple contacts from "Acme Corp"

2. **Check Contacts Page**
   - Should see: `John Doe (+X more)` where X = number of additional contacts
   - Should see chevron ▶ button

3. **Click Chevron**
   - Should expand to show all contacts
   - Arrow changes to ▼

4. **Click Again**
   - Should collapse back to one contact
   - Arrow changes to ▶

---

## 🚀 Current Status

✅ **Feature Implemented**: Expand/collapse functionality is fully working
✅ **UI Components**: Chevron icons, "+X more" badges all present
✅ **State Management**: Properly tracks expanded/collapsed state
✅ **Responsive**: Works on all screen sizes
✅ **Performance**: Efficient rendering with large contact lists

---

## 📸 Visual Example

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Contacts                                                    [+ Add]      │
├─────────────────────────────────────────────────────────────────────────┤
│ Name              Role         Company      Status      Phone    Actions│
├─────────────────────────────────────────────────────────────────────────┤
│ ▶ 👤 John Doe     CEO          Acme Corp    Lead        555-1234  [✏️🗑️] │
│   (+2 more)                                                              │
│   john@acme.com                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ ▼ 👤 Jane Smith   CTO          Tech Inc     Prospect    555-5678  [✏️🗑️] │
│   (+9 more)                                                              │
│   jane@tech.com                                                          │
│                                                                          │
│   👤 Bob Johnson   Developer    Tech Inc     Lead        555-1111  [✏️🗑️] │
│      bob@tech.com                                                        │
│                                                                          │
│   👤 Alice Brown   Designer     Tech Inc     Lead        555-2222  [✏️🗑️] │
│      alice@tech.com                                                      │
│   ... (7 more contacts shown when expanded)                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 💡 Tips

1. **Expand All**: Currently must expand each company individually
2. **Keyboard Navigation**: Use Tab to navigate between chevron buttons
3. **Mobile**: Touch the chevron icon to expand/collapse
4. **Search**: Searching shows all matching contacts (expanded view)
5. **Pagination**: Works with pagination - each page shows grouped contacts

---

## 🎉 Summary

The Contacts page **already has the expand/collapse feature you requested**!

- ✅ Shows only first contact per company by default
- ✅ Displays "+X more" indicator for companies with multiple contacts
- ✅ Click chevron to expand/collapse
- ✅ Clean, organized view
- ✅ Reduces visual clutter
- ✅ Better performance with large datasets

**The feature is working and ready to use!** Just import your contacts and you'll see the grouping automatically.
