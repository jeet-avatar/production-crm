"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const auth_1 = require("../middleware/auth");
const app_1 = require("../app");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const router = (0, express_1.Router)();
const SUPER_ADMIN_EMAIL = 'ethan@brandmonkz.com';
const requireSuperAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await app_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (!user || user.email !== SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ error: 'Access denied - Super admin only' });
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
router.use(auth_1.authenticate);
router.use(requireSuperAdmin);
const REGISTRY_PATH = path_1.default.join(__dirname, '../../../ui-registry.json');
const BACKUP_DIR = path_1.default.join(__dirname, '../../../.ui-config-backups');
const ensureBackupDir = async () => {
    try {
        await fs_1.promises.mkdir(BACKUP_DIR, { recursive: true });
    }
    catch (error) {
        console.error('Failed to create backup directory:', error);
    }
};
router.get('/registry', async (req, res, next) => {
    try {
        const data = await fs_1.promises.readFile(REGISTRY_PATH, 'utf-8');
        const registry = JSON.parse(data);
        res.json(registry);
    }
    catch (error) {
        console.error('Failed to load UI registry:', error);
        res.status(500).json({ error: 'Failed to load UI registry' });
    }
});
router.put('/registry', async (req, res, next) => {
    try {
        const newRegistry = req.body;
        if (!newRegistry.version || !newRegistry.navigation || !newRegistry.pages) {
            return res.status(400).json({ error: 'Invalid registry structure' });
        }
        await ensureBackupDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path_1.default.join(BACKUP_DIR, `ui-registry-${timestamp}.json`);
        const currentData = await fs_1.promises.readFile(REGISTRY_PATH, 'utf-8');
        await fs_1.promises.writeFile(backupPath, currentData, 'utf-8');
        newRegistry.lastUpdated = new Date().toISOString();
        await fs_1.promises.writeFile(REGISTRY_PATH, JSON.stringify(newRegistry, null, 2), 'utf-8');
        console.log(`✅ UI Registry updated. Backup saved to: ${backupPath}`);
        res.json({
            success: true,
            message: 'Registry updated successfully',
            backupPath,
            registry: newRegistry,
        });
    }
    catch (error) {
        console.error('Failed to update UI registry:', error);
        res.status(500).json({
            error: 'Failed to update UI registry',
            message: error.message,
        });
    }
});
router.post('/update-nav-item', async (req, res, next) => {
    try {
        const { itemId, updates } = req.body;
        if (!itemId || !updates) {
            return res.status(400).json({ error: 'itemId and updates are required' });
        }
        const data = await fs_1.promises.readFile(REGISTRY_PATH, 'utf-8');
        const registry = JSON.parse(data);
        const item = registry.navigation.sidebar.items.find((i) => i.id === itemId);
        if (!item) {
            return res.status(404).json({ error: 'Navigation item not found' });
        }
        await ensureBackupDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path_1.default.join(BACKUP_DIR, `ui-registry-${timestamp}.json`);
        await fs_1.promises.writeFile(backupPath, data, 'utf-8');
        Object.assign(item, updates);
        registry.lastUpdated = new Date().toISOString();
        await fs_1.promises.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
        console.log(`✅ Navigation item '${itemId}' updated:`, updates);
        res.json({
            success: true,
            item,
            message: `Navigation item '${itemId}' updated`,
        });
    }
    catch (error) {
        console.error('Failed to update navigation item:', error);
        res.status(500).json({
            error: 'Failed to update navigation item',
            message: error.message,
        });
    }
});
router.post('/update-page', async (req, res, next) => {
    try {
        const { pageId, updates } = req.body;
        if (!pageId || !updates) {
            return res.status(400).json({ error: 'pageId and updates are required' });
        }
        const data = await fs_1.promises.readFile(REGISTRY_PATH, 'utf-8');
        const registry = JSON.parse(data);
        if (!registry.pages[pageId]) {
            return res.status(404).json({ error: 'Page not found' });
        }
        await ensureBackupDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path_1.default.join(BACKUP_DIR, `ui-registry-${timestamp}.json`);
        await fs_1.promises.writeFile(backupPath, data, 'utf-8');
        Object.assign(registry.pages[pageId], updates);
        registry.lastUpdated = new Date().toISOString();
        await fs_1.promises.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
        console.log(`✅ Page '${pageId}' updated:`, updates);
        res.json({
            success: true,
            page: registry.pages[pageId],
            message: `Page '${pageId}' updated`,
        });
    }
    catch (error) {
        console.error('Failed to update page:', error);
        res.status(500).json({
            error: 'Failed to update page',
            message: error.message,
        });
    }
});
router.post('/update-theme', async (req, res, next) => {
    try {
        const { updates } = req.body;
        if (!updates) {
            return res.status(400).json({ error: 'updates are required' });
        }
        const data = await fs_1.promises.readFile(REGISTRY_PATH, 'utf-8');
        const registry = JSON.parse(data);
        await ensureBackupDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path_1.default.join(BACKUP_DIR, `ui-registry-${timestamp}.json`);
        await fs_1.promises.writeFile(backupPath, data, 'utf-8');
        Object.assign(registry.theme, updates);
        registry.lastUpdated = new Date().toISOString();
        await fs_1.promises.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
        console.log(`✅ Theme updated:`, updates);
        res.json({
            success: true,
            theme: registry.theme,
            message: 'Theme updated successfully',
        });
    }
    catch (error) {
        console.error('Failed to update theme:', error);
        res.status(500).json({
            error: 'Failed to update theme',
            message: error.message,
        });
    }
});
router.get('/backups', async (req, res, next) => {
    try {
        await ensureBackupDir();
        const files = await fs_1.promises.readdir(BACKUP_DIR);
        const backups = files
            .filter((file) => file.startsWith('ui-registry-') && file.endsWith('.json'))
            .map((file) => ({
            filename: file,
            path: path_1.default.join(BACKUP_DIR, file),
            timestamp: file.replace('ui-registry-', '').replace('.json', ''),
        }))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        res.json({ backups });
    }
    catch (error) {
        console.error('Failed to list backups:', error);
        res.status(500).json({
            error: 'Failed to list backups',
            message: error.message,
        });
    }
});
router.post('/restore-backup', async (req, res, next) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({ error: 'filename is required' });
        }
        const backupPath = path_1.default.join(BACKUP_DIR, filename);
        try {
            await fs_1.promises.access(backupPath);
        }
        catch {
            return res.status(404).json({ error: 'Backup file not found' });
        }
        const backupData = await fs_1.promises.readFile(backupPath, 'utf-8');
        const backupRegistry = JSON.parse(backupData);
        const currentData = await fs_1.promises.readFile(REGISTRY_PATH, 'utf-8');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const preRestoreBackup = path_1.default.join(BACKUP_DIR, `pre-restore-${timestamp}.json`);
        await fs_1.promises.writeFile(preRestoreBackup, currentData, 'utf-8');
        await fs_1.promises.writeFile(REGISTRY_PATH, backupData, 'utf-8');
        console.log(`✅ Restored from backup: ${filename}`);
        res.json({
            success: true,
            message: `Restored from backup: ${filename}`,
            registry: backupRegistry,
            preRestoreBackup,
        });
    }
    catch (error) {
        console.error('Failed to restore backup:', error);
        res.status(500).json({
            error: 'Failed to restore backup',
            message: error.message,
        });
    }
});
router.post('/deploy', async (req, res, next) => {
    try {
        const { commitMessage = 'UI Config Update from Admin Panel' } = req.body;
        const projectRoot = path_1.default.join(__dirname, '../../..');
        console.log('🚀 Starting deployment...');
        console.log('Project root:', projectRoot);
        const deploymentLog = [];
        try {
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
            await execAsync('git add ui-registry.json', { cwd: projectRoot });
            deploymentLog.push('✓ Added ui-registry.json to staging');
            const safeMessage = commitMessage.replace(/"/g, '\\"');
            await execAsync(`git commit -m "${safeMessage}"`, { cwd: projectRoot });
            deploymentLog.push(`✓ Committed: ${commitMessage}`);
            await execAsync('git push origin main', { cwd: projectRoot });
            deploymentLog.push('✓ Pushed to GitHub');
            const { stdout: deployOutput } = await execAsync(`./deploy "${safeMessage}"`, {
                cwd: projectRoot,
                timeout: 600000,
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
        }
        catch (execError) {
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
    }
    catch (error) {
        console.error('❌ Deployment error:', error);
        res.status(500).json({
            success: false,
            error: 'Deployment error',
            message: error.message,
        });
    }
});
router.get('/deployment-status', async (req, res, next) => {
    try {
        const projectRoot = path_1.default.join(__dirname, '../../..');
        const { stdout: statusOutput } = await execAsync('git status --porcelain ui-registry.json', {
            cwd: projectRoot,
        });
        const hasChanges = statusOutput.trim().length > 0;
        res.json({
            hasChanges,
            status: hasChanges ? 'pending' : 'clean',
            message: hasChanges ? 'Changes pending deployment' : 'No changes to deploy',
        });
    }
    catch (error) {
        console.error('Failed to check deployment status:', error);
        res.status(500).json({
            error: 'Failed to check deployment status',
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=uiConfigManager.js.map