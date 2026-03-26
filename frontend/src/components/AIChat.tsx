import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  requiresApproval?: boolean;
  approvalData?: any;
  suggestedActions?: string[];
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi Rajesh! I'm your BrandMonkz AI Assistant. I know everything about the CRM — setup, contacts, campaigns, importing from NetSuite, and more. What would you like help with today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(Date.now().toString());
  const [pendingApproval, setPendingApproval] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('crmToken');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ai-chat/message`,
        {
          message: messageText,
          sessionId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Clean the response - remove any JSON blocks that might be visible
      let cleanContent = response.data.response;

      // Be VERY aggressive with JSON removal
      // Remove everything from first { to last }
      if (cleanContent.includes('{')) {
        const firstBrace = cleanContent.indexOf('{');
        // Keep only text BEFORE the first {
        cleanContent = cleanContent.substring(0, firstBrace);
      }

      // Remove any stray closing braces/brackets that might remain
      cleanContent = cleanContent.replace(/[\{\}\[\]]/g, '');

      // Remove JSON keywords
      cleanContent = cleanContent.replace(/"message":|"requiresApproval":|"approvalData":/g, '');
      cleanContent = cleanContent.replace(/\btrue\b|\bfalse\b/g, '');

      // Clean up whitespace
      cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n');
      cleanContent = cleanContent.trim();

      // If content is now empty or very short, use default message
      if (!cleanContent || cleanContent.length < 10) {
        if (response.data.requiresApproval) {
          cleanContent = "✅ I've prepared your campaign! Review the details below and click 'Approve & Create Campaign'.";
        } else {
          cleanContent = "I'm ready to help! What would you like to do?";
        }
      }

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: cleanContent,
        timestamp: new Date(),
        requiresApproval: response.data.requiresApproval,
        approvalData: response.data.approvalData,
        suggestedActions: response.data.suggestedActions,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Set pending approval if needed
      if (response.data.requiresApproval) {
        setPendingApproval(response.data.approvalData);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingApproval) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('crmToken');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ai-chat/approve`,
        {
          action: pendingApproval.action,
          data: pendingApproval.details,
          sessionId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Add success message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ Action completed successfully! ${JSON.stringify(response.data.result, null, 2)}`,
          timestamp: new Date(),
        },
      ]);

      setPendingApproval(null);
    } catch (error) {
      console.error('Approval error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Failed to execute action. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    setPendingApproval(null);
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: 'Understood. The action has been cancelled. Is there anything else I can help you with?',
        timestamp: new Date(),
      },
    ]);
  };

  const quickActions = [
    { label: '💻 New Computer Setup', prompt: 'How do I access BrandMonkz on a new computer?' },
    { label: '📥 Import Contacts', prompt: 'How do I import more contacts from NetSuite or a CSV file?' },
    { label: '📧 Create Campaign', prompt: 'Walk me through creating and sending an email campaign' },
    { label: '🔍 Lead Discovery', prompt: 'How do I use lead discovery to find new prospects?' },
  ];

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        width: '384px',
        height: '600px',
        background: 'rgba(22,22,37,0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '8px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 99999,
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">BrandMonkz AI Assistant</h3>
            <p className="text-xs text-indigo-100">Ask me anything about BrandMonkz</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : ''
              }`}
              style={message.role === 'assistant' ? {
                background: 'rgba(255,255,255,0.06)',
                color: '#CBD5E1',
                border: '1px solid rgba(255,255,255,0.1)'
              } : undefined}
            >
              <div
                className="text-sm whitespace-pre-wrap leading-relaxed"
                style={{
                  lineHeight: '1.6',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(message.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/^(\d+️⃣.*?)$/gm, '<div style="margin: 8px 0; font-weight: 600;">$1</div>')
                    .replace(/^(📊|📧|🎯|📅|🔄|🌱|⚡|📝)(.*?)$/gm, '<div style="margin: 6px 0;">$1$2</div>')
                    .replace(/\n\n/g, '<br/><br/>')
                    .replace(/\n/g, '<br/>'))
                }}
              />
              <p className="text-xs mt-2 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>

              {/* Approval Card */}
              {message.requiresApproval && pendingApproval && (
                <div className="mt-4 rounded-lg p-4" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <div className="text-sm font-bold text-green-800 mb-3 flex items-center">
                    <span className="text-lg mr-2">📋</span>
                    Campaign Ready for Approval
                  </div>

                  {pendingApproval.details && (
                    <div className="space-y-2 mb-4 text-xs">
                      {pendingApproval.details.name && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 mr-2">📧 Name:</span>
                          <span className="text-gray-900">{pendingApproval.details.name}</span>
                        </div>
                      )}
                      {pendingApproval.details.subject && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 mr-2">📝 Subject:</span>
                          <span className="text-gray-900">{pendingApproval.details.subject}</span>
                        </div>
                      )}
                      {pendingApproval.details.targetSegment && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 mr-2">🎯 Target:</span>
                          <span className="text-gray-900">{pendingApproval.details.targetSegment}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={handleApprove}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-3 px-4 rounded-lg shadow-md disabled:opacity-50 transition-all transform hover:scale-105"
                    >
                      ✓ Approve & Create Campaign
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-3 px-4 rounded-lg shadow-md disabled:opacity-50 transition-all"
                    >
                      ✗ Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Suggested actions */}
              {message.suggestedActions && message.suggestedActions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.suggestedActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(action)}
                      className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366F1' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366F1', animationDelay: '0.1s' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366F1', animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="p-3 border-t" style={{ background: 'rgba(22,22,37,0.98)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="text-xs mb-2" style={{ color: '#94A3B8' }}>Quick Actions:</div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.prompt)}
                className="text-xs py-2 px-3 rounded transition-colors"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 rounded-b-lg border-t" style={{ background: 'rgba(22,22,37,0.98)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputMessage);
          }}
          className="flex space-x-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#F1F5F9' }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
