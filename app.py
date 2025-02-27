import subprocess
import webbrowser
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class ReloadHandler(FileSystemEventHandler):
    def __init__(self, process):
        self.process = process

    def on_any_event(self, event):
        if event.is_directory:
            return
        print(f"File {event.src_path} changed, restarting server...")
        self.process.kill()
        self.process = subprocess.Popen(["python", "-m", "http.server", "8000"])

if __name__ == "__main__":
    url = "http://localhost:8000/html/home.html"
    
    # Start HTTP Server
    process = subprocess.Popen(["python", "-m", "http.server", "8000"])
    time.sleep(1)  # Give server time to start

    # Automatically open browser
    webbrowser.open(url)

    # Start Watchdog observer
    event_handler = ReloadHandler(process)
    observer = Observer()
    observer.schedule(event_handler, ".", recursive=True)
    observer.start()
    
    try:
        while True:
            pass
    except KeyboardInterrupt:
        process.kill()
        observer.stop()
    observer.join()
