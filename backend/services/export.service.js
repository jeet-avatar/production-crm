"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const client_1 = require("@prisma/client");
const exceljs_1 = __importDefault(require("exceljs"));
const csv_writer_1 = require("csv-writer");
const prisma = new client_1.PrismaClient();
class ExportService {
    async exportUsers(options) {
        const where = {};
        if (options.dateFrom || options.dateTo) {
            where.createdAt = {};
            if (options.dateFrom)
                where.createdAt.gte = options.dateFrom;
            if (options.dateTo)
                where.createdAt.lte = options.dateTo;
        }
        const users = await prisma.user.findMany({
            where,
            take: options.limit || 10000,
            orderBy: { createdAt: 'desc' },
        });
        const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);
        return this.formatData(sanitizedUsers, options.format, 'users');
    }
    async exportContacts(options) {
        const where = {};
        if (options.dateFrom || options.dateTo) {
            where.createdAt = {};
            if (options.dateFrom)
                where.createdAt.gte = options.dateFrom;
            if (options.dateTo)
                where.createdAt.lte = options.dateTo;
        }
        const contacts = await prisma.contact.findMany({
            where,
            take: options.limit || 10000,
            orderBy: { createdAt: 'desc' },
            include: {
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        return this.formatData(contacts, options.format, 'contacts');
    }
    async exportCompanies(options) {
        const where = {};
        if (options.dateFrom || options.dateTo) {
            where.createdAt = {};
            if (options.dateFrom)
                where.createdAt.gte = options.dateFrom;
            if (options.dateTo)
                where.createdAt.lte = options.dateTo;
        }
        const companies = await prisma.company.findMany({
            where,
            take: options.limit || 10000,
            orderBy: { createdAt: 'desc' },
        });
        return this.formatData(companies, options.format, 'companies');
    }
    async exportDeals(options) {
        const where = {};
        if (options.dateFrom || options.dateTo) {
            where.createdAt = {};
            if (options.dateFrom)
                where.createdAt.gte = options.dateFrom;
            if (options.dateTo)
                where.createdAt.lte = options.dateTo;
        }
        const deals = await prisma.deal.findMany({
            where,
            take: options.limit || 10000,
            orderBy: { createdAt: 'desc' },
            include: {
                contact: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        return this.formatData(deals, options.format, 'deals');
    }
    async exportActivities(options) {
        const where = {};
        if (options.dateFrom || options.dateTo) {
            where.createdAt = {};
            if (options.dateFrom)
                where.createdAt.gte = options.dateFrom;
            if (options.dateTo)
                where.createdAt.lte = options.dateTo;
        }
        const activities = await prisma.activity.findMany({
            where,
            take: options.limit || 10000,
            orderBy: { createdAt: 'desc' },
        });
        return this.formatData(activities, options.format, 'activities');
    }
    async exportEmailLogs(options) {
        const where = {};
        if (options.dateFrom || options.dateTo) {
            where.sentAt = {};
            if (options.dateFrom)
                where.sentAt.gte = options.dateFrom;
            if (options.dateTo)
                where.sentAt.lte = options.dateTo;
        }
        const emailLogs = await prisma.emailLog.findMany({
            where,
            take: options.limit || 10000,
            orderBy: { sentAt: 'desc' },
        });
        return this.formatData(emailLogs, options.format, 'email_logs');
    }
    async exportWebsiteVisits(options) {
        const where = {};
        if (options.dateFrom || options.dateTo) {
            where.visitedAt = {};
            if (options.dateFrom)
                where.visitedAt.gte = options.dateFrom;
            if (options.dateTo)
                where.visitedAt.lte = options.dateTo;
        }
        const visits = await prisma.websiteVisit.findMany({
            where,
            take: options.limit || 10000,
            orderBy: { visitedAt: 'desc' },
        });
        return this.formatData(visits, options.format, 'website_visits');
    }
    async exportCampaigns(options) {
        const where = {};
        if (options.dateFrom || options.dateTo) {
            where.createdAt = {};
            if (options.dateFrom)
                where.createdAt.gte = options.dateFrom;
            if (options.dateTo)
                where.createdAt.lte = options.dateTo;
        }
        const campaigns = await prisma.campaign.findMany({
            where,
            take: options.limit || 10000,
            orderBy: { createdAt: 'desc' },
        });
        return this.formatData(campaigns, options.format, 'campaigns');
    }
    async formatData(data, format, sheetName) {
        if (data.length === 0) {
            throw new Error('No data to export');
        }
        switch (format) {
            case 'json':
                return {
                    data: JSON.stringify(data, null, 2),
                    contentType: 'application/json',
                    filename: `${sheetName}_export_${Date.now()}.json`,
                };
            case 'csv':
                return this.generateCSV(data, sheetName);
            case 'xlsx':
                return await this.generateExcel(data, sheetName);
            default:
                throw new Error('Invalid export format');
        }
    }
    generateCSV(data, filename) {
        const flattenedData = data.map((item) => this.flattenObject(item));
        if (flattenedData.length === 0) {
            throw new Error('No data to export');
        }
        const headers = Array.from(new Set(flattenedData.flatMap((item) => Object.keys(item))));
        const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
            header: headers.map((h) => ({ id: h, title: h })),
        });
        const csvContent = csvStringifier.getHeaderString() +
            csvStringifier.stringifyRecords(flattenedData);
        return {
            data: csvContent,
            contentType: 'text/csv',
            filename: `${filename}_export_${Date.now()}.csv`,
        };
    }
    async generateExcel(data, sheetName) {
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);
        const flattenedData = data.map((item) => this.flattenObject(item));
        if (flattenedData.length === 0) {
            throw new Error('No data to export');
        }
        const headers = Array.from(new Set(flattenedData.flatMap((item) => Object.keys(item))));
        worksheet.columns = headers.map((header) => ({
            header,
            key: header,
            width: 20,
        }));
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        };
        flattenedData.forEach((item) => {
            worksheet.addRow(item);
        });
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: headers.length },
        };
        const buffer = await workbook.xlsx.writeBuffer();
        return {
            data: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename: `${sheetName}_export_${Date.now()}.xlsx`,
        };
    }
    flattenObject(obj, prefix = '') {
        const flattened = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;
                if (value === null || value === undefined) {
                    flattened[newKey] = '';
                }
                else if (value instanceof Date) {
                    flattened[newKey] = value.toISOString();
                }
                else if (typeof value === 'object' && !Array.isArray(value)) {
                    Object.assign(flattened, this.flattenObject(value, newKey));
                }
                else if (Array.isArray(value)) {
                    flattened[newKey] = JSON.stringify(value);
                }
                else {
                    flattened[newKey] = value;
                }
            }
        }
        return flattened;
    }
    async exportCustomQuery(model, where, options) {
        const prismaModel = prisma[model];
        if (!prismaModel) {
            throw new Error('Invalid model name');
        }
        const data = await prismaModel.findMany({
            where,
            take: options.limit || 10000,
        });
        return this.formatData(data, options.format, model);
    }
}
exports.ExportService = ExportService;
exports.default = new ExportService();
//# sourceMappingURL=export.service.js.map