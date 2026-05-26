"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiKeyAnalytics = getApiKeyAnalytics;
exports.getTimeSeriesAnalytics = getTimeSeriesAnalytics;
exports.getEndpointAnalytics = getEndpointAnalytics;
exports.getProductAnalytics = getProductAnalytics;
exports.getUserAnalytics = getUserAnalytics;
exports.getRecentActivity = getRecentActivity;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function getApiKeyAnalytics(req, res) {
    try {
        const { keyId } = req.params;
        const userId = req.user?.id;
        const apiKey = await prisma.apiKey.findFirst({
            where: { id: keyId, userId },
        });
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        const usage = await prisma.apiKeyUsage.findMany({
            where: { apiKeyId: keyId },
        });
        const totalRequests = usage.length;
        const successfulRequests = usage.filter(u => u.statusCode >= 200 && u.statusCode < 300).length;
        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
        const avgResponseTime = totalRequests > 0
            ? usage.reduce((sum, u) => sum + u.responseTime, 0) / totalRequests
            : 0;
        const totalCreditsUsed = usage.reduce((sum, u) => sum + u.creditsUsed, 0);
        const errors = usage.filter(u => u.statusCode >= 400);
        const errorBreakdown = errors.reduce((acc, u) => {
            const code = u.statusCode.toString();
            acc[code] = (acc[code] || 0) + 1;
            return acc;
        }, {});
        return res.json({
            overview: {
                totalRequests,
                successfulRequests,
                successRate: Math.round(successRate * 100) / 100,
                avgResponseTime: Math.round(avgResponseTime),
                totalCreditsUsed,
                lastUsedAt: apiKey.lastUsedAt,
            },
            errorBreakdown,
        });
    }
    catch (error) {
        console.error('Error fetching API key analytics:', error);
        return res.status(500).json({ error: 'Failed to fetch analytics', message: error.message });
    }
}
async function getTimeSeriesAnalytics(req, res) {
    try {
        const { keyId } = req.params;
        const { period = '7d', granularity = 'day' } = req.query;
        const userId = req.user?.id;
        const apiKey = await prisma.apiKey.findFirst({
            where: { id: keyId, userId },
        });
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const usage = await prisma.apiKeyUsage.findMany({
            where: {
                apiKeyId: keyId,
                timestamp: { gte: startDate },
            },
            orderBy: { timestamp: 'asc' },
        });
        const groupedData = usage.reduce((acc, record) => {
            const date = record.date.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = {
                    date,
                    requests: 0,
                    successfulRequests: 0,
                    errors: 0,
                    totalResponseTime: 0,
                    creditsUsed: 0,
                };
            }
            acc[date].requests += 1;
            if (record.statusCode >= 200 && record.statusCode < 300) {
                acc[date].successfulRequests += 1;
            }
            else if (record.statusCode >= 400) {
                acc[date].errors += 1;
            }
            acc[date].totalResponseTime += record.responseTime;
            acc[date].creditsUsed += record.creditsUsed;
            return acc;
        }, {});
        const timeSeriesData = Object.values(groupedData).map((day) => ({
            date: day.date,
            requests: day.requests,
            successfulRequests: day.successfulRequests,
            errors: day.errors,
            avgResponseTime: Math.round(day.totalResponseTime / day.requests),
            creditsUsed: day.creditsUsed,
            successRate: Math.round((day.successfulRequests / day.requests) * 100 * 100) / 100,
        }));
        return res.json({ timeSeriesData, period, granularity });
    }
    catch (error) {
        console.error('Error fetching time-series analytics:', error);
        return res.status(500).json({ error: 'Failed to fetch time-series data', message: error.message });
    }
}
async function getEndpointAnalytics(req, res) {
    try {
        const { keyId } = req.params;
        const userId = req.user?.id;
        const apiKey = await prisma.apiKey.findFirst({
            where: { id: keyId, userId },
        });
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        const usage = await prisma.apiKeyUsage.findMany({
            where: { apiKeyId: keyId },
        });
        const endpointStats = usage.reduce((acc, record) => {
            const key = `${record.method} ${record.endpoint}`;
            if (!acc[key]) {
                acc[key] = {
                    endpoint: record.endpoint,
                    method: record.method,
                    requests: 0,
                    successfulRequests: 0,
                    errors: 0,
                    totalResponseTime: 0,
                    creditsUsed: 0,
                };
            }
            acc[key].requests += 1;
            if (record.statusCode >= 200 && record.statusCode < 300) {
                acc[key].successfulRequests += 1;
            }
            else if (record.statusCode >= 400) {
                acc[key].errors += 1;
            }
            acc[key].totalResponseTime += record.responseTime;
            acc[key].creditsUsed += record.creditsUsed;
            return acc;
        }, {});
        const endpointData = Object.values(endpointStats)
            .map((stat) => ({
            endpoint: stat.endpoint,
            method: stat.method,
            requests: stat.requests,
            successRate: Math.round((stat.successfulRequests / stat.requests) * 100 * 100) / 100,
            avgResponseTime: Math.round(stat.totalResponseTime / stat.requests),
            errors: stat.errors,
            creditsUsed: stat.creditsUsed,
        }))
            .sort((a, b) => b.requests - a.requests);
        return res.json({ endpoints: endpointData });
    }
    catch (error) {
        console.error('Error fetching endpoint analytics:', error);
        return res.status(500).json({ error: 'Failed to fetch endpoint analytics', message: error.message });
    }
}
async function getProductAnalytics(req, res) {
    try {
        const { keyId } = req.params;
        const userId = req.user?.id;
        const apiKey = await prisma.apiKey.findFirst({
            where: { id: keyId, userId },
        });
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        const usage = await prisma.apiKeyUsage.findMany({
            where: { apiKeyId: keyId },
        });
        const productStats = usage.reduce((acc, record) => {
            const product = record.product;
            if (!acc[product]) {
                acc[product] = {
                    product,
                    requests: 0,
                    successfulRequests: 0,
                    creditsUsed: 0,
                };
            }
            acc[product].requests += 1;
            if (record.statusCode >= 200 && record.statusCode < 300) {
                acc[product].successfulRequests += 1;
            }
            acc[product].creditsUsed += record.creditsUsed;
            return acc;
        }, {});
        const productData = Object.values(productStats)
            .map((stat) => ({
            product: stat.product,
            requests: stat.requests,
            successRate: Math.round((stat.successfulRequests / stat.requests) * 100 * 100) / 100,
            creditsUsed: stat.creditsUsed,
        }))
            .sort((a, b) => b.requests - a.requests);
        return res.json({ products: productData });
    }
    catch (error) {
        console.error('Error fetching product analytics:', error);
        return res.status(500).json({ error: 'Failed to fetch product analytics', message: error.message });
    }
}
async function getUserAnalytics(req, res) {
    try {
        const userId = req.user?.id;
        const apiKeys = await prisma.apiKey.findMany({
            where: { userId },
            include: {
                usage: true,
            },
        });
        if (apiKeys.length === 0) {
            return res.json({
                overview: {
                    totalApiKeys: 0,
                    totalRequests: 0,
                    totalCreditsUsed: 0,
                    avgSuccessRate: 0,
                },
                apiKeyBreakdown: [],
            });
        }
        let totalRequests = 0;
        let totalSuccessful = 0;
        let totalCreditsUsed = 0;
        const apiKeyBreakdown = apiKeys.map(key => {
            const keyRequests = key.usage.length;
            const keySuccessful = key.usage.filter(u => u.statusCode >= 200 && u.statusCode < 300).length;
            const keyCredits = key.usage.reduce((sum, u) => sum + u.creditsUsed, 0);
            totalRequests += keyRequests;
            totalSuccessful += keySuccessful;
            totalCreditsUsed += keyCredits;
            return {
                keyId: key.id,
                keyName: key.name,
                keyPrefix: key.keyPrefix,
                status: key.status,
                requests: keyRequests,
                creditsUsed: keyCredits,
                successRate: keyRequests > 0 ? Math.round((keySuccessful / keyRequests) * 100 * 100) / 100 : 0,
                lastUsedAt: key.lastUsedAt,
            };
        });
        const avgSuccessRate = totalRequests > 0
            ? Math.round((totalSuccessful / totalRequests) * 100 * 100) / 100
            : 0;
        return res.json({
            overview: {
                totalApiKeys: apiKeys.length,
                activeApiKeys: apiKeys.filter(k => k.status === 'ACTIVE').length,
                totalRequests,
                totalCreditsUsed,
                avgSuccessRate,
            },
            apiKeyBreakdown: apiKeyBreakdown.sort((a, b) => b.requests - a.requests),
        });
    }
    catch (error) {
        console.error('Error fetching user analytics:', error);
        return res.status(500).json({ error: 'Failed to fetch user analytics', message: error.message });
    }
}
async function getRecentActivity(req, res) {
    try {
        const { keyId } = req.params;
        const { limit = '50' } = req.query;
        const userId = req.user?.id;
        const apiKey = await prisma.apiKey.findFirst({
            where: { id: keyId, userId },
        });
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        const recentActivity = await prisma.apiKeyUsage.findMany({
            where: { apiKeyId: keyId },
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit),
            select: {
                id: true,
                endpoint: true,
                method: true,
                statusCode: true,
                responseTime: true,
                product: true,
                creditsUsed: true,
                timestamp: true,
                ipAddress: true,
                errorCode: true,
                errorMessage: true,
            },
        });
        return res.json({ activity: recentActivity });
    }
    catch (error) {
        console.error('Error fetching recent activity:', error);
        return res.status(500).json({ error: 'Failed to fetch recent activity', message: error.message });
    }
}
//# sourceMappingURL=analytics.controller.js.map