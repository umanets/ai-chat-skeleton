import os
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any
from typing import List

from dotenv import load_dotenv, find_dotenv
# Load .env from project root (searches parent dirs)
load_dotenv(find_dotenv())

from memory import Memory, Chat, Message, OPENAI_LLM_MODEL, SYSTEM_PROMPT
from fastapi.responses import StreamingResponse
import openai
import orjson
async_openai_client = openai.AsyncOpenAI()

class SSEEvent(BaseModel):
    text: str = ""
    done: bool = False
    error: str = None

    def serialize(self):
        # Only include non-None fields
        base = {"text": self.text}
        if self.done:
            base["done"] = True
        if self.error:
            base["error"] = self.error
        return f"data: {orjson.dumps(base).decode()}\n\n"

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
mem = Memory('test_user')

class AskRequest(BaseModel):
    message: str

@app.get("/chats", response_model=List[Chat])
async def get_chats():
    """Return list of available chat contexts."""
    return mem.get_chats()

@app.post("/chats", response_model=Chat)
async def create_chat() -> Any:
    """Create a new chat context and return its metadata."""
    chat = mem.new_chat()
    return chat

@app.get("/chats/{chat_id}/messages", response_model=List[Message])
async def get_messages(chat_id: str):
    """Return message history for a given chat."""
    # Validate chat exists
    return mem.get_chat(chat_id)
    
@app.get("/chats/{chat_id}", response_model=Chat)
async def get_chat_metadata(chat_id: str):
    """Return metadata for a given chat context (id, title, created_at)."""
    chats = mem.get_chats()
    for chat in chats:
        if chat.id == chat_id:
            print(f"CHAT FOUND: {chat}")
            return chat
    raise HTTPException(status_code=404, detail="Chat not found")

@app.post("/chats/{chat_id}/ask", response_model=Message)
async def ask(chat_id: str, req: AskRequest, background_tasks: BackgroundTasks):
    """Handle user message, update memory, invoke LLM, and return AI response."""
    # build messages for LLM call
    print(f"CHAT_ID: {chat_id}")
    history_msgs = mem.get_chat(chat_id)

    llm_msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in history_msgs:
        role = "user" if m.get("sender") == "user" else "assistant"
        llm_msgs.append({"role": role, "content": m.get("content", "")})
    llm_msgs.append({"role": "user", "content": req.message})

    # ask LLM for response
    try:
        resp = openai.chat.completions.create(
            model=OPENAI_LLM_MODEL,
            messages=llm_msgs,
        )
    except openai.APIConnectionError as e:
        raise HTTPException(status_code=503, detail=f"OpenAI API connection error: {e}")
    except openai.APIStatusError as e:
        raise HTTPException(status_code=e.status_code, detail=f"OpenAI API error: {e.response}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred with OpenAI: {e}")

    from uuid import uuid4
    ai_text = resp.choices[0].message.content
    ai_message_to_return = Message(id=str(uuid4()), sender="ai", content=ai_text)

    background_tasks.add_task(
        mem.update_chat, # The coroutine function to run in background
        chat_id,         # First argument to update_chat
        req.message,     # Second argument
        ai_text          # Third argument
    )

    # 4. Immediately return the AI message
    return ai_message_to_return

@app.get("/chats/{chat_id}/ask/stream")
async def ask_stream(chat_id: str, message: str, background_tasks: BackgroundTasks):
    """Stream AI response as Server-Sent Events, prompt via query param."""
    # Build messages for OpenAI
    history = mem.get_chat(chat_id)
    chat_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        role = "user" if msg.sender == "user" else "assistant"
        chat_messages.append({"role": role, "content": msg.content})
    chat_messages.append({"role": "user", "content": message})

    def event_generator():
        ai_text = ""
        print("DEBUG: [Inference Generator] Started")
        try:
            for chunk_index, chunk in enumerate(openai.chat.completions.create(
                model=OPENAI_LLM_MODEL,
                messages=chat_messages,
                stream=True,
            )):
                delta = (
                    chunk.choices[0].delta.content
                    if chunk.choices and chunk.choices[0].delta else ""
                )
                if delta:
                    ai_text += delta
                    event = SSEEvent(text=delta)
                    yield event.serialize().encode("utf-8")
            
            yield SSEEvent(done=True).serialize().encode("utf-8")

            # Save AI message
            try:
                background_tasks.add_task(
                    mem.update_chat, # The coroutine function to run in background
                    chat_id,         # First argument to update_chat
                    message,         # Second argument
                    ai_text          # Third argument
                )
                # mem.update_chat(chat_id, message, ai_text)
            except Exception as mem_err:
                print(f"ERROR: [Inference Generator] Failed to update memory: {mem_err}")
            
        except Exception as outer_err:
            print(f"ERROR: [Inference Generator] Outer exception: {outer_err}")
            yield SSEEvent(error="Generator failure").serialize().encode("utf-8")
        finally:
            print("DEBUG: [Inference Generator] Finished")

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/chats/{chat_id}/ask/stream-raw")
async def ask_stream_raw(chat_id: str, message: str, background_tasks: BackgroundTasks):
    """Raw chunked Markdown stream over GET?message=..."""
    history = mem.get_chat(chat_id)
    chat_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        role = "user" if msg.sender == "user" else "assistant"
        chat_messages.append({"role": role, "content": msg.content})
    chat_messages.append({"role": "user", "content": message})

    async def raw_generator():
        ai_text = ""
        async for chunk in await async_openai_client.chat.completions.create(
            model=OPENAI_LLM_MODEL,
            messages=chat_messages,
            stream=True,
        ):
            delta = chunk.choices[0].delta.content or ''
            ai_text += delta
            yield delta
        background_tasks.add_task(
            mem.update_chat, # The coroutine function to run in background
            chat_id,         # First argument to update_chat
            message,         # Second argument
            ai_text          # Third argument
        )

    return StreamingResponse(raw_generator(), media_type="text/plain; charset=utf-8")

@app.post("/chats/{chat_id}/ask/stream-raw-post")
async def ask_stream_raw_post(chat_id: str, req: AskRequest, background_tasks: BackgroundTasks):  # reuse AskRequest
    """Raw chunked Markdown stream over POST body."""
    # Delegate to the GET raw stream endpoint under the hood
    return await ask_stream_raw(chat_id, req.message, background_tasks)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=INFERENCE_PORT,
        reload=True,
    )