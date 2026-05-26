"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/theme', (_req, res) => {
    res.status(200).json({
        theme: {
            name: 'TEST - Route is working!',
            primaryColor: '#F97316',
            secondaryColor: '#EC4899',
            buttonStyles: {
                gradients: {
                    pages: {
                        pricing: {
                            free: { gradient: 'from-gray-500 to-gray-600', hover: 'from-gray-600 to-gray-700' },
                            starter: { gradient: 'from-blue-500 to-cyan-500', hover: 'from-blue-600 to-cyan-600', shadow: 'shadow-blue-500/50' },
                            professional: { gradient: 'from-purple-500 to-pink-500', hover: 'from-purple-600 to-pink-600', shadow: 'shadow-purple-500/50' },
                            enterprise: { gradient: 'from-orange-500 to-red-500', hover: 'from-orange-600 to-red-600', shadow: 'shadow-orange-500/50' },
                        },
                    },
                },
            },
        },
    });
});
router.get('/active', (_req, res) => {
    res.status(200).json({
        theme: {
            name: 'BrandMonkz Default',
            primaryColor: '#F97316',
            secondaryColor: '#EC4899',
            buttonStyles: {
                gradients: {
                    brand: {
                        primary: {
                            gradient: 'from-orange-400 to-rose-500',
                            hover: 'from-orange-500 to-rose-600',
                            shadow: 'shadow-orange-500/50',
                        },
                        secondary: {
                            gradient: 'from-gray-600 to-gray-700',
                            hover: 'from-gray-700 to-gray-800',
                            shadow: 'shadow-gray-600/50',
                        },
                    },
                    semantic: {
                        success: {
                            gradient: 'from-green-600 to-emerald-600',
                            hover: 'from-green-700 to-emerald-700',
                            shadow: 'shadow-green-600/50',
                        },
                        warning: {
                            gradient: 'from-yellow-500 to-orange-500',
                            hover: 'from-yellow-600 to-orange-600',
                            shadow: 'shadow-yellow-500/50',
                        },
                        danger: {
                            gradient: 'from-red-600 to-orange-600',
                            hover: 'from-red-700 to-orange-700',
                            shadow: 'shadow-red-600/50',
                        },
                        info: {
                            gradient: 'from-blue-500 to-cyan-500',
                            hover: 'from-blue-600 to-cyan-600',
                            shadow: 'shadow-blue-500/50',
                        },
                        premium: {
                            gradient: 'from-purple-600 to-pink-600',
                            hover: 'from-purple-700 to-pink-700',
                            shadow: 'shadow-purple-600/50',
                        },
                    },
                    pages: {
                        settings: {
                            profile: { gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/30' },
                            account: { gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/30' },
                            notifications: { gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/30' },
                            security: { gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/30' },
                            preferences: { gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/30' },
                            billing: { gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/30' },
                        },
                        dashboard: {
                            deals: { gradient: 'from-orange-500 to-red-500' },
                            contacts: { gradient: 'from-blue-500 to-cyan-500' },
                            companies: { gradient: 'from-purple-500 to-pink-500' },
                            activities: { gradient: 'from-indigo-500 to-purple-500' },
                        },
                        campaigns: {
                            sent: { gradient: 'from-blue-500 to-cyan-500', lightBg: 'bg-blue-50' },
                            opened: { gradient: 'from-green-500 to-emerald-500', lightBg: 'bg-green-50' },
                            clicked: { gradient: 'from-purple-500 to-pink-500', lightBg: 'bg-purple-50' },
                            bounced: { gradient: 'from-red-500 to-orange-500', lightBg: 'bg-red-50' },
                        },
                        pricing: {
                            free: { gradient: 'from-gray-500 to-gray-600', hover: 'from-gray-600 to-gray-700' },
                            starter: { gradient: 'from-blue-500 to-cyan-500', hover: 'from-blue-600 to-cyan-600', shadow: 'shadow-blue-500/50' },
                            professional: { gradient: 'from-purple-500 to-pink-500', hover: 'from-purple-600 to-pink-600', shadow: 'shadow-purple-500/50' },
                            enterprise: { gradient: 'from-orange-500 to-red-500', hover: 'from-orange-600 to-red-600', shadow: 'shadow-orange-500/50' },
                        },
                    },
                },
            },
        },
        branding: {
            appName: 'BrandMonkz CRM',
            companyName: 'BrandMonkz',
            tagline: 'Elevate Your Brand, Amplify Your Growth',
            version: '1.0.0',
        },
    });
});
exports.default = router;
//# sourceMappingURL=uiConfig.js.map