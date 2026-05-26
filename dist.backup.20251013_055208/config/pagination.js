"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGINATION_CONFIG = void 0;
exports.getPaginationParams = getPaginationParams;
exports.PAGINATION_CONFIG = {
    defaultPageSize: Number.parseInt(process.env.DEFAULT_PAGE_SIZE || '10'),
    defaultActivityLimit: Number.parseInt(process.env.DEFAULT_ACTIVITY_LIMIT || '20'),
    defaultDealsLimit: Number.parseInt(process.env.DEFAULT_DEALS_LIMIT || '50'),
    maxPageSize: Number.parseInt(process.env.MAX_PAGE_SIZE || '100'),
    defaultPage: 1,
};
function getPaginationParams(query, type = 'default') {
    let defaultLimit = exports.PAGINATION_CONFIG.defaultPageSize;
    if (type === 'activity') {
        defaultLimit = exports.PAGINATION_CONFIG.defaultActivityLimit;
    }
    else if (type === 'deals') {
        defaultLimit = exports.PAGINATION_CONFIG.defaultDealsLimit;
    }
    const page = Number.parseInt(query.page || String(exports.PAGINATION_CONFIG.defaultPage));
    const limit = Math.min(Number.parseInt(query.limit || String(defaultLimit)), exports.PAGINATION_CONFIG.maxPageSize);
    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
}
//# sourceMappingURL=pagination.js.map