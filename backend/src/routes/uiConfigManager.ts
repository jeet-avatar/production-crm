import { Router, Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { authenticate } from '../middleware/auth';
import { prisma } from '../app';

const execAsync = promisify(exec);
const router = Router();

// Super admin email - only this user can access these endpoints
const SUPER_ADMIN_EMAIL = 'ethan@brandmonkz.com';

// Middleware to check super admin access
const requireSuperAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Access denied - Super admin only' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Apply authentication and super admin check to all routes
router.use(authenticate);
router.use(requireSuperAdmin);

const REGISTRY_PATH = path.join(__dirname, '../../../ui-registry.json');
const BACKUP_DIR = path.join(__dirname, '../../../.ui-config-backups');

// Ensure backup directory exists
const ensureBackupDir = async () => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create backup directory:', error);
  }
};

/**
 * GET /api/ui-config-manager/registry
 * Get the complete UI registry
 */
router.get('/registry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
    const registry = JSON.parse(data);
    res.json(registry);
  } catch (error) {
    console.error('Failed to load UI registry:', error);
    res.status(500).json({ error: 'Failed to load UI registry' });
  }
});

/**
 * PUT /api/ui-config-manager/registry
 * Update the entire UI registry
 */
router.put('/registry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newRegistry = req.body;

    // Validate registry structure
    if (!newRegistry.version || !newRegistry.navigation || !newRegistry.pages) {
      return res.status(400).json({ error: 'Invalid registry structure' });
    }

    await ensureBackupDir();

    // Create timestamped backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `ui-registry-${timestamp}.json`);

    const currentData = await fs.readFile(REGISTRY_PATH, 'utf-8');
    await fs.writeFile(backupPath, currentData, 'utf-8');

    // Update lastUpdated timestamp
    newRegistry.lastUpdated = new Date().toISOString();

    // Write new registry
    await fs.writeFile(
      REGISTRY_PATH,
      JSON.stringify(newRegistry, null, 2),
      'utf-8'
    );

    console.log(`✅ UI Registry updated. Backup saved to: ${backupPath}`);

    res.json({
      success: true,
      message: 'Registry updated successfully',
      backupPath,
      registry: newRegistry,
    });
  } catch (error: any) {
    console.error('Failed to update UI registry:', error);
    res.status(500).json({
      error: 'Failed to update UI registry',
      message: error.message,
    });
  }
});

/**
 * POST /api/ui-config-manager/update-nav-item
 * Update a single navigation item
 */
router.post('/update-nav-item', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId, updates } = req.body;

    if (!itemId || !updates) {
      return res.status(400).json({ error: 'itemId and updates are required' });
    }

    const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
    const registry = JSON.parse(data);

    const item = registry.navigation.sidebar.items.find((i: any) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Navigation item not found' });
    }

    // Create backup before update
    await ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `ui-registry-${timestamp}.json`);
    await fs.writeFile(backupPath, data, 'utf-8');

    // Apply updates
    Object.assign(item, updates);
    registry.lastUpdated = new Date().toISOString();

    // Save updated registry
    await fs.writeFile(
      REGISTRY_PATH,
      JSON.stringify(registry, null, 2),
      'utf-8'
    );

    console.log(`✅ Navigation item '${itemId}' updated:`, updates);

    res.json({
      success: true,
      item,
      message: `Navigation item '${itemId}' updated`,
    });
  } catch (error: any) {
    console.error('Failed to update navigation item:', error);
    res.status(500).json({
      error: 'Failed to update navigation item',
      message: error.message,
    });
  }
});

/**
 * POST /api/ui-config-manager/update-page
 * Update page configuration
 */
router.post('/update-page', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pageId, updates } = req.body;

    if (!pageId || !updates) {
      return res.status(400).json({ error: 'pageId and updates are required' });
    }

    const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
    const registry = JSON.parse(data);

    if (!registry.pages[pageId]) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Create backup
    await ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `ui-registry-${timestamp}.json`);
    await fs.writeFile(backupPath, data, 'utf-8');

    // Apply updates
    Object.assign(registry.pages[pageId], updates);
    registry.lastUpdated = new Date().toISOString();

    // Save updated registry
    await fs.writeFile(
      REGISTRY_PATH,
      JSON.stringify(registry, null, 2),
      'utf-8'
    );

    console.log(`✅ Page '${pageId}' updated:`, updates);

    res.json({
      success: true,
      page: registry.pages[pageId],
      message: `Page '${pageId}' updated`,
    });
  } catch (error: any) {
    console.error('Failed to update page:', error);
    res.status(500).json({
      error: 'Failed to update page',
      message: error.message,
    });
  }
});

/**
 * POST /api/ui-config-manager/update-theme
 * Update theme configuration
 */
router.post('/update-theme', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { updates } = req.body;

    if (!updates) {
      return res.status(400).json({ error: 'updates are required' });
    }

    const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
    const registry = JSON.parse(data);

    // Create backup
    await ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `ui-registry-${timestamp}.json`);
    await fs.writeFile(backupPath, data, 'utf-8');

    // Apply updates
    Object.assign(registry.theme, updates);
    registry.lastUpdated = new Date().toISOString();

    // Save updated registry
    await fs.writeFile(
      REGISTRY_PATH,
      JSON.stringify(registry, null, 2),
      'utf-8'
    );

    console.log(`✅ Theme updated:`, updates);

    res.json({
      success: true,
      theme: registry.theme,
      message: 'Theme updated successfully',
    });
  } catch (error: any) {
    console.error('Failed to update theme:', error);
    res.status(500).json({
      error: 'Failed to update theme',
      message: error.message,
    });
  }
});

