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
exports.systemMonitor = void 0;
const logger_1 = require("../utils/logger");
const supermemory_1 = require("../config/supermemory");
const axios_1 = __importDefault(require("axios"));
class SystemMonitorService {
    constructor() {
        this.healthCheckInterval = null;
        this.lastKnownGoodConfig = null;
        this.supermemoryEnabled = supermemory_1.SUPERMEMORY_CONFIG.enabled;
    }
    initialize() {
        logger_1.logger.info('🔍 [SYSTEM-MONITOR] Initializing system monitoring service');
        this.logSystemEvent({
            type: 'deployment',
            severity: 'info',
            message: 'CRM Backend service started',
            details: {
                nodeVersion: process.version,
                platform: process.platform,
                env: process.env.NODE_ENV || 'development',
                pid: process.pid,
                startTime: new Date().toISOString(),
            },
            timestamp: new Date(),
        });
        this.startHealthChecks();
        this.validatePM2Configuration();
    }
    startHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 5 * 60 * 1000);
        logger_1.logger.info('🔍 [SYSTEM-MONITOR] Health checks scheduled every 5 minutes');
    }
    async performHealthCheck() {
        try {
            const healthStatus = {
                timestamp: new Date(),
                api: await this.checkAPIHealth(),
                pm2: await this.checkPM2Status(),
                memory: this.checkMemoryUsage(),
                uptime: process.uptime(),
            };
            if (!healthStatus.api.healthy || !healthStatus.pm2.healthy) {
                await this.logSystemEvent({
                    type: 'api_health',
                    severity: 'error',
                    message: 'Health check failed',
                    details: healthStatus,
                    timestamp: new Date(),
                });
                logger_1.logger.error('❌ [SYSTEM-MONITOR] Health check failed', healthStatus);
            }
            else {
                logger_1.logger.info('✅ [SYSTEM-MONITOR] Health check passed');
            }
        }
        catch (error) {
            logger_1.logger.error('❌ [SYSTEM-MONITOR] Health check error:', error);
            await this.logSystemEvent({
                type: 'error',
                severity: 'critical',
                message: 'Health check failed with error',
                details: {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
                timestamp: new Date(),
            });
        }
    }
    async checkAPIHealth() {
        try {
            const response = await axios_1.default.get('http://localhost:3000/health', {
                timeout: 5000,
            });
            return {
                healthy: response.status === 200,
                details: response.data,
            };
        }
        catch (error) {
            return {
                healthy: false,
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    async checkPM2Status() {
        try {
            const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
            const processes = JSON.parse(pm2List);
            const crmBackend = processes.find((p) => p.name === 'crm-backend');
            if (!crmBackend) {
                return {
                    healthy: false,
                    details: { error: 'CRM Backend process not found in PM2' },
                };
            }
            const processInfo = {
                name: crmBackend.name,
                script: crmBackend.pm2_env?.pm_exec_path || 'unknown',
                status: crmBackend.pm2_env?.status || 'unknown',
                restarts: crmBackend.pm2_env?.restart_time || 0,
                uptime: crmBackend.pm2_env?.pm_uptime || 0,
            };
            const expectedScriptPath = '/var/www/crm-backend/backend/dist/server.js';
            const isCorrectScript = processInfo.script.includes('dist/server.js');
            if (!isCorrectScript) {
                await this.logSystemEvent({
                    type: 'pm2_config',
                    severity: 'critical',
                    message: 'PM2 running incorrect script path - CONFIGURATION DRIFT DETECTED',
                    details: {
                        currentScript: processInfo.script,
                        expectedScript: expectedScriptPath,
                        processInfo,
                    },
                    timestamp: new Date(),
                });
                return {
                    healthy: false,
                    details: {
                        error: 'Incorrect PM2 script path',
                        currentScript: processInfo.script,
                        expectedScript: expectedScriptPath,
                    },
                };
            }
            this.lastKnownGoodConfig = processInfo;
            return {
                healthy: true,
                details: processInfo,
            };
        }
        catch (error) {
            return {
                healthy: false,
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    checkMemoryUsage() {
        const memUsage = process.memoryUsage();
        const memUsageMB = {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
        };
        if (memUsageMB.heapUsed > 1024) {
            this.logSystemEvent({
                type: 'warning',
                severity: 'warning',
                message: 'High memory usage detected',
                details: memUsageMB,
                timestamp: new Date(),
            });
        }
        return memUsageMB;
    }
    async validatePM2Configuration() {
        try {
            const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
            const processes = JSON.parse(pm2List);
            const crmBackend = processes.find((p) => p.name === 'crm-backend');
            if (crmBackend) {
                const scriptPath = crmBackend.pm2_env?.pm_exec_path || 'unknown';
                const isCorrectPath = scriptPath.includes('dist/server.js');
                await this.logSystemEvent({
                    type: 'pm2_config',
                    severity: isCorrectPath ? 'info' : 'critical',
                    message: isCorrectPath
                        ? 'PM2 configuration validated - correct script path'
                        : 'PM2 configuration invalid - wrong script path detected',
                    details: {
                        scriptPath,
                        expectedPath: '/var/www/crm-backend/backend/dist/server.js',
                        status: crmBackend.pm2_env?.status,
                        restarts: crmBackend.pm2_env?.restart_time,
                    },
                    timestamp: new Date(),
                });
                if (!isCorrectPath) {
                    logger_1.logger.error('🚨 [SYSTEM-MONITOR] PM2 CONFIGURATION DRIFT DETECTED!');
                    logger_1.logger.error(`   Current: ${scriptPath}`);
                    logger_1.logger.error(`   Expected: /var/www/crm-backend/backend/dist/server.js`);
                    logger_1.logger.error('   Run: pm2 delete crm-backend && cd /var/www/crm-backend/backend && pm2 start dist/server.js --name crm-backend && pm2 save');
                }
            }
        }
        catch (error) {
            logger_1.logger.error('❌ [SYSTEM-MONITOR] Failed to validate PM2 configuration:', error);
        }
    }
    async logSystemEvent(event) {
        try {
            const logMessage = `[${event.type.toUpperCase()}] ${event.severity.toUpperCase()}: ${event.message}`;
            if (event.severity === 'error' || event.severity === 'critical') {
                logger_1.logger.error(logMessage, event.details);
            }
            else if (event.severity === 'warning') {
                logger_1.logger.warn(logMessage, event.details);
            }
            else {
                logger_1.logger.info(logMessage, event.details);
            }
            if (this.supermemoryEnabled && supermemory_1.SUPERMEMORY_CONFIG.apiKey) {
                await this.sendToSuperMemory(event);
            }
        }
        catch (error) {
            logger_1.logger.error('❌ [SYSTEM-MONITOR] Failed to log system event:', error);
        }
    }
    async sendToSuperMemory(event) {
        try {
            const memoryContent = {
                title: `System Event: ${event.type}`,
                content: `
**Event Type**: ${event.type}
**Severity**: ${event.severity}
**Message**: ${event.message}
**Timestamp**: ${event.timestamp.toISOString()}

**Details**:
${JSON.stringify(event.details, null, 2)}

---
This event was automatically logged by the CRM system monitoring service.
        `.trim(),
                metadata: {
                    eventType: event.type,
                    severity: event.severity,
                    timestamp: event.timestamp.toISOString(),
                },
            };
            await axios_1.default.post(`${supermemory_1.SUPERMEMORY_CONFIG.baseUrl}/memories`, memoryContent, {
                headers: {
                    Authorization: `Bearer ${supermemory_1.SUPERMEMORY_CONFIG.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            });
            logger_1.logger.info('✅ [SYSTEM-MONITOR] Event logged to SuperMemory');
        }
        catch (error) {
            logger_1.logger.error('❌ [SYSTEM-MONITOR] Failed to send to SuperMemory:', error);
        }
    }
    async logDeployment(details) {
        await this.logSystemEvent({
            type: 'deployment',
            severity: 'info',
            message: 'Deployment completed',
            details,
            timestamp: new Date(),
        });
    }
    async logAPIError(error, context) {
        await this.logSystemEvent({
            type: 'error',
            severity: 'error',
            message: `API Error: ${error.message}`,
            details: {
                error: error.message,
                stack: error.stack,
                ...context,
            },
            timestamp: new Date(),
        });
    }
    shutdown() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        this.logSystemEvent({
            type: 'deployment',
            severity: 'info',
            message: 'CRM Backend service shutting down',
            details: {
                uptime: process.uptime(),
                shutdownTime: new Date().toISOString(),
            },
            timestamp: new Date(),
        });
        logger_1.logger.info('🔍 [SYSTEM-MONITOR] System monitoring service shutdown');
    }
}
exports.systemMonitor = new SystemMonitorService();
//# sourceMappingURL=system-monitor.service.js.map