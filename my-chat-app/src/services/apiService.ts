export interface Chat {
  id: string;
  title: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
}

// Base URL for the backend API
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const getChatList = async (): Promise<Chat[]> => {
  const res = await fetch(`${API_BASE}/chats`);
  if (!res.ok) throw new Error(`Failed to fetch chat list: ${res.status}`);
  return res.json();
};

export const loadChatMessages = async (
  chatId: string
): Promise<Message[]> => {
  const res = await fetch(`${API_BASE}/chats/${chatId}/messages`);
  if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`);
  return res.json();
};

export const askChat = async (
  chatId: string,
  messageContent: string
): Promise<Message> => {
  if (!chatId) throw new Error('No active chat selected');
  const res = await fetch(`${API_BASE}/chats/${chatId}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: messageContent }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  return res.json();
};

/**
 * Create a new chat with the given title.
 */
export const createChat = async (
  title: string
): Promise<Chat> => {
  const res = await fetch(`${API_BASE}/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create chat: ${res.status}`);
  return res.json();
};
