import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import {
  getChatList,
  loadChatMessages,
  askChat,
  askChatStream,
  createChat,
  getChat,
  Chat,
  Message,
  askChatRawStreamPost,
  askChatRawStream,
} from './services/apiService';

function App() {
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [currentChatTitle, setCurrentChatTitle] =
    useState<string>('Select a Chat');
  // Track which chats have had metadata refreshed to avoid duplicate polls
  const refreshedChats = React.useRef<Set<string>>(new Set());

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
      setCurrentChatTitle('New Chat');
      return;
    }
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      setMessages([]);
      try {
        const loadedMessages = await loadChatMessages(activeChatId);
        setMessages(loadedMessages);
        // Set a placeholder title until metadata is refreshed
        // setCurrentChatTitle('New Chat 2');
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
  }, [activeChatId]);

  const handleSelectChat = useCallback((chat: Chat) => {
    setActiveChatId(chat.id);
    setCurrentChatTitle(chat.title);
  }, []);

  const handleNewChat = useCallback(async () => {
    try {
      const newChat = await createChat('New Chat');
      // Activate the new chat; do not add to chatList until title is inferred
      setActiveChatId(newChat.id);
      setCurrentChatTitle('New Chat');
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  }, []);

  // Refresh the metadata (title) for the active chat after inference
  const refreshChatMetadata = useCallback(() => {
    if (!activeChatId) return;
    getChat(activeChatId)
      .then((chat) => {
        setChatList((prev) => {
          const exists = prev.some((c) => c.id === chat.id);
          if (exists) {
            return prev.map((c) => c.id === chat.id ? chat : c);
          }
          return [chat, ...prev];
        });
        setCurrentChatTitle(chat.title);
      })
      .catch((e) => console.error('Failed to refresh chat metadata:', e));
  }, [activeChatId]);

  const scheduleRefreshChatMetadata = useCallback(() => {
    if (!activeChatId) return;
    // Only refresh once per chat
    if (refreshedChats.current.has(activeChatId)) return;
    refreshedChats.current.add(activeChatId);
    setTimeout(refreshChatMetadata, 5000);
  }, [activeChatId, refreshChatMetadata]);

  const handleSendMessageCompletion = useCallback(
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
        // After backend infers chat title, refresh chat metadata
        scheduleRefreshChatMetadata();
      }
    },
    [activeChatId]
  );

  const handleSendMessageStream = useCallback(
    (messageContent: string) => {
      if (!activeChatId) return;

      // Append user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: 'user',
        content: messageContent,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsSendingMessage(true);

      // Append empty AI placeholder
      const aiPlaceholder: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        content: '',
      };
      setMessages((prev) => [...prev, aiPlaceholder]);

      // Start SSE stream
      const es = askChatStream(activeChatId, messageContent);
      es.onmessage = (event) => {
        // const data = event.data;
        const data = JSON.parse(event.data);
        console.log(data)
        if (data.done) {
          setIsSendingMessage(false);
          es.close();
          // After streaming completes, refresh chat metadata
          scheduleRefreshChatMetadata();
        } else {
          setMessages((prev) => {
            const msgs = [...prev];
            const lastIndex = msgs.length - 1;
            msgs[lastIndex] = { ...msgs[lastIndex], content: msgs[lastIndex].content + data.text };
            return msgs;
          });
        }
      };
      es.onerror = (err) => {
        console.error('Streaming error', err);
        setIsSendingMessage(false);
        es.close();
      };
    },
    [activeChatId]
  );

  const handleSendMessageRawStream = useCallback(
    async (messageContent: string) => {
      if (!activeChatId) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: 'user',
        content: messageContent,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsSendingMessage(true);

      const aiPlaceholder: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        content: '', // Start with empty content
      };
      // Add the AI placeholder to state and capture its ID for updates
      setMessages((prev) => [...prev, aiPlaceholder]);
      const aiMessageId = aiPlaceholder.id;


      try {
        const responseStream = await askChatRawStream(activeChatId, messageContent);
        if (!responseStream) {
          throw new Error("No readable stream received.");
        }

        const reader = responseStream.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let accumulatedContent = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: !done }); // Decode chunk, tell it if it's the last one
            accumulatedContent += chunk;

            // Update the AI placeholder message in state
            setMessages((prev) => {
              return prev.map((msg) =>
                msg.id === aiMessageId ? { ...msg, content: accumulatedContent } : msg
              );
            });
          }
        }
        reader.releaseLock(); // Release the lock on the reader

      } catch (error) {
        console.error('Failed to stream raw message (GET):', error);
        setMessages((prev) => {
          return prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  content: `Error: Could not get raw stream response. ${
                    error instanceof Error ? error.message : ''
                  }`,
                }
              : msg
          );
        });
      } finally {
        setIsSendingMessage(false);
        // After raw stream completes, refresh chat metadata
        scheduleRefreshChatMetadata();
      }
    },
    [activeChatId]
  );

  const handleSendMessageRawStreamPost = useCallback(
    async (messageContent: string) => {
      if (!activeChatId) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: 'user',
        content: messageContent,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsSendingMessage(true);

      const aiPlaceholder: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        content: '', // Start with empty content
      };
      setMessages((prev) => [...prev, aiPlaceholder]);
      const aiMessageId = aiPlaceholder.id; // Capture ID for updates


      try {
        const responseStream = await askChatRawStreamPost(activeChatId, messageContent);
        if (!responseStream) {
          throw new Error("No readable stream received.");
        }

        const reader = responseStream.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let accumulatedContent = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: !done });
            accumulatedContent += chunk;

            setMessages((prev) => {
              return prev.map((msg) =>
                msg.id === aiMessageId ? { ...msg, content: accumulatedContent } : msg
              );
            });
          }
        }
        reader.releaseLock(); // Release the lock on the reader

      } catch (error) {
        console.error('Failed to stream raw message (POST):', error);
        setMessages((prev) => {
          return prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  content: `Error: Could not get raw stream response. ${
                    error instanceof Error ? error.message : ''
                  }`,
                }
              : msg
          );
        });
      } finally {
        setIsSendingMessage(false);
        // After raw POST stream completes, refresh chat metadata
        scheduleRefreshChatMetadata();
      }
    },
    [activeChatId]
  );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      {/* <Header /> */}
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
          onSendMessage={handleSendMessageRawStreamPost}
          isLoadingMessages={isLoadingMessages}
          isSendingMessage={isSendingMessage}
        />
      </div>
    </div>
  );
}

export default App;
