"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app_1 = require("../app");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const multer_1 = __importDefault(require("multer"));
const csv = __importStar(require("csv-parse/sync"));
const fs = __importStar(require("fs"));
const VCard = __importStar(require("vcard-parser"));
const XLSX = __importStar(require("xlsx"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: 'uploads/csv/' });
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const imports = await app_1.prisma.csvImport.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ imports });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const csvImport = await app_1.prisma.csvImport.findFirst({
            where: { id, userId },
        });
        if (!csvImport) {
            throw new errorHandler_1.AppError('Import not found', 404);
        }
        res.json({ import: csvImport });
    }
    catch (error) {
        next(error);
    }
});
router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { entityType, mapping } = req.body;
        if (!req.file) {
            throw new errorHandler_1.AppError('No file uploaded', 400);
        }
        if (!entityType || !['contacts', 'companies', 'deals'].includes(entityType)) {
            throw new errorHandler_1.AppError('Invalid entity type', 400);
        }
        let records = [];
        if (req.file.originalname.endsWith('.vcf') || req.file.originalname.endsWith('.vcard')) {
            const fileContent = fs.readFileSync(req.file.path, 'utf-8');
            const vCards = VCard.parseVCards(fileContent);
            records = vCards
                .map((vcard) => {
                const nameParts = vcard.fn?.value?.split(' ').filter((part) => part.trim()) || [];
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                const email = vcard.email?.[0]?.value || '';
                const phone = vcard.tel?.[0]?.value || '';
                const company = vcard.org?.[0]?.value || '';
                return {
                    firstName,
                    lastName,
                    email,
                    phone,
                    company,
                    status: 'LEAD'
                };
            })
                .filter((record) => record.firstName && record.firstName.trim());
        }
        else if (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            records = XLSX.utils.sheet_to_json(worksheet);
        }
        else {
            const fileContent = fs.readFileSync(req.file.path, 'utf-8');
            records = csv.parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
            });
        }
        const csvImport = await app_1.prisma.csvImport.create({
            data: {
                userId,
                filename: req.file.originalname,
                entityType,
                totalRows: records.length,
                mapping: mapping ? JSON.parse(mapping) : {},
                status: 'PENDING',
            },
        });
        fs.unlinkSync(req.file.path);
        logger_1.logger.info(`File uploaded: ${req.file.originalname}, ${records.length} rows`);
        res.status(201).json({
            message: 'File uploaded successfully',
            import: csvImport,
            preview: records.slice(0, 5),
            headers: Object.keys(records[0] || {}),
        });
    }
    catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
});
router.post('/:id/process', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { data, mapping } = req.body;
        const csvImport = await app_1.prisma.csvImport.findFirst({
            where: { id, userId },
        });
        if (!csvImport) {
            throw new errorHandler_1.AppError('Import not found', 404);
        }
        if (csvImport.status !== 'PENDING') {
            throw new errorHandler_1.AppError('Import already processed', 400);
        }
        await app_1.prisma.csvImport.update({
            where: { id },
            data: {
                status: 'PROCESSING',
                startedAt: new Date(),
                mapping,
            },
        });
        let successCount = 0;
        let failedCount = 0;
        const errors = [];
        for (let i = 0; i < data.length; i++) {
            try {
                const row = data[i];
                if (csvImport.entityType === 'contacts') {
                    const firstName = row[mapping.firstName]?.trim();
                    const lastName = row[mapping.lastName]?.trim();
                    if (!firstName) {
                        continue;
                    }
                    await app_1.prisma.contact.create({
                        data: {
                            userId,
                            firstName,
                            lastName: lastName || '',
                            email: row[mapping.email] || null,
                            phone: row[mapping.phone] || null,
                            status: row[mapping.status] || 'LEAD',
                        },
                    });
                }
                else if (csvImport.entityType === 'companies') {
                    const companyName = row[mapping.name]?.trim();
                    if (!companyName) {
                        continue;
                    }
                    await app_1.prisma.company.create({
                        data: {
                            userId,
                            name: companyName,
                            domain: row[mapping.domain] || null,
                            industry: row[mapping.industry] || null,
                            website: row[mapping.website] || null,
                            location: row[mapping.location] || null,
                        },
                    });
                }
                successCount++;
            }
            catch (err) {
                failedCount++;
                errors.push({
                    row: i + 1,
                    error: err.message,
                });
            }
        }
        const completedImport = await app_1.prisma.csvImport.update({
            where: { id },
            data: {
                status: successCount > 0 ? 'COMPLETED' : 'FAILED',
                processedRows: data.length,
                successRows: successCount,
                failedRows: failedCount,
                errors: errors.length > 0 ? errors : null,
                completedAt: new Date(),
            },
        });
        logger_1.logger.info(`CSV import completed: ${id}, ${successCount} success, ${failedCount} failed`);
        res.json({
            message: 'Import completed',
            import: completedImport,
        });
    }
    catch (error) {
        await app_1.prisma.csvImport.update({
            where: { id: req.params.id },
            data: {
                status: 'FAILED',
                completedAt: new Date(),
            },
        });
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const csvImport = await app_1.prisma.csvImport.findFirst({
            where: { id, userId },
        });
        if (!csvImport) {
            throw new errorHandler_1.AppError('Import not found', 404);
        }
        await app_1.prisma.csvImport.delete({
            where: { id },
        });
        logger_1.logger.info(`CSV import deleted: ${id}`);
        res.json({ message: 'Import deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=csvImport.js.map