$ cd backend
$ python3 -m venv .venv && source .venv/bin/activate  (optional)
$ pip install -r requirements.txt
$ uvicorn main:app --reload --host 0.0.0.0 --port 8000