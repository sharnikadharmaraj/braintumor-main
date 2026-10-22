import os
import sys
import time
import threading
import subprocess

def run_backend():
    import uvicorn
    print("[BACKEND] Starting FastAPI on http://127.0.0.1:8000 ...", flush=True)
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False, log_level="info")

def run_frontend():
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    print(f"[FRONTEND] Starting Vite in {frontend_dir} ...", flush=True)
    try:
        subprocess.run([npm_cmd, "run", "dev"], cwd=frontend_dir, check=True)
    except Exception as e:
        print(f"[FRONTEND ERROR] {e}", flush=True)

if __name__ == "__main__":
    print("[SYSTEM] Starting Brain Tumor Prediction servers...", flush=True)
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    time.sleep(3)
    run_frontend()
