import { Router } from 'express';
import { prisma } from '../app';
import { AI_CONFIG } from '../config/ai';
import { execSync } from 'child_process';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    const dbHealthy = true;

    // Check PM2 configuration
    let pm2Status = {
      healthy: false,
      processFound: false,
      scriptPath: 'unknown',
      correctPath: false,
      status: 'unknown',
    };

    try {
      const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
      const processes = JSON.parse(pm2List);
      const crmBackend = processes.find((p: any) => p.name === 'crm-backend');

      if (crmBackend) {
        const scriptPath = crmBackend.pm2_env?.pm_exec_path || 'unknown';
        // Accept both dist/server.js and backend/server.js (flat structure)
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
    } catch (pm2Error) {
      // PM2 check failed, but don't crash health endpoint
      pm2Status.healthy = false;
    }

    const health = {
      status: pm2Status.healthy && dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      deployment: {
        tokenSecurityGuardRemoved: true, // Deployment marker for verification
        lastDeployment: new Date().toISOString(),
        gitCommit: process.env.GIT_COMMIT || 'unknown',
      },
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        pm2: pm2Status,
        ai: true ? 'enabled' : 'disabled',
        aiKeyPresent: !!process.env.ANTHROPIC_API_KEY,
        aiKeyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'none',
        aiModel: AI_CONFIG.model,
        aiModelEnv: process.env.ANTHROPIC_MODEL || 'not-set',
      },
      responseTime: `${Date.now() - startTime}ms`,
    };

    res.status(200).json(health);
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'unhealthy',
        ai: true ? 'enabled' : 'disabled',
      },
    });
  }
});

export default router;
