# AI Chat Skeleton

Full-stack AI chatbot boilerplate with **long-term memory**: React chat UI → FastAPI gateway → inference service with OpenAI streaming (SSE) and hybrid memory on **Qdrant + mem0 + BM25**. Clone it, add your OpenAI key, and you have a working multi-chat assistant that remembers past conversations.

## Architecture

```
my-chat-app (React + Vite + Tailwind, :5173)
        │ REST + SSE
        ▼
backend (FastAPI gateway, :8000)          ── chats/messages API, proxies streaming
        │ httpx
        ▼
inference-service (FastAPI, :8001)        ── OpenAI chat completions (streamed as SSE)
        │                                    + memory retrieval/ingestion
        ▼
Qdrant (Docker, :6335) + mem0 + rank_bm25 ── vector + keyword memory
```

- **backend/** — thin API gateway: chat/message CRUD, streams tokens from the inference service to the UI.
- **inference-service/** — the brain: calls OpenAI (async client), serializes the stream as Server-Sent Events, retrieves relevant memories (vector search via Qdrant/mem0, keyword rerank via BM25) and ingests new ones in background tasks.
- **my-chat-app/** — React + TypeScript + Vite + Tailwind chat UI with multiple conversations.
- **chat-runner/** — one-command dev launcher: starts Qdrant (Docker), both Python services and the Vite dev server, cross-platform.

## Quickstart

```bash
cp ".env .sample" .env        # set OPENAI_API_KEY
docker compose up -d          # Qdrant on :6335

# one-command dev run (starts everything):
cd chat-runner && npm install && node index.js
```

Or start services manually:

```bash
# 1) backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 2) inference service
cd inference-service && pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# 3) frontend
cd my-chat-app && npm install && npm run dev   # http://localhost:5173
```

## Stack

Python · FastAPI · OpenAI API · SSE streaming · Qdrant · mem0 · rank_bm25 · React · TypeScript · Vite · Tailwind · Docker
