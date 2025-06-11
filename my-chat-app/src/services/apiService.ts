export interface Chat {
  id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
}

// Base URL for the backend API
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

/**
 * Send a message to the chat and receive AI response.
 * @param model Optional model override for the response
 */
export const askChat = async (
  chatId: string,
  messageContent: string,
  model?: string
): Promise<Message> => {
  if (!chatId) throw new Error('No active chat selected');
  const payload: any = { message: messageContent };
  if (model) payload.model = model;
  const res = await fetch(`${API_BASE}/chats/${chatId}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  return res.json();
};

/**
 * Stream AI responses via Server-Sent Events (SSE) over GET with query param.
 * Returns an EventSource you can attach onmessage and onerror handlers to.
 */
export const askChatStream = (
  chatId: string,
  messageContent: string
): EventSource => {
  if (!chatId) throw new Error('No active chat selected');
  const url = `${API_BASE}/chats/${chatId}/ask/stream?message=${encodeURIComponent(
    messageContent
  )}`;
  return new EventSource(url);
};

/**
 * Stream raw AI responses over GET with query param.
 * Returns a ReadableStream from a fetch response.
 */
export const askChatRawStream = async (
  chatId: string,
  messageContent: string
): Promise<ReadableStream<Uint8Array> | null> => {
  if (!chatId) throw new Error('No active chat selected');
  const url = `${API_BASE}/chats/${chatId}/ask/stream-raw?message=${encodeURIComponent(
    messageContent
  )}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'text/plain' }, // Indicate that we expect plain text
  });

  if (!res.ok) {
    throw new Error(`Failed to stream raw response: ${res.status} ${res.statusText}`);
  }
  return res.body; // Returns a ReadableStream
};

/**
 * Stream raw AI responses over POST with JSON body.
 * Returns a ReadableStream from a fetch response.
 */
export const askChatRawStreamPost = async (
  chatId: string,
  messageContent: string
): Promise<ReadableStream<Uint8Array> | null> => {
  if (!chatId) throw new Error('No active chat selected');
  const url = `${API_BASE}/chats/${chatId}/ask/stream-raw-post`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/plain', // Indicate that we expect plain text
    },
    body: JSON.stringify({ message: messageContent }),
  });

  if (!res.ok) {
    throw new Error(`Failed to POST raw stream response: ${res.status} ${res.statusText}`);
  }
  return res.body; // Returns a ReadableStream
};
/**
 * Retrieve metadata (id, title) for a specific chat.
 */
export const getChat = async (
  chatId: string
): Promise<Chat> => {
  const res = await fetch(`${API_BASE}/chats/${chatId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Chat not found: ${res.status}`);
    throw new Error(`Failed to fetch chat metadata: ${res.status}`);
  }
  return res.json();
};