import { logger } from '../utils/logger';
import { SUPERMEMORY_CONFIG } from '../config/supermemory';
import axios from 'axios';

interface SystemEvent {
  type: 'deployment' | 'pm2_config' | 'api_health' | 'error' | 'warning';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
}

interface PM2ProcessInfo {
  name: string;
  script: string;
  status: string;
  restarts: number;
  uptime: number;
}

class SystemMonitorService {
  private readonly supermemoryEnabled: boolean;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastKnownGoodConfig: PM2ProcessInfo | null = null;

  constructor() {
    this.supermemoryEnabled = SUPERMEMORY_CONFIG.enabled;
  }

  /**
   * Initialize system monitoring with periodic health checks
   */
  public initialize(): void {
    logger.info('🔍 [SYSTEM-MONITOR] Initializing system monitoring service');

    // Log startup event
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

    // Start periodic health checks (every 5 minutes)
    this.startHealthChecks();

    // Log PM2 configuration
    this.validatePM2Configuration();
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(
      async () => {
        await this.performHealthCheck();
      },
      5 * 60 * 1000,
    ); // Every 5 minutes

    logger.info('🔍 [SYSTEM-MONITOR] Health checks scheduled every 5 minutes');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const healthStatus = {
        timestamp: new Date(),
        api: await this.checkAPIHealth(),
        pm2: await this.checkPM2Status(),
        memory: this.checkMemoryUsage(),
        uptime: process.uptime(),
      };

      // Log health check results
      if (!healthStatus.api.healthy || !healthStatus.pm2.healthy) {
        await this.logSystemEvent({
          type: 'api_health',
          severity: 'error',
          message: 'Health check failed',
          details: healthStatus,
          timestamp: new Date(),
        });

        logger.error('❌ [SYSTEM-MONITOR] Health check failed', healthStatus);
      } else {
        logger.info('✅ [SYSTEM-MONITOR] Health check passed');
      }
    } catch (error) {
      logger.error('❌ [SYSTEM-MONITOR] Health check error:', error);
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

  /**
   * Check API health
   */
  private async checkAPIHealth(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Check if server is responding to basic requests
      const response = await axios.get('http://localhost:3000/health', {
        timeout: 5000,
      });

      return {
        healthy: response.status === 200,
        details: response.data,
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check PM2 process status
   */
  private async checkPM2Status(): Promise<{ healthy: boolean; details: any }> {
    try {
      const { execSync } = await import('child_process');
      const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
      const processes = JSON.parse(pm2List);

      const crmBackend = processes.find((p: any) => p.name === 'crm-backend');

      if (!crmBackend) {
        return {
          healthy: false,
          details: { error: 'CRM Backend process not found in PM2' },
        };
      }

      const processInfo: PM2ProcessInfo = {
        name: crmBackend.name,
        script: crmBackend.pm2_env?.pm_exec_path || 'unknown',
        status: crmBackend.pm2_env?.status || 'unknown',
        restarts: crmBackend.pm2_env?.restart_time || 0,
        uptime: crmBackend.pm2_env?.pm_uptime || 0,
      };

      // Check if running correct script path
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

      // Store last known good configuration
      this.lastKnownGoodConfig = processInfo;

      return {
        healthy: true,
        details: processInfo,
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemoryUsage(): any {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    // Warn if memory usage is high (>1GB heap used)
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

  /**
   * Validate PM2 configuration on startup
   */
  private async validatePM2Configuration(): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
      const processes = JSON.parse(pm2List);

      const crmBackend = processes.find((p: any) => p.name === 'crm-backend');

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
          logger.error('🚨 [SYSTEM-MONITOR] PM2 CONFIGURATION DRIFT DETECTED!');
          logger.error(`   Current: ${scriptPath}`);
          logger.error(`   Expected: /var/www/crm-backend/backend/dist/server.js`);
          logger.error('   Run: pm2 delete crm-backend && cd /var/www/crm-backend/backend && pm2 start dist/server.js --name crm-backend && pm2 save');
        }
      }
    } catch (error) {
      logger.error('❌ [SYSTEM-MONITOR] Failed to validate PM2 configuration:', error);
    }
  }

  /**
   * Log system event to SuperMemory
   */
  private async logSystemEvent(event: SystemEvent): Promise<void> {
    try {
      // Always log to console
      const logMessage = `[${event.type.toUpperCase()}] ${event.severity.toUpperCase()}: ${event.message}`;
      if (event.severity === 'error' || event.severity === 'critical') {
        logger.error(logMessage, event.details);
      } else if (event.severity === 'warning') {
        logger.warn(logMessage, event.details);
      } else {
        logger.info(logMessage, event.details);
      }

      // Send to SuperMemory if enabled
      if (this.supermemoryEnabled && SUPERMEMORY_CONFIG.apiKey) {
        await this.sendToSuperMemory(event);
      }
    } catch (error) {
      logger.error('❌ [SYSTEM-MONITOR] Failed to log system event:', error);
    }
  }

  /**
   * Send event to SuperMemory for long-term learning
   */
  private async sendToSuperMemory(event: SystemEvent): Promise<void> {
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

      await axios.post(
        `${SUPERMEMORY_CONFIG.baseUrl}/memories`,
        memoryContent,
        {
          headers: {
            Authorization: `Bearer ${SUPERMEMORY_CONFIG.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );

      logger.info('✅ [SYSTEM-MONITOR] Event logged to SuperMemory');
    } catch (error) {
      logger.error('❌ [SYSTEM-MONITOR] Failed to send to SuperMemory:', error);
    }
  }

  /**
   * Log deployment event
   */
  public async logDeployment(details: Record<string, any>): Promise<void> {
    await this.logSystemEvent({
      type: 'deployment',
      severity: 'info',
      message: 'Deployment completed',
      details,
      timestamp: new Date(),
    });
  }

  /**
   * Log API error
   */
  public async logAPIError(error: Error, context: Record<string, any>): Promise<void> {
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

  /**
   * Shutdown monitoring service
   */
  public shutdown(): void {
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

    logger.info('🔍 [SYSTEM-MONITOR] System monitoring service shutdown');
  }
}

// Export singleton instance
export const systemMonitor = new SystemMonitorService();
