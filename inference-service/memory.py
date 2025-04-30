import os
from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid

from dotenv import load_dotenv
load_dotenv()

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
OPENAI_EMBEDDING_MODEL: str = os.getenv("OPENAI_EMBEDDING_MODEL")
OPENAI_LLM_MODEL: str = os.getenv("OPENAI_LLM_GPT_4O_MINI")
QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
SYSTEM_PROMPT: str = os.getenv(
    "OPENAI_SYSTEM_PROMPT",
    "You are a helpful assistant. Respond using Markdown formatting: include headings, bullet lists, and code fences for code blocks."
)

class Chat(BaseModel):
    id: str
    title: str

class Message(BaseModel):
    id: str
    sender: str  # 'user' or 'ai'
    content: str

from mem0 import Memory as Mem0Memory
import openai

class Memory:
    def __init__(self):
        """Set up mem0ai memory and prepare chat contexts."""
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required for memory backend")
        # Configure mem0ai
        config = {
            "embedder": {
                "provider": "openai",
                "config": {
                    "model": OPENAI_EMBEDDING_MODEL,
                    "api_key": OPENAI_API_KEY,
                    "embedding_dims": 1536,
                },
            },
            "llm": {
                "provider": "openai",
                "config": {
                    "model": OPENAI_LLM_MODEL,
                    "temperature": 0.7,
                    "max_tokens": 1000,
                    "api_key": OPENAI_API_KEY,
                },
            },
            "vector_store": {
                "provider": "qdrant",
                "config": { "url": QDRANT_URL },
            },
        }
        # Initialize mem0 memory object
        self.mem0 = Mem0Memory.from_config(config_dict=config)
        # In-memory registry of chat contexts
        self.chats: List[Chat] = []

    def init_memory(self):
        """Reinitialize entire memory store."""
        self.__init__()

    def from_memory(self, chat_id: Optional[str] = None):
        """Retrieve list of chats or messages for a specific chat."""
        if chat_id is None:
            return self.chats
        # Retrieve all memory entries for this chat (no semantic query)
        result = self.mem0.get_all(user_id=chat_id, limit=1000)
        items = result.get("results", [])
        messages: List[Message] = []
        for entry in items:
            # payload memory stored under 'memory'; metadata contains sender
            msg_id = entry.get("id")
            md = entry.get("metadata", {}) or {}
            sender = md.get("sender", "ai")
            content = entry.get("memory", "")
            messages.append(Message(id=msg_id, sender=sender, content=content))
        return messages

    def new_memory(self, title: str) -> Chat:
        """Create a new chat context and return its metadata."""
        from uuid import uuid4
        chat_id = str(uuid4())
        chat = Chat(id=chat_id, title=title)
        self.chats.append(chat)
        return chat

    def update_memory(self, chat_id: str, message: Message) -> str:
        """Append a message record to the memory store for the given chat and return its mem0 id."""
        result = self.mem0.add(
            message.content,
            metadata={"sender": message.sender},
            user_id=chat_id,
            agent_id="inference-service",
            memory_type="procedural_memory",
            infer=True,
        )
        # extract and return the mem0 entry id
        try:
            mem0_id = result.get("results")[0].get("id")
        except Exception as e:
            raise RuntimeError(f"Failed to extract mem0 id from add result: {result}") from e
        return mem0_id

    def ask(self, chat_id: str, user_message: str) -> Message:
        """Call LLM with historical context and user message, store and return AI reply."""
        # Retrieve conversation history
        history = self.from_memory(chat_id)
        # Build chat messages for OpenAI, starting with system prompt for Markdown output
        chat_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in history:
            role = "user" if msg.sender == "user" else "assistant"
            chat_messages.append({"role": role, "content": msg.content})
        chat_messages.append({"role": "user", "content": user_message})

        # Invoke OpenAI ChatCompletion via the new v1 client API
        # (use the chat completion endpoint on the module client)
        response = openai.chat.completions.create(
            model=OPENAI_LLM_MODEL,
            messages=chat_messages,
        )
        ai_text = response.choices[0].message.content
        # Store user message
        _ = self.update_memory(chat_id, Message(id="", sender="user", content=user_message))
        # Store AI response and get its mem0 id
        ai_entry = Message(id="", sender="ai", content=ai_text)
        ai_mem0_id = self.update_memory(chat_id, ai_entry)
        ai_entry.id = ai_mem0_id
        return ai_entry

    def delete_memory(self, mem_id: Optional[str]) -> None:
        """Delete a memory entry by its mem0 id."""
        if mem_id:
            self.mem0.delete(mem_id)

    def replace_memory(self, mem_id: str, chat_id: str, sender: str, content: str) -> str:
        """Update an existing memory entry by deleting the old one and adding the new content; returns new mem0 id."""
        self.delete_memory(mem_id)
        return self.update_memory(chat_id, Message(id="", sender=sender, content=content))