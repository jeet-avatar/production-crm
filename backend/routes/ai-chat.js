"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const ai_orchestrator_service_1 = require("../services/ai-orchestrator.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const chatSessions = new Map();
router.post('/message', async (req, res, next) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.user.id;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }
        let session = chatSessions.get(sessionId);
        if (!session || session.userId !== userId) {
            session = {
                userId,
                conversationHistory: [],
                createdAt: new Date(),
                lastActivity: new Date(),
            };
            chatSessions.set(sessionId || userId, session);
        }
        session.lastActivity = new Date();
        const response = await ai_orchestrator_service_1.aiOrchestrator.processRequest(message, {
            userId,
            conversationHistory: session.conversationHistory,
        });
        chatSessions.set(sessionId || userId, session);
        res.json({
            success: true,
            response: response.message,
            requiresApproval: response.requiresApproval,
            approvalData: response.approvalData,
            suggestedActions: response.suggestedActions,
            completed: response.completed,
            sessionId: sessionId || userId,
        });
    }
    catch (error) {
        console.error('[AI Chat] Error:', error);
        console.error('[AI Chat] Error stack:', error.stack);
        console.error('[AI Chat] Error details:', JSON.stringify(error, null, 2));
        res.status(500).json({
            success: false,
            error: 'AI processing failed',
            details: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});
router.post('/approve', async (req, res, next) => {
    try {
        const { action, data, sessionId } = req.body;
        const userId = req.user.id;
        if (!action) {
            return res.status(400).json({ error: 'Action is required' });
        }
        const session = chatSessions.get(sessionId);
        if (!session || session.userId !== userId) {
            return res.status(403).json({ error: 'Invalid session' });
        }
        const result = await ai_orchestrator_service_1.aiOrchestrator.executeApprovedAction(action, data, userId);
        session.conversationHistory.push({
            role: 'assistant',
            content: `Action "${action}" executed. Result: ${JSON.stringify(result.result)}`,
        });
        res.json({
            success: result.success,
            result: result.result,
        });
    }
    catch (error) {
        console.error('[AI Chat] Approval error:', error);
        console.error('[AI Chat] Approval error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Action execution failed',
            details: error.message,
        });
    }
});
router.delete('/session/:sessionId', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        const session = chatSessions.get(sessionId);
        if (session && session.userId === userId) {
            chatSessions.delete(sessionId);
        }
        res.json({ success: true, message: 'Session cleared' });
    }
    catch (error) {
        console.error('[AI Chat] Session delete error:', error);
        next(error);
    }
});
router.get('/history/:sessionId', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        const session = chatSessions.get(sessionId);
        if (!session || session.userId !== userId) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json({
            success: true,
            history: session.conversationHistory,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
        });
    }
    catch (error) {
        console.error('[AI Chat] History error:', error);
        next(error);
    }
});
router.post('/quick-action', async (req, res, next) => {
    try {
        const { actionType, params } = req.body;
        const userId = req.user.id;
        const quickActions = {
            'create-campaign': `Create a new email campaign for ${params.segment || 'all contacts'} about ${params.topic || 'our latest updates'}`,
            'analyze-contacts': 'Analyze my contact database and suggest segmentation strategies',
            'email-template': `Generate an email template for ${params.purpose || 'general outreach'}`,
            'best-time': 'Suggest the best time to send my next campaign based on past performance',
        };
        const message = quickActions[actionType];
        if (!message) {
            return res.status(400).json({ error: 'Invalid quick action type' });
        }
        const sessionId = `quick-${Date.now()}`;
        const session = {
            userId,
            conversationHistory: [],
            createdAt: new Date(),
            lastActivity: new Date(),
        };
        chatSessions.set(sessionId, session);
        const response = await ai_orchestrator_service_1.aiOrchestrator.processRequest(message, {
            userId,
            conversationHistory: session.conversationHistory,
        });
        chatSessions.set(sessionId, session);
        res.json({
            success: true,
            response: response.message,
            requiresApproval: response.requiresApproval,
            approvalData: response.approvalData,
            sessionId,
        });
    }
    catch (error) {
        console.error('[AI Chat] Quick action error:', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=ai-chat.js.map