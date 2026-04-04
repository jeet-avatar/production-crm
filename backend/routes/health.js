"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app_1 = require("../app");
const ai_1 = require("../config/ai");
const child_process_1 = require("child_process");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const startTime = Date.now();
    try {
        await app_1.prisma.$queryRaw `SELECT 1`;
        const dbHealthy = true;
        let pm2Status = {
            healthy: false,
            processFound: false,
            scriptPath: 'unknown',
            correctPath: false,
            status: 'unknown',
        };
        try {
            const pm2List = (0, child_process_1.execSync)('pm2 jlist', { encoding: 'utf-8' });
            const processes = JSON.parse(pm2List);
            const crmBackend = processes.find((p) => p.name === 'crm-backend');
            if (crmBackend) {
                const scriptPath = crmBackend.pm2_env?.pm_exec_path || 'unknown';
                const isCorrectPath = scriptPath.includes('dist/server.js') ||
                    scriptPath.endsWith('backend/server.js');
                pm2Status = {
                    healthy: isCorrectPath && crmBackend.pm2_env?.status === 'online',
                    processFound: true,
                    scriptPath,
                    correctPath: isCorrectPath,
                    status: crmBackend.pm2_env?.status || 'unknown',
                };
            }
        }
        catch (pm2Error) {
            pm2Status.healthy = false;
        }
        const health = {
            status: pm2Status.healthy && dbHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            deployment: {
                tokenSecurityGuardRemoved: true,
                lastDeployment: new Date().toISOString(),
                gitCommit: process.env.GIT_COMMIT || 'unknown',
            },
            services: {
                database: dbHealthy ? 'healthy' : 'unhealthy',
                pm2: pm2Status,
                ai: ai_1.AI_CONFIG.enabled ? 'enabled' : 'disabled',
                aiKeyPresent: !!process.env.ANTHROPIC_API_KEY,
                aiKeyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'none',
                aiModel: ai_1.AI_CONFIG.model,
                aiModelEnv: process.env.ANTHROPIC_MODEL || 'not-set',
            },
            responseTime: `${Date.now() - startTime}ms`,
        };
        res.status(200).json(health);
    }
    catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message,
            services: {
                database: 'unhealthy',
                ai: ai_1.AI_CONFIG.enabled ? 'enabled' : 'disabled',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map