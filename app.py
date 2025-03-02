import http.server
import socketserver
import time
import webbrowser
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import cv2
from ultralytics import YOLO

# Configuration
PORT = 5500  # Port number for the HTTP server
DIRECTORY = "."  # Directory to serve files from
DEFAULT_FILE = "/html/home.html"
MODEL_PATHS = ["model/yolo11n.pt"]
DB_PATH = "db/luka.db"

# Load multiple YOLO models
models = [YOLO(path) for path in MODEL_PATHS]
model_toggle = True  # Toggle for enabling/disabling model inference

# Initialize Flask application
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing (CORS)

def generate_frames(stream_url):
    """ Continuously fetch frames from the video stream and return as HTTP response. """
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"Failed to open stream: {stream_url}")
        return

    while True:
        success, frame = cap.read()
        if not success:
            print(f"Stream disconnected: {stream_url}")
            break

        if model_toggle:
            for model in models:
                results = model(frame, verbose=False)  # Run inference on each model
                for result in results:
                    frame = result.plot()  # Overlay detections from each model

        _, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

    cap.release()

@app.route('/stream')
def stream():
    """ Endpoint to stream video from RTSP, HTTP, or HTTPS sources. """
    stream_url = request.args.get('stream_url')
    if not stream_url:
        return "Stream URL is missing", 400
    if not (stream_url.startswith("rtsp://") or stream_url.startswith("http://") or stream_url.startswith("https://")):
        return "Invalid stream URL", 400
    return Response(generate_frames(stream_url), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/toggle_model', methods=['POST'])
def toggle_model():
    """ Toggle model inference on or off. """
    global model_toggle
    data = request.get_json()
    if 'enabled' in data:
        model_toggle = data['enabled']
    return jsonify({"model_toggle": model_toggle})

# HTTP Server
class SimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """ Custom HTTP request handler to serve files from the specified directory. """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_http_server():
    """ Start an HTTP server to serve static files. """
    with socketserver.TCPServer(("127.0.0.1", PORT), SimpleHTTPRequestHandler) as httpd:
        print(f"Serving at http://127.0.0.1:{PORT}")
        webbrowser.open_new_tab(f"http://127.0.0.1:{PORT}{DEFAULT_FILE}")  # Force 127.0.0.1
        httpd.serve_forever()

# File Watcher
class ReloadHandler(FileSystemEventHandler):
    """ Watchdog event handler to detect file changes. """
    def on_modified(self, event):
        print(f"File changed: {event.src_path}")

def start_file_watcher():
    """ Start a file watcher to detect changes in the project directory. """
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

if __name__ == "__main__":
    # Start the Flask proxy server in a thread
    flask_thread = threading.Thread(target=lambda: app.run(host='127.0.0.1', port=5000, threaded=True, use_reloader=False))
    flask_thread.daemon = True
    flask_thread.start()
    
    # Wait for Flask to initialize
    time.sleep(5)
    
    # Start HTTP server in a thread
    http_thread = threading.Thread(target=start_http_server)
    http_thread.daemon = True
    http_thread.start()
    
    # Start file watcher in main thread
    start_file_watcher()