1. Backend (FastAPI / Uvicorn)
        cd backend
        # (optional) create & activate a venv
        python3 -m venv .venv && source .venv/bin/activate
        pip install -r requirements.txt
        uvicorn main:app --reload --host 0.0.0.0 --port 8000

    • Your API will be live at http://localhost:8000/

2. Inference‐service (FastAPI / Uvicorn)
        cd inference-service
        # (optional) create & activate a venv
        python3 -m venv venv && source venv/bin/activate
        pip install -r requirements.txt
        uvicorn main:app --reload --port 8001

    • Your service will be live at http://localhost:8001/
    
3. Frontend (“my-chat-app”, React + Vite)
        cd my-chat-app
        npm install          # or yarn
        npm run dev          # starts Vite’s dev server

    • By default Vite serves on http://localhost:5173/