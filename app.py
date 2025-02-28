import http.server
import socketserver
import os
import time
import webbrowser
import threading
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Define the port and directory to serve
PORT = 5500
DIRECTORY = "."
DEFAULT_FILE = "/html/home.html"  # The default file to open in the browser
PROXY_SCRIPT = "python/proxy.py"  # Path to the proxy script

# Custom handler to serve files
class SimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

# Watchdog event handler to detect file changes
class ReloadHandler(FileSystemEventHandler):
    def on_modified(self, event):
        print(f"File changed: {event.src_path}")
        # You can add logic here to trigger a browser refresh (e.g., via WebSocket or SSE)

# Start the HTTP server
def start_http_server():
    with socketserver.TCPServer(("", PORT), SimpleHTTPRequestHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        # Open the default file in the browser
        webbrowser.open_new_tab(f"http://localhost:{PORT}{DEFAULT_FILE}")
        httpd.serve_forever()

# Start the file watcher
def start_file_watcher():
    event_handler = ReloadHandler()
    observer = Observer()
    observer.schedule(event_handler, path=DIRECTORY, recursive=True)
    observer.start()
    print(f"Watching for file changes in {DIRECTORY}...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

# Function to run the proxy script
def run_proxy_script():
    print(f"Starting {PROXY_SCRIPT}...")
    try:
        # Use subprocess to run the proxy script
        subprocess.run(["python", PROXY_SCRIPT], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running {PROXY_SCRIPT}: {e}")

if __name__ == "__main__":
    # Start the proxy script first and wait for it to be ready
    proxy_thread = threading.Thread(target=run_proxy_script)
    proxy_thread.daemon = True
    proxy_thread.start()

    # Wait a few seconds to ensure the proxy is up and running
    time.sleep(5)  # Adjust the sleep time as needed

    # Start the HTTP server in a separate thread
    http_thread = threading.Thread(target=start_http_server)
    http_thread.daemon = True
    http_thread.start()

    # Start the file watcher in the main thread
    start_file_watcher()