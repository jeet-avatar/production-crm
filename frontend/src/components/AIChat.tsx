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
      content: "👋 Hi! I'm your AI assistant. I can help you create campaigns, analyze contacts, generate emails, and more. What would you like to do today?",
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
    { label: '📧 Create Campaign', prompt: 'Help me create a new email campaign' },
    { label: '📊 Analyze Contacts', prompt: 'Analyze my contact database and suggest segments' },
    { label: '✍️ Write Email', prompt: 'Help me write an email for outreach' },
    { label: '⏰ Best Time', prompt: 'When is the best time to send my next campaign?' },
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
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 99999,
        border: '1px solid #e5e7eb'
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-rose-600 text-black p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">AI Assistant</h3>
            <p className="text-xs text-orange-900">Powered by ChatGPT</p>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-black'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
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
                <div className="mt-4 bg-gradient-to-r from-green-50 to-orange-50 border-2 border-green-300 rounded-lg p-4">
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
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="p-3 bg-white border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Quick Actions:</div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.prompt)}
                className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 py-2 px-3 rounded border border-orange-200 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700 text-black px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
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
