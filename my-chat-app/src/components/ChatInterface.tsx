import React from 'react';
import type { Message } from '../services/apiService';
import ChatHistory from './ChatHistory';
import MessageInput from './MessageInput';

interface ChatInterfaceProps {
  chatId: string | null;
  chatTitle: string;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatId,
  chatTitle,
  messages,
  onSendMessage,
  isLoadingMessages,
  isSendingMessage,
}) => {
  if (!chatId) {
    return (
      <main className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
        <span className="text-gray-500 dark:text-gray-400">
          Select a chat to start chatting
        </span>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-300 dark:border-gray-700">
        <h1 className="text-lg font-semibold">{chatTitle}</h1>
      </div>

      {isLoadingMessages ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 rounded-full border-t-blue-500"></div>
        </div>
      ) : (
        <ChatHistory messages={messages} />
      )}

      <MessageInput onSendMessage={onSendMessage} isLoading={isSendingMessage} />
    </main>
  );
};

export default ChatInterface;
