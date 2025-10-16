"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULTS = void 0;
exports.DEFAULTS = {
    contact: {
        status: process.env.DEFAULT_CONTACT_STATUS || 'LEAD',
    },
    activity: {
        type: process.env.DEFAULT_ACTIVITY_TYPE || 'NOTE',
        priority: process.env.DEFAULT_PRIORITY || 'MEDIUM',
    },
    deal: {
        stage: process.env.DEFAULT_DEAL_STAGE || 'PROSPECTING',
        probability: Number.parseInt(process.env.DEFAULT_DEAL_PROBABILITY || '10'),
    },
    tag: {
        color: process.env.DEFAULT_TAG_COLOR || '#3B82F6',
    },
    user: {
        role: process.env.DEFAULT_USER_ROLE || 'USER',
    },
    password: {
        minLength: Number.parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
        generatedLength: Number.parseInt(process.env.GENERATED_PASSWORD_LENGTH || '12'),
    },
    analytics: {
        defaultDays: Number.parseInt(process.env.DEFAULT_ANALYTICS_DAYS || '30'),
        monthsToShow: Number.parseInt(process.env.ANALYTICS_MONTHS || '12'),
        topSourcesCount: Number.parseInt(process.env.TOP_SOURCES_COUNT || '5'),
    },
    trial: {
        days: Number.parseInt(process.env.FREE_TRIAL_DAYS || '14'),
    },
};
//# sourceMappingURL=defaults.js.map