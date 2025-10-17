import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { chatbotOpenAI } from '../services/chatbot-openai.service';
import { prisma } from '../app';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

interface ChatSession {
  userId: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: Date;
  lastActivity: Date;
}

// In-memory session storage (consider Redis for production)
const chatSessions = new Map<string, ChatSession>();

/**
 * POST /api/ai-chat/message
 * Send message to AI orchestrator
 */
router.post('/message', async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user!.id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session
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

    // Update last activity
    session.lastActivity = new Date();

    // Process request through AI orchestrator
    const response = await chatbotOpenAI.processRequest(message, {
      userId,
      conversationHistory: session.conversationHistory,
    });

    // Save updated session
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
  } catch (error: any) {
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

/**
 * POST /api/ai-chat/approve
 * Approve and execute AI-suggested action
 */
router.post('/approve', async (req, res, next) => {
  try {
    const { action, data, sessionId } = req.body;
    const userId = req.user!.id;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Verify session belongs to user
    const session = chatSessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Invalid session' });
    }

    // Execute approved action
    const result = await chatbotOpenAI.executeApprovedAction(action, data, userId);

    // Add execution result to conversation history
    session.conversationHistory.push({
      role: 'assistant',
      content: `Action "${action}" executed. Result: ${JSON.stringify(result.result)}`,
    });

    res.json({
      success: result.success,
      result: result.result,
    });
  } catch (error: any) {
    console.error('[AI Chat] Approval error:', error);
    console.error('[AI Chat] Approval error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Action execution failed',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/ai-chat/session/:sessionId
 * Clear chat session
 */
router.delete('/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const session = chatSessions.get(sessionId);
    if (session && session.userId === userId) {
      chatSessions.delete(sessionId);
    }

    res.json({ success: true, message: 'Session cleared' });
  } catch (error: any) {
    console.error('[AI Chat] Session delete error:', error);
    next(error);
  }
});

/**
 * GET /api/ai-chat/history/:sessionId
 * Get chat history
 */
router.get('/history/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

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
  } catch (error: any) {
    console.error('[AI Chat] History error:', error);
    next(error);
  }
});

/**
 * POST /api/ai-chat/quick-action
 * Execute quick actions (pre-defined templates)
 */
router.post('/quick-action', async (req, res, next) => {
  try {
    const { actionType, params } = req.body;
    const userId = req.user!.id;

    const quickActions: Record<string, string> = {
      'create-campaign': `Create a new email campaign for ${params.segment || 'all contacts'} about ${params.topic || 'our latest updates'}`,
      'analyze-contacts': 'Analyze my contact database and suggest segmentation strategies',
      'email-template': `Generate an email template for ${params.purpose || 'general outreach'}`,
      'best-time': 'Suggest the best time to send my next campaign based on past performance',
    };

    const message = quickActions[actionType];
    if (!message) {
      return res.status(400).json({ error: 'Invalid quick action type' });
    }

    // Create new session for quick action
    const sessionId = `quick-${Date.now()}`;
    const session: ChatSession = {
      userId,
      conversationHistory: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    chatSessions.set(sessionId, session);

    // Process as regular message
    const response = await chatbotOpenAI.processRequest(message, {
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
  } catch (error: any) {
    console.error('[AI Chat] Quick action error:', error);
    next(error);
  }
});

export default router;
