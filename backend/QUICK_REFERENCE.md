# Company CSV Upload - Quick Reference Card

## 🎯 What Was Built

**Feature**: CSV upload and manual update for company details with automatic data source tagging

**Status**: ✅ **DEPLOYED AND LIVE**

---

## 📍 API Endpoints (Both Live on Production)

### 1. CSV Upload
```
POST /api/companies/:id/upload-details
Authorization: Bearer {token}
Content-Type: multipart/form-data
Body: file (CSV)
→ Tags as "csv_upload"
```

### 2. Manual Update
```
POST /api/companies/:id/manual-update
Authorization: Bearer {token}
Content-Type: application/json
Body: JSON with fields
→ Tags as "manual_research"
```

---

## 📄 CSV Format

**Headers** (case-insensitive):
```csv
website,industry,size,location,description,linkedin,domain,employeeCount,revenue,foundedYear,phone
```

**Example**:
```csv
website,industry,size,location,description,linkedin,domain,employeeCount,revenue,foundedYear,phone
https://example.com,Technology,50-100,San Francisco CA,Description text,https://linkedin.com/company/example,example.com,75,$10M,2020,+1-555-0100
```

**Files Available**:
- `company-details-template.csv` - Empty template
- `company-details-sample.csv` - Sample with data

---

## 🧪 Test It Now

**Quick Test**:
```bash
cd /Users/jeet/Documents/CRM\ Module
node test-csv-upload.js
```

**Manual Test with cURL**:
```bash
# Upload CSV
curl -X POST \
  'http://sandbox.brandmonkz.com:3000/api/companies/COMPANY_ID/upload-details' \
  -H 'Authorization: Bearer TOKEN' \
  -F 'file=@company-details-sample.csv'

# Manual Update
curl -X POST \
  'http://sandbox.brandmonkz.com:3000/api/companies/COMPANY_ID/manual-update' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"website":"https://test.com","industry":"Technology"}'
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `COMPANY_DETAILS_CSV_UPLOAD_GUIDE.md` | **START HERE** - Complete implementation guide with React components |
| `CSV_UPLOAD_DEPLOYMENT_COMPLETE.md` | Deployment details and testing guide |
| `FEATURE_COMPLETE_SUMMARY.md` | Executive summary and overview |
| `QUICK_REFERENCE.md` | This quick reference card |

---

## 💻 Frontend Components (Ready to Use)

All component code is in `COMPANY_DETAILS_CSV_UPLOAD_GUIDE.md`:

1. **CompanyDetailsUpload.tsx** - CSV upload component
2. **CompanyManualUpdate.tsx** - Manual edit form
3. **DataSourceBadge.tsx** - Data source badges
4. **CompanyDetailsPage.tsx** - Full page integration

**Just copy, paste, and customize to your design!**

---

## 🏷️ Data Source Tags

| Tag | Badge | Description |
|-----|-------|-------------|
| `csv_upload` | 📄 Blue | Uploaded via CSV file |
| `manual_research` | ✏️ Green | Manual research/entry |
| `csv_import` | 📊 Teal | Bulk CSV import |
| `ai_enrichment` | 🤖 Purple | AI-generated data |
| `api_import` | 🔄 Orange | External API import |

---

## 📊 Supported Fields (11 Total)

✅ website
✅ industry
✅ size
✅ location
✅ description
✅ linkedin
✅ domain
✅ employeeCount
✅ revenue
✅ foundedYear
✅ phone

---

## 🔐 Security

- ✅ JWT authentication required
- ✅ User isolation (can only update own companies)
- ✅ Ownership verification
- ✅ 10MB file size limit
- ✅ CSV file type validation

---

## 🚀 Server Info

**Production Server**:
- Domain: sandbox.brandmonkz.com
- IP: 18.212.225.252
- API: http://sandbox.brandmonkz.com:3000
- Status: ✅ Online

**Check Status**:
```bash
ssh ec2-user@18.212.225.252
pm2 status
pm2 logs
```

---

## ✅ Implementation Checklist (Frontend)

- [ ] Read `COMPANY_DETAILS_CSV_UPLOAD_GUIDE.md`
- [ ] Copy React components from guide
- [ ] Add `REACT_APP_API_URL` to `.env`
- [ ] Install `axios`: `npm install axios`
- [ ] Integrate CSV upload component into company details page
- [ ] Integrate manual update form
- [ ] Add data source badges to display
- [ ] Add CSV template download button
- [ ] Add file validation
- [ ] Add loading states
- [ ] Add error handling
- [ ] Style to match design system
- [ ] Test with sample CSV
- [ ] Test manual update
- [ ] Test error scenarios
- [ ] Deploy to production

---

## 📈 Response Format

**Both endpoints return**:
```json
{
  "message": "Success message",
  "company": {
    "id": "...",
    "name": "...",
    "website": "...",
    "industry": "...",
    "dataSource": "csv_upload" | "manual_research",
    "fieldSources": {
      "website": "csv_upload",
      "industry": "manual_research"
    },
    "importedAt": "2025-10-11T18:30:00.000Z",
    "updatedAt": "2025-10-11T18:30:00.000Z"
  },
  "fieldsUpdated": ["website", "industry", "size"],
  "dataSource": "csv_upload" | "manual_research"
}
```

---

## 🎯 Key Features

✅ **Dual Update Methods**: CSV upload OR manual form
✅ **Data Source Tracking**: Company-level AND field-level
✅ **Case-Insensitive CSV**: Headers work in any case
✅ **Flexible Headers**: Multiple variations supported
✅ **Security Built-In**: Authentication + user isolation
✅ **Complete Documentation**: Everything you need to implement
✅ **Test Suite Included**: Automated testing ready
✅ **Production Ready**: Deployed and operational

---

## 🆘 Quick Help

**Need to...**

- Implement frontend? → Read `COMPANY_DETAILS_CSV_UPLOAD_GUIDE.md`
- Test endpoints? → Run `node test-csv-upload.js`
- Get CSV template? → Use `company-details-template.csv`
- Check server? → `ssh ec2-user@18.212.225.252 && pm2 logs`
- See example data? → Use `company-details-sample.csv`

---

## 📞 Code Locations

**Backend**:
- Source: `/src/routes/companies.ts` (lines 350-549)
- Compiled: `/dist/routes/companies.js`
- Server: `ec2-user@18.212.225.252:~/crm-backend/dist/routes/companies.js`

**Documentation**:
- All `.md` files in project root
- Test script: `test-csv-upload.js`
- Templates: `company-details-*.csv`

---

## 🎉 Status Summary

| Component | Status |
|-----------|--------|
| Backend API | ✅ Deployed |
| Data Source Tracking | ✅ Working |
| Authentication | ✅ Working |
| Documentation | ✅ Complete |
| Test Suite | ✅ Ready |
| CSV Templates | ✅ Available |
| Frontend Examples | ✅ Provided |
| Server Status | ✅ Online |

**→ READY FOR FRONTEND IMPLEMENTATION**

---

**Last Updated**: October 11, 2025
**Deployment**: sandbox.brandmonkz.com:3000
**Next Step**: Frontend team implements UI components
