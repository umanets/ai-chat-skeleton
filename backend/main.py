import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv, find_dotenv
import httpx

# Load .env from project root (searches parent dirs)
# Load environment and settings
load_dotenv(find_dotenv())
# Default timeout (in seconds) for HTTP requests to inference service
HTTPX_TIMEOUT = float(os.getenv("HTTPX_TIMEOUT", "60"))
# Endpoint of the inference service
INFERENCE_URL = os.getenv("INFERENCE_URL", "http://localhost:8001")
app = FastAPI(title="Chat Backend")

class Chat(BaseModel):
    id: str
    title: str

class Message(BaseModel):
    id: str
    sender: str
    content: str


# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/chats", response_model=List[Chat])
async def get_chats():
    """Proxy to inference-service to list chats."""
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        resp = await client.get(f"{INFERENCE_URL}/chats")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch chats from inference service")
    return resp.json()
# Request model for creating a new chat
class NewChatRequest(BaseModel):
    title: str

@app.post("/chats", response_model=Chat)
async def new_chat(req: NewChatRequest):
    """Proxy to inference-service to create a new chat context."""
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        resp = await client.post(
            f"{INFERENCE_URL}/chats",
            json={"title": req.title},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to create chat in inference service")
    return resp.json()

@app.get("/chats/{chat_id}/messages", response_model=List[Message])
async def get_messages(chat_id: str):
    """Proxy to inference-service to retrieve chat history."""
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        resp = await client.get(f"{INFERENCE_URL}/chats/{chat_id}/messages")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch messages from inference service")
    return resp.json()

class AskRequest(BaseModel):
    message: str

@app.post("/chats/{chat_id}/ask", response_model=Message)
async def ask(chat_id: str, req: AskRequest):
    """Proxy to inference-service to handle user message and return AI response."""
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        resp = await client.post(
            f"{INFERENCE_URL}/chats/{chat_id}/ask",
            json={"message": req.message},
        )
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Chat not found in inference service")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to send message to inference service")
    return resp.json()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
