"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ai_code_orchestrator_service_1 = __importDefault(require("../services/ai-code-orchestrator.service"));
const router = express_1.default.Router();
router.post('/analyze', async (req, res) => {
    try {
        const { command, currentPage, pageContext, conversationHistory } = req.body;
        const user = req.user;
        if (!user || user.email !== 'ethan@brandmonkz.com') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'AI Code Assistant is only accessible by ethan@brandmonkz.com'
            });
        }
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }
        const result = await ai_code_orchestrator_service_1.default.analyzeCommand({
            command,
            currentPage,
            pageContext,
            conversationHistory: conversationHistory || []
        });
        res.json(result);
    }
    catch (error) {
        console.error('AI Code Analyze Error:', error);
        res.status(500).json({
            error: 'Analysis failed',
            message: error.message
        });
    }
});
router.post('/apply', async (req, res) => {
    try {
        const { changes, currentPage } = req.body;
        const user = req.user;
        if (!user || user.email !== 'ethan@brandmonkz.com') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'AI Code Assistant is only accessible by ethan@brandmonkz.com'
            });
        }
        if (!changes || !Array.isArray(changes)) {
            return res.status(400).json({ error: 'Changes array is required' });
        }
        const result = await ai_code_orchestrator_service_1.default.applyChanges(changes, currentPage);
        res.json(result);
    }
    catch (error) {
        console.error('AI Code Apply Error:', error);
        res.status(500).json({
            error: 'Failed to apply changes',
            message: error.message
        });
    }
});
router.post('/read-file', async (req, res) => {
    try {
        const { filePath } = req.body;
        const user = req.user;
        if (!user || user.email !== 'ethan@brandmonkz.com') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'AI Code Assistant is only accessible by ethan@brandmonkz.com'
            });
        }
        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }
        const content = await ai_code_orchestrator_service_1.default.readFile(filePath);
        res.json({
            filePath,
            content
        });
    }
    catch (error) {
        console.error('Read File Error:', error);
        res.status(500).json({
            error: 'Failed to read file',
            message: error.message
        });
    }
});
router.post('/list-files', async (req, res) => {
    try {
        const { dirPath } = req.body;
        const user = req.user;
        if (!user || user.email !== 'ethan@brandmonkz.com') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'AI Code Assistant is only accessible by ethan@brandmonkz.com'
            });
        }
        if (!dirPath) {
            return res.status(400).json({ error: 'Directory path is required' });
        }
        const files = await ai_code_orchestrator_service_1.default.listFiles(dirPath);
        res.json({
            dirPath,
            files
        });
    }
    catch (error) {
        console.error('List Files Error:', error);
        res.status(500).json({
            error: 'Failed to list files',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=ai-code.js.map