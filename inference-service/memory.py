import os
from pydantic import BaseModel # type: ignore
from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid

from dotenv import load_dotenv # type: ignore
load_dotenv()

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
OPENAI_EMBEDDING_MODEL: str = os.getenv("OPENAI_EMBEDDING_MODEL")
OPENAI_LLM_MODEL: str = os.getenv("OPENAI_LLM_GPT_4O_MINI")
# System prompt for instructing markdown output
SYSTEM_PROMPT: str = os.getenv(
    "OPENAI_SYSTEM_PROMPT",
    "You are a helpful assistant. Respond using Markdown formatting: include headings, bullet lists, and code fences for code blocks."
)
QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
SYSTEM_PROMPT: str = os.getenv(
    "OPENAI_SYSTEM_PROMPT",
    "You are a helpful assistant. Respond using Markdown formatting: include headings, bullet lists, and code fences for code blocks."
)

class Chat(BaseModel):
    id: str
    title: str
    created_at: str

class Message(BaseModel):
    id: str
    sender: str  # 'user' or 'ai'
    content: str

from mem0 import Memory as Mem0Memory # type: ignore
import openai # type: ignore

class Memory:
    def __init__(self, collection_name):
        """Set up mem0ai memory and prepare chat contexts."""
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required for memory backend")
        # initialize mem0 vector store for this user collection
        self.mem0 = self._init_memory(collection_name)
        # remember collection name for auto-recreation
        self.collection_name = collection_name
        # in-memory list of chats created in this session
        self.chats: List[Chat] = []
    
    def _init_memory(self, collection_name):
        """Init memory."""
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
                "config": { "url": QDRANT_URL, "collection_name":  collection_name },
            },
        }
        return Mem0Memory.from_config(config_dict=config)
    
    # Internal helpers to auto-recreate collection if missing
    def _search(self, *args, **kwargs):
        try:
            return self.mem0.search(*args, **kwargs)
        except Exception as e:
            msg = str(e)
            if 'Collection' in msg and "doesn't exist" in msg:
                # recreate missing collection
                self.mem0 = self._init_memory(self.collection_name)
                return self.mem0.search(*args, **kwargs)
            raise

    def _get_all(self):
        try:
            return self.mem0.get_all(agent_id="inference-service")
        except Exception as e:
            msg = str(e)
            if 'Collection' in msg and "doesn't exist" in msg:
                self.mem0 = self._init_memory(self.collection_name)
                return self.mem0.get_all()
            raise

    def _add(self, *args, **kwargs):
        try:
            return self.mem0.add(*args, **kwargs)
        except Exception as e:
            msg = str(e)
            if 'Collection' in msg and "doesn't exist" in msg:
                self.mem0 = self._init_memory(self.collection_name)
                return self.mem0.add(*args, **kwargs)
            raise

    def _delete(self, *args, **kwargs):
        try:
            return self.mem0.delete(*args, **kwargs)
        except Exception as e:
            msg = str(e)
            if 'Collection' in msg and "doesn't exist" in msg:
                self.mem0 = self._init_memory(self.collection_name)
                return self.mem0.delete(*args, **kwargs)
            raise

    def _infer_title(self, user_message: str) -> str:
        """
        Ask the LLM to infer a concise title (2-3 words) for the first user message.
        """
        # prompt for title inference
        system = "You are a helpful assistant that summarizes user requests in 2-3 words to use as chat titles."
        resp = openai.chat.completions.create(
            model=OPENAI_LLM_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user_message},
            ],
        )
        title = resp.choices[0].message.content.strip()
        # ensure single-line title
        title = title.splitlines()[0]
        return title

    def init_memory(self, collection_name):
        self.__init__(collection_name)
    
    def get_chat(self, chat_id: Optional[str] = None):
        """Retrieve list of chats or messages for a specific chat.
        If chat_id is None, return the in-memory list of Chat objects.
        Otherwise, return the stored Message list for that chat_id (empty if none)."""
        # list chats
        if chat_id is None:
            return []
        # fetch chat memory entry for this chat_id (at most one)
        result = self._search(chat_id, user_id=chat_id, limit=1, filters={})
        items = result.get("results", [])
        if not items:
            return []
        # messages stored in metadata under 'messages'
        meta = items[0].get("metadata", {}) or {}
        stored = meta.get("messages", [])
        # reconstruct Message objects
        messages: List[Message] = []
        for m in stored:
            try:
                messages.append(Message(**m))
            except Exception:
                continue
        return messages

    def get_chats(self):
        result = self._get_all()
        items = result.get("results", [])
        chats: List[Chat] = []
        for x in items:
            metadata = x.get("metadata", {}) or {}
            print(f"Qdrant metadata: {metadata}")
            print(f"Extracted created_at: {x.get('created_at')}")

            title = metadata.get("title", x.get("user_id"))
            created_at = x.get("created_at") or datetime.fromtimestamp(0, timezone.utc).isoformat()
            chats.append(Chat(id=x.get("user_id"), title=title, created_at=created_at))
        chats.sort(key=lambda chat: chat.created_at, reverse=True)
        return chats

    def new_chat(self) -> Chat:
        """Create a new chat context and return its metadata."""
        from uuid import uuid4
        chat_id = str(uuid4())
        from datetime import datetime, timezone
        created_at = datetime.now(timezone.utc).isoformat()
        chat = Chat(id=chat_id, title='', created_at=created_at)
        self.chats.append(chat)
        print(f"================= {chat}")
        return chat

    def update_chat(self, chat_id: str, user_ask: str, ai_response: str) -> str:
        """Append a message record to the memory store for the given chat and return its mem0 id."""
        entries = self._search(chat_id, user_id=chat_id, limit=1, filters={}).get("results", [])
        is_new = not entries
        # infer title on first message
        if is_new:
            title = self._infer_title(user_ask + '/n' + ai_response)
            # update in-memory chat title if present
            for chat in self.chats:
                if chat.id == chat_id:
                    chat.title = title
                    break
            history_msgs: List[Dict] = []
        else:
            meta = entries[0].get("metadata", {}) or {}
            title = meta.get("title", "")
            history_msgs = meta.get("messages", [])
        
        # build new message objects with unique ids
        user_msg = Message(id=str(uuid.uuid4()), sender="user", content=user_ask)
        ai_msg   = Message(id=str(uuid.uuid4()), sender="ai",   content=ai_response)
        # assemble updated message list
        new_msgs = history_msgs + [user_msg.dict(), ai_msg.dict()]

        if not is_new:
            old_id = entries[0].get("id")
            try:
                self._delete(old_id)
            except Exception:
                pass

        # determine chat creation time for metadata
        if is_new:
            created_meta = None
            for chat in self.chats:
                if chat.id == chat_id:
                    created_meta = chat.created_at
                    break
        else:
            prev_meta = entries[0].get("metadata", {}) or {}
            created_meta = prev_meta.get("created_at")
        
        print(f"created_meta = {created_meta} for chat_id = {chat_id}")

        # add memory entry with title, messages, and creation timestamp
        self._add(
            chat_id,
            metadata={"title": title, "messages": new_msgs, "created_at": created_meta},
            user_id=chat_id,
            agent_id="inference-service",
            memory_type="procedural_memory",
            infer=False,
        )
        
        return ai_msg
