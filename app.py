import time
import webbrowser
import threading
import sqlite3
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from flask import Flask, Response, request, jsonify, g, send_from_directory
from flask_cors import CORS
import cv2
from ultralytics import YOLO

# Configuration
FLASK_PORT = 5500  # Flask serves as the main server
DIRECTORY = "html"  # Directory to serve static files from
DEFAULT_FILE = "home.html"
MODEL_PATHS = ["model/yolo11n.pt"]
DB_PATH = "db/luka.db"

# Load multiple YOLO models
models = [YOLO(path) for path in MODEL_PATHS]
model_toggle = True  # Toggle for enabling/disabling model inference

# Initialize Flask application
app = Flask(__name__, static_folder=".")
CORS(app)  # Enable Cross-Origin Resource Sharing (CORS)

# Database helper function
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

# Close the database connection when the app context ends
@app.teardown_appcontext
def close_db(error):
    if 'db' in g:
        g.db.close()

# Continuously fetch frames from the video stream and return as HTTP response
def generate_frames(stream_url):
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

# Serve the main home page
@app.route("/")
def serve_home():
    return send_from_directory("html", "home.html")

# Serve files specifically from the `html/` folder with /html/ in the URL
@app.route("/html/<path:filename>")
def serve_html(filename):
    return send_from_directory("html", filename)

# Serve static files from various directories
@app.route("/<path:filename>")
def serve_static(filename):
    if filename.startswith(("css/", "js/", "img/", "json/", "model/")):
        return send_from_directory(".", filename)
    return send_from_directory("html", filename)  # Default to HTML folder

# Retrieve all active devices from the database
@app.route('/get_devices', methods=['GET'])
def get_devices():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM camera WHERE status = 'active'")
    devices = cursor.fetchall()
    return jsonify([dict(device) for device in devices])

# Add a new camera device to the database
@app.route('/add_device', methods=['POST'])
def add_device():
    data = request.get_json()
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO camera (title, ip_address, location, status) VALUES (?, ?, ?, 'active')",
        (data['title'], data['ip_address'], data['location'])
    )
    db.commit()
    return jsonify({"id": cursor.lastrowid, **data})

# Update an existing camera device
@app.route('/update_device', methods=['POST'])
def update_device():
    data = request.get_json()
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE camera SET title = ?, ip_address = ?, location = ? WHERE id = ?",
        (data['title'], data['ip_address'], data['location'], data['id'])
    )
    db.commit()
    return jsonify({"success": True})

# Soft-delete a camera device by marking it as inactive
@app.route('/delete_device', methods=['POST'])
def delete_device():
    data = request.get_json()
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE camera SET status = 'inactive' WHERE id = ?", (data['id'],))
    db.commit()
    return jsonify({"success": True})

# Endpoint to stream video from RTSP, HTTP, or HTTPS sources
@app.route('/stream')
def stream():
    stream_url = request.args.get('stream_url')
    if not stream_url:
        return "Stream URL is missing", 400
    if not (stream_url.startswith("rtsp://") or stream_url.startswith("http://") or stream_url.startswith("https://")):
        return "Invalid stream URL", 400
    return Response(generate_frames(stream_url), mimetype='multipart/x-mixed-replace; boundary=frame')

# Toggle model inference on or off
@app.route('/toggle_model', methods=['POST'])
def toggle_model():
    global model_toggle
    data = request.get_json()
    if 'enabled' in data:
        model_toggle = data['enabled']
    return jsonify({"model_toggle": model_toggle})

# Watchdog event handler to detect file changes
class ReloadHandler(FileSystemEventHandler):
    def on_modified(self, event):
        print(f"File changed: {event.src_path}")

# Start a file watcher to detect changes in the project directory
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

if __name__ == "__main__":
    # Start Flask server in a thread
    flask_thread = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=FLASK_PORT, threaded=True, use_reloader=False))
    flask_thread.daemon = True
    flask_thread.start()
    
    # Wait for Flask to initialize
    time.sleep(3)
    
    # Open the default page in a browser
    webbrowser.open_new_tab(f"http://localhost:{FLASK_PORT}/")
    
    # Start file watcher in the main thread
    start_file_watcher()