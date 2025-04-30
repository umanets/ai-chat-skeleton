import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any
from typing import List
import uuid

from dotenv import load_dotenv, find_dotenv
# Load .env from project root (searches parent dirs)
load_dotenv(find_dotenv())

from memory import Memory, Chat, Message

# Request model for creating a new chat
class NewChatRequest(BaseModel):
    title: str

# Base URL and port for this inference service
INFERENCE_PORT = int(os.getenv("INFERENCE_PORT", 8001))

app = FastAPI(title="Inference Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize memory (mem0ai + OpenAI) manager
mem = Memory()

class AskRequest(BaseModel):
    message: str

@app.get("/chats", response_model=List[Chat])
async def get_chats():
    """Return list of available chat contexts."""
    return mem.from_memory()

@app.post("/chats", response_model=Chat)
async def create_chat(req: NewChatRequest) -> Any:
    """Create a new chat context and return its metadata."""
    chat = mem.new_memory(req.title)
    return chat

@app.get("/chats/{chat_id}/messages", response_model=List[Message])
async def get_messages(chat_id: str):
    """Return message history for a given chat."""
    # Validate chat exists
    chats = mem.from_memory()
    if not any(c.id == chat_id for c in chats):
        raise HTTPException(status_code=404, detail="Chat not found")
    return mem.from_memory(chat_id)

@app.post("/chats/{chat_id}/ask", response_model=Message)
async def ask(chat_id: str, req: AskRequest):
    """Handle user message, update memory, invoke LLM, and return AI response."""
    # Validate chat exists
    chats = mem.from_memory()
    if not any(c.id == chat_id for c in chats):
        raise HTTPException(status_code=404, detail="Chat not found")
    # Ask using mem0ai/OpenAI
    ai_msg = mem.ask(chat_id, req.message)
    return ai_msg

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=INFERENCE_PORT,
        reload=True,
    )