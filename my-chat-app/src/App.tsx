import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import {
  getChatList,
  loadChatMessages,
  askChat,
  createChat,
  Chat,
  Message,
} from './services/apiService';

function App() {
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [currentChatTitle, setCurrentChatTitle] =
    useState<string>('Select a Chat');

  // Fetch chat list on initial mount
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const chats = await getChatList();
        setChatList(chats);
      } catch (error) {
        console.error('Failed to fetch chat list:', error);
      }
    };
    fetchChats();
  }, []);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setCurrentChatTitle('Select a Chat');
      return;
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      setMessages([]);
      try {
        const loadedMessages = await loadChatMessages(activeChatId);
        setMessages(loadedMessages);
        const activeChat = chatList.find((chat) => chat.id === activeChatId);
        setCurrentChatTitle(activeChat ? activeChat.title : 'Chat');
      } catch (error) {
        console.error(
          `Failed to load messages for chat ${activeChatId}:`,
          error
        );
      } finally {
        setIsLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [activeChatId, chatList]);

  const handleSelectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
  }, []);

  const handleNewChat = useCallback(async () => {
    try {
      const newChat = await createChat('New Chat');
      setChatList((prev) => [...prev, newChat]);
      setActiveChatId(newChat.id);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (messageContent: string) => {
      if (!activeChatId) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: 'user',
        content: messageContent,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsSendingMessage(true);

      try {
        const aiResponse = await askChat(activeChatId, messageContent);
        setMessages((prev) => [...prev, aiResponse]);
      } catch (error) {
        console.error('Failed to send message or get response:', error);
        const errorMessage: Message = {
          id: `err-${Date.now()}`,
          sender: 'ai',
          content: `Error: Could not get response. ${
            error instanceof Error ? error.message : ''
          }`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [activeChatId]
  );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          chatList={chatList}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
        />
        <ChatInterface
          chatId={activeChatId}
          chatTitle={currentChatTitle}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoadingMessages={isLoadingMessages}
          isSendingMessage={isSendingMessage}
        />
      </div>
    </div>
  );
}

export default App;
