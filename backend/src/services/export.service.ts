import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { createObjectCsvStringifier } from 'csv-writer';

const prisma = new PrismaClient();

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  dateFrom?: Date;
  dateTo?: Date;
  columns?: string[];
  limit?: number;
}

/**
 * Export Service Class
 */
export class ExportService {
  /**
   * Export users to specified format
   */
  async exportUsers(options: ExportOptions) {
    const where: any = {};

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = options.dateFrom;
      if (options.dateTo) where.createdAt.lte = options.dateTo;
    }

    const users = await prisma.user.findMany({
      where,
      take: options.limit || 10000,
      orderBy: { createdAt: 'desc' },
    });

    // Remove sensitive data
    const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);

    return this.formatData(sanitizedUsers, options.format, 'users');
  }

  /**
   * Export contacts to specified format
   */
  async exportContacts(options: ExportOptions) {
    const where: any = {};

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = options.dateFrom;
      if (options.dateTo) where.createdAt.lte = options.dateTo;
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

  /**
   * Export companies to specified format
   */
  async exportCompanies(options: ExportOptions) {
    const where: any = {};

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = options.dateFrom;
      if (options.dateTo) where.createdAt.lte = options.dateTo;
    }

    const companies = await prisma.company.findMany({
      where,
      take: options.limit || 10000,
      orderBy: { createdAt: 'desc' },
    });

    return this.formatData(companies, options.format, 'companies');
  }

  /**
   * Export deals to specified format
   */
  async exportDeals(options: ExportOptions) {
    const where: any = {};

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = options.dateFrom;
      if (options.dateTo) where.createdAt.lte = options.dateTo;
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

  /**
   * Export activities to specified format
   */
  async exportActivities(options: ExportOptions) {
    const where: any = {};

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = options.dateFrom;
      if (options.dateTo) where.createdAt.lte = options.dateTo;
    }

    const activities = await prisma.activity.findMany({
      where,
      take: options.limit || 10000,
      orderBy: { createdAt: 'desc' },
    });

    return this.formatData(activities, options.format, 'activities');
  }

  /**
   * Export email logs to specified format
   */
  async exportEmailLogs(options: ExportOptions) {
    const where: any = {};

    if (options.dateFrom || options.dateTo) {
      where.sentAt = {};
      if (options.dateFrom) where.sentAt.gte = options.dateFrom;
      if (options.dateTo) where.sentAt.lte = options.dateTo;
    }

    const emailLogs = await prisma.emailLog.findMany({
      where,
      take: options.limit || 10000,
      orderBy: { sentAt: 'desc' },
    });

    return this.formatData(emailLogs, options.format, 'email_logs');
  }

  /**
   * Export website visits to specified format
   */
  async exportWebsiteVisits(options: ExportOptions) {
    const where: any = {};

    if (options.dateFrom || options.dateTo) {
      where.visitedAt = {};
      if (options.dateFrom) where.visitedAt.gte = options.dateFrom;
      if (options.dateTo) where.visitedAt.lte = options.dateTo;
    }

    const visits = await prisma.websiteVisit.findMany({
      where,
      take: options.limit || 10000,
      orderBy: { visitedAt: 'desc' },
    });

    return this.formatData(visits, options.format, 'website_visits');
  }

  /**
   * Export campaigns to specified format
   */
  async exportCampaigns(options: ExportOptions) {
    const where: any = {};

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = options.dateFrom;
      if (options.dateTo) where.createdAt.lte = options.dateTo;
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      take: options.limit || 10000,
      orderBy: { createdAt: 'desc' },
    });

    return this.formatData(campaigns, options.format, 'campaigns');
  }

  /**
   * Format data based on requested format
   */
  private async formatData(data: any[], format: string, sheetName: string) {
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

  /**
   * Generate CSV from data
   */
  private generateCSV(data: any[], filename: string) {
    // Flatten nested objects for CSV
    const flattenedData = data.map((item) => this.flattenObject(item));

    if (flattenedData.length === 0) {
      throw new Error('No data to export');
    }

    // Get all unique keys from flattened data
    const headers = Array.from(
      new Set(flattenedData.flatMap((item) => Object.keys(item)))
    );

    // Create CSV stringifier
    const csvStringifier = createObjectCsvStringifier({
      header: headers.map((h) => ({ id: h, title: h })),
    });

    const csvContent =
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(flattenedData);

    return {
      data: csvContent,
      contentType: 'text/csv',
      filename: `${filename}_export_${Date.now()}.csv`,
    };
  }

  /**
   * Generate Excel from data
   */
  private async generateExcel(data: any[], sheetName: string) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Flatten nested objects for Excel
    const flattenedData = data.map((item) => this.flattenObject(item));

    if (flattenedData.length === 0) {
      throw new Error('No data to export');
    }

    // Get all unique keys from flattened data
    const headers = Array.from(
      new Set(flattenedData.flatMap((item) => Object.keys(item)))
    );

    // Add headers
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: 20,
    }));

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    flattenedData.forEach((item) => {
      worksheet.addRow(item);
    });

    // Auto-filter
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      data: buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${sheetName}_export_${Date.now()}.xlsx`,
    };
  }

  /**
   * Flatten nested objects for CSV/Excel export
   */
  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
          flattened[newKey] = '';
        } else if (value instanceof Date) {
          flattened[newKey] = value.toISOString();
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, this.flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          flattened[newKey] = JSON.stringify(value);
        } else {
          flattened[newKey] = value;
        }
      }
    }

    return flattened;
  }

  /**
   * Custom query export
   */
  async exportCustomQuery(
    model: string,
    where: any,
    options: ExportOptions
  ) {
    const prismaModel = (prisma as any)[model];

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

export default new ExportService();
