"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticate);
router.delete('/cleanup', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        console.log(`🗑️  Admin cleanup initiated by user: ${userId}`);
        const deletedContacts = await prisma.contact.deleteMany({
            where: { userId }
        });
        const deletedCompanies = await prisma.company.deleteMany({
            where: { userId }
        });
        const deletedDeals = await prisma.deal.deleteMany({
            where: { userId }
        });
        const deletedActivities = await prisma.activity.deleteMany({
            where: { userId }
        });
        const deletedCampaigns = await prisma.campaign.deleteMany({
            where: { userId }
        });
        const deletedTags = await prisma.tag.deleteMany({
            where: { userId }
        });
        console.log(`✅ Cleanup complete:
      - Contacts: ${deletedContacts.count}
      - Companies: ${deletedCompanies.count}
      - Deals: ${deletedDeals.count}
      - Activities: ${deletedActivities.count}
      - Campaigns: ${deletedCampaigns.count}
      - Tags: ${deletedTags.count}
    `);
        res.json({
            message: 'All data deleted successfully',
            deleted: {
                contacts: deletedContacts.count,
                companies: deletedCompanies.count,
                deals: deletedDeals.count,
                activities: deletedActivities.count,
                campaigns: deletedCampaigns.count,
                tags: deletedTags.count,
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/stats', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const contactsCount = await prisma.contact.count({ where: { userId } });
        const companiesCount = await prisma.company.count({ where: { userId } });
        const dealsCount = await prisma.deal.count({ where: { userId } });
        const activitiesCount = await prisma.activity.count({ where: { userId } });
        const campaignsCount = await prisma.campaign.count({ where: { userId } });
        const tagsCount = await prisma.tag.count({ where: { userId } });
        res.json({
            stats: {
                contacts: contactsCount,
                companies: companiesCount,
                deals: dealsCount,
                activities: activitiesCount,
                campaigns: campaignsCount,
                tags: tagsCount,
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map