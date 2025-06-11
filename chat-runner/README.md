# Chat Runner

This script starts the backend, inference-service, and frontend apps together.

## Usage

1. Ensure you have Node.js (>=14) installed.
2. From the repo root:
   ```bash
   cd chat-runner
   npm install
   npm start
   ```

3. Services will be available at:
   - Qdrant HTTP API: http://localhost:6335
   - Qdrant gRPC API (optional): localhost:6334
   - Backend: http://localhost:8000
   - Inference-service: http://localhost:8001
   - Frontend: http://localhost:5173

4. Press `Ctrl+C` in this terminal to stop all services.