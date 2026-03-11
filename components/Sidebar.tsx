import React from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { UI_COLORS } from '../constants';
import { ChatSession } from '../services/chatStore';

interface SidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Desktop Sidebar - pushes content */}
      <div
        className={`
          hidden md:flex flex-col h-full transition-all duration-300 ease-in-out
          ${UI_COLORS.sidebar} border-r border-white/10
          ${isOpen ? 'w-[260px] min-w-[260px]' : 'w-0 min-w-0 overflow-hidden'}
        `}
      >
        <div className="flex h-full min-h-0 flex-col w-[260px]">
          {/* Header */}
          <div className="flex items-center justify-center py-4 border-b border-white/10">
            <h1 className="text-xl font-bold text-white tracking-widest">BLACKWALL</h1>
          </div>

          {/* New Chat Button */}
          <div className="px-3 py-3">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-white rounded-lg border border-white/20 hover:bg-gray-700/50 transition-colors"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                No chats yet
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`
                    group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                    ${activeSessionId === session.id
                      ? 'bg-gray-700/70 text-white'
                      : 'text-gray-300 hover:bg-gray-700/40'
                    }
                  `}
                  onClick={() => onSelectSession(session.id)}
                >
                  <MessageSquare size={16} className="flex-shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{session.title}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {formatDate(session.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    title="Delete chat"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/10 text-xs text-gray-500 text-center">
            {sessions.length}/10 chats stored
          </div>
        </div>
      </div>

      {/* Mobile Sidebar - overlays content */}
      <div
        className={`
          md:hidden fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 ease-in-out
          ${UI_COLORS.sidebar} border-r border-white/10 w-[280px]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Header */}
          <div className="flex items-center justify-center py-4 border-b border-white/10">
            <h1 className="text-xl font-bold text-white tracking-widest">BLACKWALL</h1>
          </div>

          {/* New Chat Button */}
          <div className="px-3 py-3">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-white rounded-lg border border-white/20 hover:bg-gray-700/50 transition-colors"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                No chats yet
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`
                    group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                    ${activeSessionId === session.id
                      ? 'bg-gray-700/70 text-white'
                      : 'text-gray-300 hover:bg-gray-700/40'
                    }
                  `}
                  onClick={() => onSelectSession(session.id)}
                >
                  <MessageSquare size={16} className="flex-shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{session.title}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {formatDate(session.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    title="Delete chat"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/10 text-xs text-gray-500 text-center">
            {sessions.length}/10 chats stored
          </div>
        </div>
      </div>
    </>
  );
};