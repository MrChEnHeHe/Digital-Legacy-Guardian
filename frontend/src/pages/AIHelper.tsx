import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, AnimateSharedLayout } from 'framer-motion';
import { Send, Brain, User, ArrowLeft, Sparkles, MessageSquare, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LLMContext {
  messages: Array<{ role: string; content: string }>;
  history: Array<{ role: string; content: string }>;
  workingPlan: Partial<any> | null;
  collectedData: Record<string, any>;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  context: LLMContext;
  createdAt: Date;
  updatedAt: Date;
}

export default function AIHelper() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);
  const [pinnedSessionId, setPinnedSessionId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    // 使用sessionStorage读取登录状态（关闭浏览器后自动清除）
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    } else {
      navigate('/login');
    }

    // 加载历史对话
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      const restoredSessions = parsed.map((s: any) => ({
        ...s,
        messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      }));
      
      // 去重：根据会话ID去除重复项
      const uniqueSessions = restoredSessions.filter(
        (session: ChatSession, index: number, self: ChatSession[]) =>
          index === self.findIndex((s) => s.id === session.id)
      );
      
      setSessions(uniqueSessions);
      
      // 如果有历史会话，默认选中最后一个
      if (uniqueSessions.length > 0) {
        setCurrentSession(uniqueSessions[uniqueSessions.length - 1]);
      }
    } else {
      // 创建默认会话
      createNewSession();
    }
    
    // 加载置顶状态
    const savedPinnedId = localStorage.getItem('pinnedSessionId');
    if (savedPinnedId) {
      setPinnedSessionId(savedPinnedId);
    }
  }, [navigate]);

  useEffect(() => {
    // 保存会话到本地存储
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [{
        id: '1',
        role: 'assistant',
        content: '您好！我是您的数字遗产智能助手。请问需要什么帮助？\n\n我可以帮您：\n• 创建遗产计划\n• 继承遗产计划\n• 提交监护人份额\n• 查询计划状态\n\n您可以用自然语言描述您的需求，例如：\n"创建一个名为\'我的数字遗产\'的计划"\n"帮我查看所有计划"\n"继承计划ID xxx"',
        timestamp: new Date()
      }],
      context: {
        messages: [],
        history: [],
        workingPlan: null,
        collectedData: {}
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);
  };

  const saveSession = (updatedSession: ChatSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      if (remaining.length > 0) {
        setCurrentSession(remaining[remaining.length - 1]);
      } else {
        createNewSession();
      }
    }
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const startRenameSession = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const saveRenameSession = (sessionId: string) => {
    if (!editingTitle.trim()) return;
    
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, title: editingTitle.trim(), updatedAt: new Date() }
        : s
    ));
    
    // 如果当前会话正在被编辑，更新当前会话
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title: editingTitle.trim() } : null);
    }
    
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const cancelRename = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const togglePinSession = (sessionId: string) => {
    const newPinnedId = pinnedSessionId === sessionId ? null : sessionId;
    setPinnedSessionId(newPinnedId);
    // 保存到localStorage
    localStorage.setItem('pinnedSessionId', newPinnedId || '');
  };

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!currentUser?.id || !currentSession) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    const updatedMessages = [...currentSession.messages, userMessage];
    
    // 更新会话标题（使用第一条用户消息）
    let newTitle = currentSession.title;
    if (currentSession.messages.length === 1 && currentSession.messages[0].role === 'assistant') {
      newTitle = inputValue.substring(0, 30) + (inputValue.length > 30 ? '...' : '');
    }

    const updatedSession: ChatSession = {
      ...currentSession,
      title: newTitle,
      messages: updatedMessages,
      updatedAt: new Date()
    };

    setCurrentSession(updatedSession);
    saveSession(updatedSession);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/ai/llm-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          userId: currentUser.id,
          context: currentSession.context
        })
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedMessages, assistantMessage],
        context: data.nextContext || currentSession.context,
        updatedAt: new Date()
      };

      setCurrentSession(finalSession);
      saveSession(finalSession);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，服务器暂时无法响应，请稍后重试。',
        timestamp: new Date()
      };

      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedMessages, errorMessage],
        updatedAt: new Date()
      };

      setCurrentSession(finalSession);
      saveSession(finalSession);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, currentSession, currentUser]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    const container = document.getElementById('chat-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [currentSession?.messages]);

  // 点击外部区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isMenuButton = target.closest('[title="更多选项"]');
      const isMenu = target.closest('.absolute.right-0');
      if (!isMenuButton && !isMenu) {
        setOpenMenuSessionId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600">正在加载对话...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex"
    >
      {/* 侧边栏 */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white shadow-lg border-r border-gray-100 flex flex-col overflow-hidden"
      >
        {isSidebarOpen && (
          <>
            {/* 侧边栏头部 */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  历史对话
                </h2>
                <button
                  onClick={createNewSession}
                  className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                  title="新建对话"
                >
                  <Plus className="h-5 w-5 text-purple-600" />
                </button>
              </div>
              
              {/* 搜索框 */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索对话..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence>
                {sessions
                  .filter(session => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      session.title.toLowerCase().includes(query) ||
                      session.messages.some(msg => 
                        msg.content.toLowerCase().includes(query)
                      )
                    );
                  })
                  .sort((a, b) => {
                    // 置顶会话排在最前面
                    if (a.id === pinnedSessionId) return -1;
                    if (b.id === pinnedSessionId) return 1;
                    return 0;
                  })
                  .map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onClick={() => selectSession(session)}
                    className={`p-3 cursor-pointer transition-colors border-l-2 ${
                      currentSession.id === session.id
                        ? 'bg-purple-50 border-purple-500'
                        : 'hover:bg-gray-50 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {editingSessionId === session.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRenameSession(session.id);
                                if (e.key === 'Escape') cancelRename();
                              }}
                              className="flex-1 px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:border-purple-500"
                              autoFocus
                            />
                            <button
                              onClick={() => saveRenameSession(session.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelRename}
                              className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {pinnedSessionId === session.id && (
                              <svg className="h-3 w-3 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                              </svg>
                            )}
                            <p className="font-medium text-sm text-gray-800 truncate">
                              {session.title}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {session.messages.length} 条消息
                        </p>
                        <p className="text-xs text-gray-400">
                          {session.updatedAt.toLocaleDateString('zh-CN', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      
                      {/* 三点菜单按钮 */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuSessionId(openMenuSessionId === session.id ? null : session.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="更多选项"
                        >
                          <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                          </svg>
                        </button>
                        
                        {/* 下拉菜单 */}
                        {openMenuSessionId === session.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                startRenameSession(session);
                                setOpenMenuSessionId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              编辑标题
                            </button>
                            <button
                              onClick={() => {
                                togglePinSession(session.id);
                                setOpenMenuSessionId(null);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                pinnedSessionId === session.id ? 'text-purple-600' : 'text-gray-700'
                              }`}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                              </svg>
                              {pinnedSessionId === session.id ? '取消置顶' : '置顶'}
                            </button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button
                              onClick={() => {
                                deleteSession(session.id);
                                setOpenMenuSessionId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              删除
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 侧边栏底部 */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 py-2"
              >
                <ChevronRight className="h-5 w-5" />
                <span className="text-sm">收起侧边栏</span>
              </button>
            </div>
          </>
        )}
      </motion.aside>

      {/* 展开侧边栏按钮 */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white shadow-lg rounded-r-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      )}

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部导航 */}
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
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">智能遗产助手</h1>
                  <p className="text-sm text-gray-500">自然语言交互 · Deepseek驱动</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="text-xs text-gray-500">在线</span>
              </div>
            </div>
          </div>
        </div>

        {/* 对话区域 */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 py-6 h-full flex flex-col">
            <div 
              id="chat-container"
              className="flex-1 overflow-y-auto space-y-4 mb-6"
            >
              <AnimatePresence>
                {currentSession.messages.map((message) => (
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
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="h-5 w-5" />
                      ) : (
                        <Brain className="h-5 w-5" />
                      )}
                    </div>
                    <div className={`max-w-[75%] ${
                      message.role === 'user' ? 'text-right' : ''
                    }`}>
                      <div className={`inline-block px-5 py-3 rounded-2xl shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-br-md'
                          : 'bg-gradient-to-r from-purple-50 to-pink-50 text-gray-800 rounded-bl-md border border-purple-100'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        {message.role === 'assistant' && <span className="ml-1">✨</span>}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="px-5 py-3 rounded-2xl rounded-bl-md shadow-sm bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
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
                  placeholder="输入自然语言指令..."
                  disabled={isLoading}
                  className="flex-1 px-5 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all text-gray-800 placeholder-gray-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Send className="h-5 w-5" />
                  <span className="hidden sm:inline">发送</span>
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {['创建一个名为"我的遗产"的计划', '帮我查看所有计划', '继承计划ID xxx', '提交份额', '帮助'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => setInputValue(cmd)}
                    className="px-4 py-2 text-sm bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
