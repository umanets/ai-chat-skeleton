import React from 'react';
import type { Chat } from '../services/apiService';

interface SidebarProps {
  chatList: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({ chatList, activeChatId, onSelectChat, onNewChat }) => {
  return (
    <aside className="w-64 bg-gray-50 dark:bg-gray-900 p-4 flex flex-col border-r border-gray-300 dark:border-gray-700 h-full">
      <button
        onClick={onNewChat}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-4"
      >
        + New Chat
      </button>

      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
        Chats
      </h2>
      <div className="flex-1 overflow-y-auto space-y-1">
        {chatList.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full text-left p-2 rounded ${
              activeChatId === chat.id
                ? 'bg-gray-200 dark:bg-gray-700 font-semibold'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {chat.title}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-300 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <span className="text-sm font-bold">U</span>
          </div>
          <span className="text-sm font-medium">User Name</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
