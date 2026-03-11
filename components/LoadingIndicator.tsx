import React from 'react';
import { Bot } from 'lucide-react';
import { UI_COLORS } from '../constants';

export const LoadingIndicator: React.FC = () => {
  return (
    <div className={`w-full border-b border-black/10 dark:border-gray-900/50 text-gray-100 ${UI_COLORS.botBubble}`}>
      <div className="m-auto gap-4 p-4 md:max-w-2xl lg:max-w-3xl md:gap-6 md:py-6 flex">
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className="w-[30px] h-[30px] rounded-sm flex items-center justify-center bg-[#19c37d]">
            <Bot size={20} color="white" />
          </div>
        </div>
        <div className="relative flex-1 flex items-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
};