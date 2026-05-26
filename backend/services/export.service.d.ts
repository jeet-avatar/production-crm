import ExcelJS from 'exceljs';
export interface ExportOptions {
    format: 'csv' | 'xlsx' | 'json';
    dateFrom?: Date;
    dateTo?: Date;
    columns?: string[];
    limit?: number;
}
export declare class ExportService {
    exportUsers(options: ExportOptions): Promise<{
        data: ExcelJS.Buffer;
        contentType: string;
        filename: string;
    } | {
        data: string;
        contentType: string;
        filename: string;
    }>;
    exportContacts(options: ExportOptions): Promise<{
        data: ExcelJS.Buffer;
        contentType: string;
        filename: string;
    } | {
        data: string;
        contentType: string;
        filename: string;
    }>;
    exportCompanies(options: ExportOptions): Promise<{
        data: ExcelJS.Buffer;
        contentType: string;
        filename: string;
    } | {
        data: string;
        contentType: string;
        filename: string;
    }>;
    exportDeals(options: ExportOptions): Promise<{
        data: ExcelJS.Buffer;
        contentType: string;
        filename: string;
    } | {
        data: string;
        contentType: string;
        filename: string;
    }>;
    exportActivities(options: ExportOptions): Promise<{
        data: ExcelJS.Buffer;
        contentType: string;
        filename: string;
    } | {
        data: string;
        contentType: string;
        filename: string;
    }>;
    exportEmailLogs(options: ExportOptions): Promise<{
        data: ExcelJS.Buffer;
        contentType: string;
        filename: string;
    } | {
        data: string;
        contentType: string;
        filename: string;
    }>;
    exportWebsiteVisits(options: ExportOptions): Promise<{
        data: ExcelJS.Buffer;
        contentType: string;
        filename: string;
    } | {
        data: string;
        contentType: string;
        filename: string;
    }>;
    exportCampaigns(options: ExportOptions): Promise<{
        data: ExcelJS.Buffer;
        contentType: string;
        filename: string;
    } | {
        data: string;
        contentType: string;
        filename: string;
    }>;
    private formatData;
    private generateCSV;
    private generateExcel;
    private flattenObject;
    exportCustomQuery(model: string, where: any, options: ExportOptions): Promise<{
        data: ExcelJS.Buffer;
        contentType: string;
        filename: string;
    } | {
        data: string;
        contentType: string;
        filename: string;
    }>;
}
declare const _default: ExportService;
export default _default;
//# sourceMappingURL=export.service.d.ts.map