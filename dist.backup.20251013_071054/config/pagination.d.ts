export declare const PAGINATION_CONFIG: {
    defaultPageSize: number;
    defaultActivityLimit: number;
    defaultDealsLimit: number;
    maxPageSize: number;
    defaultPage: number;
};
export declare function getPaginationParams(query: any, type?: 'default' | 'activity' | 'deals'): {
    page: number;
    limit: number;
    skip: number;
};
//# sourceMappingURL=pagination.d.ts.map