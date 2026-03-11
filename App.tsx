import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { LoadingIndicator } from './components/LoadingIndicator';
import { Message, Role } from './types';
import { sendPromptToBackend, parseSatellitePrompt } from './services/api';
import {
  ChatSession,
  getAllSessions,
  createSession,
  getSessionWithMessages,
  addMessageToSession,
  deleteSession
} from './services/chatStore';
import { UI_COLORS } from './constants';

function App() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mode, setMode] = useState<'chat' | 'satellite' | 'places'>('chat');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Chat history state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const fetchedSessions = await getAllSessions();
    setSessions(fetchedSessions);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleNewChat = async () => {
    if (mode === 'chat') {
      const newSession = await createSession("New Chat");
      if (newSession) {
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setMessages([]);
      }
    } else {
      // For Places/Satellite, just clear messages locally
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId.startsWith('local-')) {
      setActiveSessionId(sessionId);
      return;
    }
    const session = await getSessionWithMessages(sessionId);
    if (session && session.messages) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (sessionId.startsWith('local-')) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
      return;
    }
    const success = await deleteSession(sessionId);
    if (success) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    let currentSessionId = activeSessionId;

    // Only create a backend session for Chat mode
    // Places & Satellite work directly with external APIs — no session needed
    if (mode === 'chat') {
      if (!currentSessionId) {
        const newSession = await createSession(input.slice(0, 50));
        if (newSession) {
          currentSessionId = newSession.id;
          setActiveSessionId(currentSessionId);
          setSessions(prev => [newSession, ...prev]);
        } else {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: Role.ASSISTANT,
            content: 'Error: Failed to create a chat session. Is the backend running and reachable at VITE_API_BASE_URL?',
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
      }
    } else {
      // For Places/Satellite modes, use a local session ID so messages still render
      if (!currentSessionId) {
        currentSessionId = `local-${Date.now()}`;
        setActiveSessionId(currentSessionId);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Only persist to backend in chat mode
    if (mode === 'chat' && currentSessionId && !currentSessionId.startsWith('local-')) {
      await addMessageToSession(currentSessionId, 'user', userMessage.content);
    }

    // Reset height of textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }

    try {
      if (mode === 'places') {
        // Client-side parsing for Places mode
        const prompt = userMessage.content;

        // Extract latitude
        const latMatch = prompt.match(/latitude\s*([-\d.]+)/i);
        const latitude = latMatch ? parseFloat(latMatch[1]) : null;

        // Extract longitude
        const lonMatch = prompt.match(/longitude\s*([-\d.]+)/i);
        const longitude = lonMatch ? parseFloat(lonMatch[1]) : null;

        // Extract radius
        const radiusMatch = prompt.match(/radius\s*([\d.]+)/i);
        const radius = radiusMatch ? parseFloat(radiusMatch[1]) : 2;

        // Extract location name
        const locationMatch = prompt.match(/location\s+(.+?)(?:\s*,\s*radius|\s*$)/i) ||
          prompt.match(/location\s+(.+)/i);
        const location_name = locationMatch ? locationMatch[1].trim() : null;

        const structuredData = {
          query_type: 'satellite_analysis' as const,
          latitude,
          longitude,
          radius,
          location_name
        };

        const responseContent = `Analysis payload ready for ${location_name || 'custom location'}. Review the parameters and click "Start Analysis".`;

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: Role.ASSISTANT,
          content: responseContent,
          structuredData: structuredData,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, botMessage]);

      } else if (mode === 'satellite') {
        const structuredData = await parseSatellitePrompt(userMessage.content);

        // Build descriptive response based on query type
        let responseContent = 'Here is the parsed Delhi data query:';
        const queryType = structuredData.query_type;
        if (queryType === 'top_locations') {
          responseContent = `Found your request for top ${structuredData.limit || 10} locations. Click "Fetch Report" to get the data.`;
        } else if (queryType === 'location_detail') {
          responseContent = `Looking up details for "${structuredData.location_name}". Click "Fetch Report" to view.`;
        } else if (queryType === 'shops_by_brand') {
          responseContent = `Searching for ${structuredData.brand_name} stores. Click "Fetch Report" to see results.`;
        } else if (queryType === 'clusters') {
          responseContent = 'Fetching brand clusters by location. Click "Fetch Report" to view the data.';
        } else if (queryType === 'all_shops') {
          responseContent = 'Fetching all shops and brands. Click "Fetch Report" to view.';
        } else if (queryType === 'all_locations') {
          responseContent = 'Fetching all Delhi locations. Click "Fetch Report" to view.';
        } else if (queryType === 'satellite_analysis') {
          responseContent = `Satellite analysis request for ${structuredData.location_name || 'custom location'}. Click "Start Analysis" to begin.`;
        }

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: Role.ASSISTANT,
          content: responseContent,
          structuredData: structuredData,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, botMessage]);

      } else {
        // Normal Chat Mode
        const apiResponseText = await sendPromptToBackend(userMessage.content);

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: Role.ASSISTANT,
          content: apiResponseText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, botMessage]);

        // Only persist in chat mode
        if (currentSessionId && !currentSessionId.startsWith('local-')) {
          await addMessageToSession(currentSessionId, 'assistant', botMessage.content);
        }
      }

      // Only refresh sessions for chat mode
      if (mode === 'chat') {
        loadSessions();
      }

    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.ASSISTANT,
        content: `Error: ${error.message || 'Unknown error occurred'}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);

      // Only persist error in chat mode
      if (mode === 'chat' && currentSessionId && !currentSessionId.startsWith('local-')) {
        await addMessageToSession(currentSessionId, 'assistant', errorMessage.content);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleModeDropdown = () => {
    setIsModeDropdownOpen(!isModeDropdownOpen);
  };

  const selectMode = (newMode: 'chat' | 'satellite' | 'places') => {
    setMode(newMode);
    setIsModeDropdownOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden text-gray-100 font-sans">

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Chat Area */}
      <div className={`relative flex h-full w-full flex-1 flex-col overflow-hidden transition-all duration-300 ${UI_COLORS.main}`}>

        {/* Mobile Header */}
        <div className="sticky top-0 z-10 flex items-center border-b border-white/10 bg-[#343541] p-2 text-gray-200 sm:hidden">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-md hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white dark:hover:text-white"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <span className="sr-only">Open sidebar</span>
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex-1 text-center text-sm font-normal">
            {activeSessionId ? 'Chat' : 'New Chat'}
          </div>
          <button type="button" className="px-3" onClick={handleNewChat}>
            <span className="sr-only">New Chat</span>
            <span className="text-xl">+</span>
          </button>
        </div>

        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          className="absolute top-3 left-3 z-[100] hidden md:inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-gray-700/50 text-gray-200 focus:outline-none transition-all duration-200"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <span className="sr-only">Toggle sidebar</span>
          {isSidebarOpen ? <PanelLeftClose size={24} /> : <PanelLeftOpen size={24} />}
        </button>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col pb-60">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && <LoadingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area (Sticky Bottom) */}
        <div className={`absolute bottom-0 left-0 w-full border-t border-white/20 bg-[#343541] bg-gradient-to-t from-[#343541] via-[#343541] to-transparent pt-10`}>
          <div className="mx-auto flex flex-col gap-3 p-4 md:max-w-2xl lg:max-w-3xl md:py-6">
            <div className="flex items-center gap-3 bg-[#40414f] p-4 rounded-xl shadow-lg border border-white/10 focus-within:ring-1 focus-within:ring-white/20 transition-all">

              {/* Mode Dropdown */}
              <div className="relative flex flex-col">
                <button
                  onClick={toggleModeDropdown}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors border border-white/5"
                >
                  <span>{mode === 'chat' ? 'Chat' : mode === 'satellite' ? 'Satellite' : 'Places'}</span>
                  <svg className={`w-4 h-4 transition-transform ${isModeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isModeDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-32 bg-[#202123] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20">
                    <button
                      onClick={() => selectMode('chat')}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700/50 transition-colors ${mode === 'chat' ? 'text-white bg-gray-700/30' : 'text-gray-300'}`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => selectMode('satellite')}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700/50 transition-colors ${mode === 'satellite' ? 'text-white bg-gray-700/30' : 'text-gray-300'}`}
                    >
                      Satellite
                    </button>
                    <button
                      onClick={() => selectMode('places')}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700/50 transition-colors ${mode === 'places' ? 'text-white bg-gray-700/30' : 'text-gray-300'}`}
                    >
                      Places
                    </button>
                  </div>
                )}
              </div>

              <div className="relative flex-1 flex flex-col border-none ring-0 outline-none">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === 'satellite' ? "Show top 10 locations in Delhi..." : mode === 'places' ? "latitude 28.63, longitude 77.21, radius 2..." : "Send a message..."}
                  className="m-0 h-6 max-h-[200px] w-full resize-none border-0 bg-transparent p-0 pl-2 pr-10 text-white placeholder:text-gray-400 focus:ring-0 focus-visible:ring-0 focus:outline-none outline-none leading-6"
                  rows={1}
                  tabIndex={0}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || input.trim().length === 0}
                  className="absolute bottom-0 right-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-900 hover:text-gray-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  <Send size={16} className={input.trim().length > 0 ? 'text-white' : ''} />
                </button>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500">
              Blackwall can make mistakes. Consider checking important information.
            </div>
          </div>
        </div>

        {/* Mobile Overlay for Sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
      </div>
    </div>
  );
}

export default App;