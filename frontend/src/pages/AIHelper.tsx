import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DialogContext {
  currentStep: 'idle' | 'creating' | 'inherit' | 'submitting';
  workingPlan: Partial<any> | null;
  collectedData: Record<string, any>;
  history: Array<{ role: string; content: string }>;
}

export default function AIHelper() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是您的数字遗产助手。请问需要什么帮助？\n\n我可以帮您：\n• 创建遗产计划\n• 继承遗产计划\n• 提交监护人份额\n• 查询计划状态\n\n输入"帮助"查看所有可用功能。',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<DialogContext>({
    currentStep: 'idle',
    workingPlan: null,
    collectedData: {},
    history: []
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!currentUser?.id) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          userId: currentUser.id,
          context
        })
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.nextContext) {
        setContext(data.nextContext);
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，服务器暂时无法响应，请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, context, currentUser]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 滚动到底部
  useEffect(() => {
    const container = document.getElementById('chat-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50"
    >
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">返回</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">遗产助手</h1>
                <p className="text-sm text-gray-500">智能管理您的数字遗产</p>
              </div>
            </div>
            <div className="w-16"></div> {/* 占位 */}
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div 
          id="chat-container"
          className="h-[calc(100vh-220px)] overflow-y-auto space-y-4 mb-6"
        >
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </div>
                <div className={`max-w-[75%] ${
                  message.role === 'user' ? 'text-right' : ''
                }`}>
                  <div className={`inline-block px-5 py-3 rounded-2xl shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 加载状态 */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="h-5 w-5 text-gray-600" />
              </div>
              <div className="bg-white px-5 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题或命令..."
              disabled={isLoading}
              className="flex-1 px-5 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all text-gray-800 placeholder-gray-400"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-xl hover:from-primary-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Send className="h-5 w-5" />
              <span className="hidden sm:inline">发送</span>
            </button>
          </div>
          
          {/* 快捷命令提示 */}
          <div className="flex flex-wrap gap-2 mt-4">
            {['创建计划', '查看计划', '继承计划', '提交份额', '帮助'].map((cmd) => (
              <button
                key={cmd}
                onClick={() => setInputValue(cmd)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}