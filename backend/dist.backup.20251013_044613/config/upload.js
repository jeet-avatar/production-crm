"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_CONFIG = void 0;
exports.getMulterConfig = getMulterConfig;
exports.UPLOAD_CONFIG = {
    maxFileSize: Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10') * 1024 * 1024,
    maxFiles: Number.parseInt(process.env.MAX_CSV_FILES || '10'),
    uploadDir: process.env.UPLOAD_DIR || 'uploads/csv/',
    allowedMimeTypes: [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
};
function getMulterConfig() {
    return {
        limits: {
            fileSize: exports.UPLOAD_CONFIG.maxFileSize,
            files: exports.UPLOAD_CONFIG.maxFiles,
        },
    };
}
//# sourceMappingURL=upload.js.map