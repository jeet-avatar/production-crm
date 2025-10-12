# 🔧 FIX: CSV Import - All Contacts Going to One Company

## ✅ **STEP 1: CLEANUP COMPLETE**

I've deleted all 314 incorrectly imported contacts from "Slingshot Sports".

**Status**: Database is now clean and ready for correct import.

---

## 🔍 **WHY THIS HAPPENED**

The CSV import assigned all contacts to "Slingshot Sports" because of one of these reasons:

### **Possible Cause 1: CSV Column Name**
Your CSV might have a company column with a name the system didn't recognize, such as:
- `Organization` (instead of `Company`)
- `Company Name` (with a space)
- `Employer`
- Or a completely different name

### **Possible Cause 2: First Row Data**
The system might have taken the company name from the first row and applied it to all subsequent rows.

### **Possible Cause 3: Column Mapping**
The field mapping might have failed to detect the company column.

---

## 📋 **STEP 2: CHECK YOUR CSV FILE**

Before re-importing, please check your CSV file:

### **Required Format:**

Your CSV should look like this:

```csv
First Name,Last Name,Email,Title,Company
John,Doe,john@example.com,CEO,ABC Corp
Jane,Smith,jane@example.com,CTO,XYZ Inc
Bob,Johnson,bob@example.com,VP Sales,123 Company
```

### **Supported Column Names for Company:**

The system recognizes these column names (case-insensitive):
- `Company`
- `Organization`
- `Employer`
- `Business`
- `Company Name`
- `Org Name`

### **What to Check:**

1. **Open your CSV file**
2. **Check the header row** - what is the company column called?
3. **Check the data rows** - does each row have a different company?
4. **Send me the header row** so I can verify the mapping

---

## 🛠️ **STEP 3: TWO OPTIONS TO FIX**

### **Option A: Share Your CSV (Recommended)**

1. **Show me the first 3-5 rows** of your CSV (copy and paste here)
2. I'll analyze it and fix the import logic if needed
3. Then we'll re-import correctly

Example:
```
First Name,Last Name,Title,Organisation,LinkedIn URL
Sushil,Deshpande,Director Engineering,Acme Corp,https://linkedin.com/in/...
Laurie,Delgrosso,VP HR Operations,Beta Inc,https://linkedin.com/in/...
```

### **Option B: Fix the CSV Yourself**

1. **Rename the company column** to exactly `Company`
2. **Verify each row** has the correct company name
3. **Save as CSV**
4. **Re-import** through the frontend

---

## 🔧 **STEP 4: ENHANCED IMPORT LOGIC**

I'll create an improved import function that:

1. **Shows you the field mapping** before importing
2. **Previews first 5 rows** with how fields will be mapped
3. **Lets you manually map** columns if auto-detection fails
4. **Confirms** before actually importing

Would you like me to:
- **Create this enhanced importer?**
- **OR just help you fix the current CSV and re-import?**

---

## 📊 **CURRENT CSV IMPORT MAPPING**

The system currently recognizes these patterns:

| Your CSV Column | Maps To | Pattern Matched |
|-----------------|---------|-----------------|
| Email, E-mail, Mail | email | `email\|e-?mail\|mail` |
| First Name, FName, Given Name | firstName | `first.*name\|fname\|givenname` |
| Last Name, LName, Surname | lastName | `last.*name\|lname\|surname` |
| Phone, Mobile, Cell, Tel | phone | `phone\|mobile\|cell\|telephone` |
| Title, Position, Job Title | title | `title\|position\|jobtitle` |
| **Company, Organization, Employer** | **company** | **`company\|organization\|employer\|business`** |
| Industry, Sector | companyIndustry | `industry\|sector\|vertical` |
| Website, URL, Domain | companyWebsite | `website\|companywebsite\|url` |

---

## 🎯 **WHAT TO DO RIGHT NOW**

### **Step 1: Check Your CSV**
Open your CSV file and answer these questions:

1. What is the **exact name** of the company column?
   - Example: `"Company"`, `"Organisation"`, `"Company Name"`, etc.

2. Do different rows have **different companies**?
   - Or is it the same company for all rows?

3. How many **unique companies** should there be?
   - Example: "Around 50 different companies"

### **Step 2: Share the Info**

Tell me:
```
CSV Header Row: [paste here]
Total Rows: [number]
Expected Companies: [number]
Sample Row 1: [paste here]
Sample Row 2: [paste here]
```

### **Step 3: I'll Fix It**

Based on your info, I'll either:
- Fix the import code to handle your CSV format
- Give you exact instructions to format the CSV
- Create a custom import script for your specific file

---

## 🚀 **ALTERNATIVE: MANUAL IMPORT VIA FRONTEND**

If you want to import right now without code changes:

1. **Prepare your CSV** with these exact column names:
   ```
   firstName,lastName,email,phone,title,company
   ```

2. **Make sure each row has a different company** in the `company` column

3. **Upload via frontend**:
   - Go to https://sandbox.brandmonkz.com
   - Login
   - Navigate to **Contacts** → **Import**
   - Upload your CSV
   - Review the mapping
   - Import

---

## 📞 **NEXT STEPS**

**Please provide:**

1. **The header row** of your CSV (just copy/paste the first line)
2. **2-3 sample rows** (so I can see the actual data format)
3. **How many unique companies** should there be

Then I'll:
- Analyze the format
- Fix the import code if needed
- Help you re-import correctly

---

## ⚡ **QUICK FIX CHECKLIST**

Before re-importing, make sure:

- [ ] CSV has a column named "Company" (or similar)
- [ ] Each row has a DIFFERENT company name
- [ ] File is saved as UTF-8 CSV
- [ ] No empty rows
- [ ] Headers are in the first row
- [ ] Company names are consistent (not "ABC Corp" in one row and "ABC Corporation" in another)

---

**Ready to help! Just share your CSV header and a few sample rows.**
