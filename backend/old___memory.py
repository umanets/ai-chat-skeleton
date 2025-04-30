from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid

class Chat(BaseModel):
    id: str
    title: str

class Message(BaseModel):
    id: str
    sender: str  # 'user' or 'ai'
    content: str

class Memory:
    def __init__(self):
        """Initialize the memory store with default chats and messages."""
        self.init_memory()

    def init_memory(self):
        """Set up initial chats and their first AI greeting."""
        # Initialize chats
        self.chats: List[Chat] = [
            Chat(id="1", title="Chat about React"),
            Chat(id="2", title="Tailwind Basics"),
            Chat(id="3", title="Project Ideas"),
        ]
        # Initialize messages store
        self.messages_store: Dict[str, List[Message]] = {}
        for chat in self.chats:
            ai_msg = Message(
                id=str(uuid.uuid4()),
                sender="ai",
                content=f"Welcome to chat {chat.id}! Start messaging."
            )
            self.messages_store[chat.id] = [ai_msg]

    def from_memory(self, chat_id: Optional[str] = None):
        """Retrieve chats or messages.
        If chat_id is None, return list of Chat; otherwise return messages for that chat."""
        if chat_id is None:
            return self.chats
        return self.messages_store.get(chat_id, [])

    def new_memory(self, title: str) -> Chat:
        """Create a new chat memory context with given title."""
        new_id = str(uuid.uuid4())
        chat = Chat(id=new_id, title=title)
        self.chats.append(chat)
        self.messages_store[new_id] = []
        return chat

    def update_memory(self, chat_id: str, message: Message) -> None:
        """Append a message to the memory for the given chat."""
        if chat_id not in self.messages_store:
            self.messages_store[chat_id] = []
        self.messages_store[chat_id].append(message)
