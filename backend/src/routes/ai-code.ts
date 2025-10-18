import express from 'express';
import aiCodeOrchestrator from '../services/ai-code-orchestrator.service';

const router = express.Router();

/**
 * POST /api/ai-code/analyze
 * Analyze user command and generate code changes
 */
router.post('/analyze', async (req, res) => {
  try {
    const { command, currentPage, pageContext, conversationHistory } = req.body;

    // Security: Only allow ethan@brandmonkz.com
    const user = (req as any).user;
    if (!user || user.email !== 'ethan@brandmonkz.com') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'AI Code Assistant is only accessible by ethan@brandmonkz.com'
      });
    }

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const result = await aiCodeOrchestrator.analyzeCommand({
      command,
      currentPage,
      pageContext,
      conversationHistory: conversationHistory || []
    });

    res.json(result);
  } catch (error: any) {
    console.error('AI Code Analyze Error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/ai-code/apply
 * Apply generated code changes
 */
router.post('/apply', async (req, res) => {
  try {
    const { changes, currentPage } = req.body;

    // Security: Only allow ethan@brandmonkz.com
    const user = (req as any).user;
    if (!user || user.email !== 'ethan@brandmonkz.com') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'AI Code Assistant is only accessible by ethan@brandmonkz.com'
      });
    }

    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({ error: 'Changes array is required' });
    }

    const result = await aiCodeOrchestrator.applyChanges(changes, currentPage);

    res.json(result);
  } catch (error: any) {
    console.error('AI Code Apply Error:', error);
    res.status(500).json({
      error: 'Failed to apply changes',
      message: error.message
    });
  }
});

/**
 * POST /api/ai-code/read-file
 * Read a file from the codebase
 */
router.post('/read-file', async (req, res) => {
  try {
    const { filePath } = req.body;

    // Security: Only allow ethan@brandmonkz.com
    const user = (req as any).user;
    if (!user || user.email !== 'ethan@brandmonkz.com') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'AI Code Assistant is only accessible by ethan@brandmonkz.com'
      });
    }

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const content = await aiCodeOrchestrator.readFile(filePath);

    res.json({
      filePath,
      content
    });
  } catch (error: any) {
    console.error('Read File Error:', error);
    res.status(500).json({
      error: 'Failed to read file',
      message: error.message
    });
  }
});

/**
 * POST /api/ai-code/list-files
 * List files in a directory
 */
router.post('/list-files', async (req, res) => {
  try {
    const { dirPath } = req.body;

    // Security: Only allow ethan@brandmonkz.com
    const user = (req as any).user;
    if (!user || user.email !== 'ethan@brandmonkz.com') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'AI Code Assistant is only accessible by ethan@brandmonkz.com'
      });
    }

    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const files = await aiCodeOrchestrator.listFiles(dirPath);

    res.json({
      dirPath,
      files
    });
  } catch (error: any) {
    console.error('List Files Error:', error);
    res.status(500).json({
      error: 'Failed to list files',
      message: error.message
    });
  }
});

export default router;