/**
 * GET /api/ui-config-manager/backups
 * List all available backups
 */
router.get('/backups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBackupDir();

    const files = await fs.readdir(BACKUP_DIR);
    const backups = files
      .filter((file) => file.startsWith('ui-registry-') && file.endsWith('.json'))
      .map((file) => ({
        filename: file,
        path: path.join(BACKUP_DIR, file),
        timestamp: file.replace('ui-registry-', '').replace('.json', ''),
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.json({ backups });
  } catch (error: any) {
    console.error('Failed to list backups:', error);
    res.status(500).json({
      error: 'Failed to list backups',
      message: error.message,
    });
  }
});

/**
 * POST /api/ui-config-manager/restore-backup
 * Restore from a backup
 */
router.post('/restore-backup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'filename is required' });
    }

    const backupPath = path.join(BACKUP_DIR, filename);

    // Verify backup exists
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // Read backup
    const backupData = await fs.readFile(backupPath, 'utf-8');
    const backupRegistry = JSON.parse(backupData);

    // Create backup of current registry before restoring
    const currentData = await fs.readFile(REGISTRY_PATH, 'utf-8');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const preRestoreBackup = path.join(BACKUP_DIR, `pre-restore-${timestamp}.json`);
    await fs.writeFile(preRestoreBackup, currentData, 'utf-8');

    // Restore backup
    await fs.writeFile(REGISTRY_PATH, backupData, 'utf-8');

    console.log(`✅ Restored from backup: ${filename}`);

    res.json({
      success: true,
      message: `Restored from backup: ${filename}`,
      registry: backupRegistry,
      preRestoreBackup,
    });
  } catch (error: any) {
    console.error('Failed to restore backup:', error);
    res.status(500).json({
      error: 'Failed to restore backup',
      message: error.message,
    });
  }
});

/**
 * POST /api/ui-config-manager/deploy
 * Deploy UI config changes to production
 */
router.post('/deploy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commitMessage = 'UI Config Update from Admin Panel' } = req.body;

    const projectRoot = path.join(__dirname, '../../..');

    console.log('🚀 Starting deployment...');
    console.log('Project root:', projectRoot);

    const deploymentLog: string[] = [];

    try {
      // Check Git status
      const { stdout: statusOutput } = await execAsync('git status --porcelain ui-registry.json', {
        cwd: projectRoot,
      });

      if (!statusOutput.trim()) {
        return res.json({
          success: true,
          message: 'No changes to deploy',
          log: ['No changes detected in ui-registry.json'],
        });
      }

      deploymentLog.push('✓ Changes detected in ui-registry.json');

      // Add file
      await execAsync('git add ui-registry.json', { cwd: projectRoot });
      deploymentLog.push('✓ Added ui-registry.json to staging');

      // Commit
      const safeMessage = commitMessage.replace(/"/g, '\\"');
      await execAsync(`git commit -m "${safeMessage}"`, { cwd: projectRoot });
      deploymentLog.push(`✓ Committed: ${commitMessage}`);

      // Push to origin
      await execAsync('git push origin main', { cwd: projectRoot });
      deploymentLog.push('✓ Pushed to GitHub');

      // Deploy using deployment script
      const { stdout: deployOutput } = await execAsync(`./deploy "${safeMessage}"`, {
        cwd: projectRoot,
        timeout: 600000, // 10 minute timeout
      });

      deploymentLog.push('✓ Deployment script executed');
      deploymentLog.push('Deployment complete!');

      console.log('✅ Deployment successful');

      res.json({
        success: true,
        message: 'Successfully deployed to production',
        log: deploymentLog,
        commitMessage,
      });
    } catch (execError: any) {
      deploymentLog.push(`✗ Error: ${execError.message}`);
      if (execError.stderr) {
        deploymentLog.push(`stderr: ${execError.stderr}`);
      }

      console.error('❌ Deployment failed:', execError);

      res.status(500).json({
        success: false,
        error: 'Deployment failed',
        message: execError.message,
        stderr: execError.stderr,
        log: deploymentLog,
      });
    }
  } catch (error: any) {
    console.error('❌ Deployment error:', error);
    res.status(500).json({
      success: false,
      error: 'Deployment error',
      message: error.message,
    });
  }
});

/**
 * GET /api/ui-config-manager/deployment-status
 * Check if there are pending changes to deploy
 */
router.get('/deployment-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectRoot = path.join(__dirname, '../../..');

    const { stdout: statusOutput } = await execAsync('git status --porcelain ui-registry.json', {
      cwd: projectRoot,
    });

    const hasChanges = statusOutput.trim().length > 0;

    res.json({
      hasChanges,
      status: hasChanges ? 'pending' : 'clean',
      message: hasChanges ? 'Changes pending deployment' : 'No changes to deploy',
    });
  } catch (error: any) {
    console.error('Failed to check deployment status:', error);
    res.status(500).json({
      error: 'Failed to check deployment status',
      message: error.message,
    });
  }
});

export default router;
