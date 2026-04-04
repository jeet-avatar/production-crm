"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticate);
function classifyStream(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    if (/netsuite|oracle netsuite|netsuite administrator|netsuite developer|erp/.test(text))
        return 'NetSuite';
    if (/cybersecurity|cyber security|security analyst|soc analyst|siem|penetration testing|infosec/.test(text))
        return 'Cybersecurity';
    if (/recruiter|talent acquisition|hr manager|human resources|staffing/.test(text))
        return 'Staffing/HR';
    return 'Other';
}
router.get('/fetch', async (req, res) => {
    try {
        const { stream } = req.query;
        const response = await axios_1.default.get('https://remotive.com/api/remote-jobs?search=india', {
            timeout: 15000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'BrandMonkz-CRM/1.0',
            },
        });
        if (!response.data || !Array.isArray(response.data.jobs)) {
            return res.json({ leads: [], total: 0, streams: {}, error: 'Unexpected response from job board' });
        }
        const leads = response.data.jobs.map((job) => ({
            id: job.id,
            title: job.title,
            companyName: job.company_name,
            companyLogo: job.company_logo || null,
            url: job.url,
            location: job.candidate_required_location || 'Remote',
            postedAt: job.publication_date,
            stream: classifyStream(job.title || '', job.description || ''),
            tags: job.tags || [],
        }));
        const streams = { NetSuite: 0, Cybersecurity: 0, 'Staffing/HR': 0, Other: 0 };
        for (const lead of leads) {
            streams[lead.stream] = (streams[lead.stream] || 0) + 1;
        }
        const filtered = stream ? leads.filter((l) => l.stream === stream) : leads;
        return res.json({ leads: filtered, total: filtered.length, streams });
    }
    catch (error) {
        console.error('Job leads fetch error:', error.message);
        return res.json({ leads: [], total: 0, streams: {}, error: 'Failed to fetch from job board' });
    }
});
router.post('/import', async (req, res) => {
    try {
        const { leads } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ error: 'No leads provided' });
        }
        const importedCompanyIds = [];
        let importedCount = 0;
        for (const lead of leads) {
            try {
                let company = await prisma.company.findFirst({
                    where: { name: lead.companyName, userId },
                });
                if (!company) {
                    company = await prisma.company.create({
                        data: {
                            name: lead.companyName,
                            website: lead.url || '',
                            industry: lead.stream,
                            tags: [lead.stream, 'job-lead'],
                            dataSource: 'job_board',
                            userId,
                        },
                    });
                }
                importedCompanyIds.push(company.id);
                await prisma.contact.create({
                    data: {
                        firstName: 'Hiring',
                        lastName: 'Manager',
                        title: lead.title,
                        source: 'job_board',
                        notes: `Job posting: ${lead.url}\nStream: ${lead.stream}\nLocation: ${lead.location}`,
                        status: 'LEAD',
                        companyId: company.id,
                        userId,
                    },
                });
                importedCount++;
            }
            catch (leadError) {
                console.error(`Failed to import lead for ${lead.companyName}:`, leadError.message);
            }
        }
        return res.json({ imported: importedCount, companies: importedCompanyIds });
    }
    catch (error) {
        console.error('Job leads import error:', error.message);
        return res.status(500).json({ error: 'Failed to import leads', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=job-leads.routes.js.map