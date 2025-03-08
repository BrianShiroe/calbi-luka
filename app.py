import time
import webbrowser
import threading
import sqlite3
import cv2
import yt_dlp
import numpy as np
import ffmpeg
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from flask import Flask, Response, request, jsonify, g, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
from concurrent.futures import ThreadPoolExecutor

# Configuration
FLASK_PORT = 5500  # Flask serves as the main server
DIRECTORY = "html"  # Directory to serve static files from
DEFAULT_FILE = "home.html"
MODEL_PATHS = ["model/yolo11n.pt"]
DB_PATH = "db/luka.db"
models = [YOLO(path).to('cuda') for path in MODEL_PATHS]  # Use GPU if available

#Modifications
detection_mode = True  # Toggle for enabling/disabling model inference
show_bounding_box = True  # Toggle model bounding Box
performance_metrics_toggle = True # Toggle for displaying performance metrics
confidence_level = 0.7  # Model's confidence level
max_frame_rate = 60 #60fps. Provide maximum frame that the feed can stream.
update_metric_interval = 1 # Update text every # second instead of every frame
metric_font_size = 24 #24px. font size for metric values

# This feature is currently under development.
target_objects = {"crash", "smoke", "fire", "landslide", "flood"} #to detect objects for yolo
FRAME_SKIP = 1  # Only process 1 out of every 2 frames (adjust as needed)

app = Flask(__name__, static_folder=".") # Initialize Flask application
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

# SECTION: generate_frames
def get_youtube_stream_url(youtube_url):
    ydl_opts = {'format': 'best', 'quiet': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(youtube_url, download=False)
            return info['url'] if 'url' in info else None
        except Exception as e:
            print(f"Failed to fetch YouTube stream: {e}")
            return None
        
def get_fresh_stream(stream_url):
    if "youtube.com" in stream_url or "youtu.be" in stream_url:
        new_url = get_youtube_stream_url(stream_url)
        print(f"Refreshing YouTube stream URL: {new_url}")
        return new_url
    return stream_url

def initialize_stream(stream_url):
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"Failed to open stream: {stream_url}")
        return None
    return cap

def process_frame(frame):
    process_start = time.time()
    model_status_text = "Model: OFF"

    if detection_mode:
        model_status_text = "Model: ON"
        for model in models:
            results = model(frame, verbose=False, conf=confidence_level)
            if show_bounding_box:
                for result in results:
                    frame = result.plot()

    processing_time = time.time() - process_start
    return frame, processing_time, model_status_text

def encode_frame(frame):
    _, buffer = cv2.imencode('.jpg', frame)
    return buffer.tobytes()

def enforce_frame_rate(frame_start_time):
    if max_frame_rate > 0:
        time_to_wait = 1.0 / max_frame_rate - (time.time() - frame_start_time)
        if time_to_wait > 0:
            time.sleep(time_to_wait)

def initialize_metrics():
    return {
        "frame_count": 0,
        "start_time": time.time(),
        "last_frame_time": None,
        "last_update_time": time.time(),
        "displayed_fps": 0,
        "displayed_frame_rate": 0,
        "displayed_processing_time": 0,
        "displayed_real_time_lag": 0
    }

def update_metrics(metrics, frame_start_time, processing_time):
    metrics["frame_count"] += 1
    elapsed_time = time.time() - metrics["start_time"]

    fps = metrics["frame_count"] / elapsed_time if elapsed_time > 0 else 0
    frame_rate = 1 / (frame_start_time - metrics["last_frame_time"]) if metrics["last_frame_time"] else 0
    real_time_lag = time.time() - frame_start_time  

    metrics["last_frame_time"] = frame_start_time  

    # Update only if interval has passed
    if time.time() - metrics["last_update_time"] > update_metric_interval:
        metrics["last_update_time"] = time.time()
        metrics["displayed_fps"] = fps
        metrics["displayed_frame_rate"] = frame_rate
        metrics["displayed_processing_time"] = processing_time
        metrics["displayed_real_time_lag"] = real_time_lag

def overlay_metrics(frame, metrics, model_status_text):
    font_scale = metric_font_size / 10
    font_thickness = 6
    colors = {
        "Model Status": (0, 0, 255),
        "FPS": (0, 255, 0),
        "Frame Rate": (255, 255, 0),
        "Processing Time": (255, 0, 255),
        "Streaming Delay": (0, 165, 255)
    }

    if performance_metrics_toggle:
        cv2.putText(frame, model_status_text, (30, 100), cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["Model Status"], font_thickness)
        cv2.putText(frame, f"FPS: {metrics['displayed_fps']:.2f}", (30, 200), cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["FPS"], font_thickness)
        cv2.putText(frame, f"Frame Rate: {metrics['displayed_frame_rate']:.2f} FPS", (30, 300), cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["Frame Rate"], font_thickness)
        cv2.putText(frame, f"Processing Time: {metrics['displayed_processing_time']:.3f}s", (30, 400), cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["Processing Time"], font_thickness)
        cv2.putText(frame, f"Streaming Delay: {metrics['displayed_real_time_lag']:.3f}s", (30, 500), cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["Streaming Delay"], font_thickness)

    return frame

def generate_frames(stream_url):
    cap = initialize_stream(get_fresh_stream(stream_url))
    if cap is None:
        return

    metrics = initialize_metrics()
    frame_count = 0

    try:
        while True:
            frame_start_time = time.time()

            success, frame = cap.read()
            if not success:
                print(f"Stream disconnected: {stream_url}. Attempting to refresh URL...")
                cap.release()
                cap = initialize_stream(get_fresh_stream(stream_url))  # Reconnect with new YouTube URL
                if cap is None:
                    print("Failed to reconnect. Stopping stream.")
                    break
                continue  # Skip this iteration and retry

            frame_count += 1
            if frame_count % FRAME_SKIP != 0:
                continue  # Skip this frame to reduce processing load

            # Process the frame only when not skipped
            frame, processing_time, model_status_text = process_frame(frame)
            update_metrics(metrics, frame_start_time, processing_time)
            frame = overlay_metrics(frame, metrics, model_status_text)
            encoded_frame = encode_frame(frame)

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + encoded_frame + b'\r\n')

            enforce_frame_rate(frame_start_time)  # Ensure FPS limit is respected
    finally:
        cap.release()
        cv2.destroyAllWindows()

# stream handler
@app.route('/stream')
def stream():
    stream_url = request.args.get('stream_url')
    if not stream_url:
        return "Stream URL is missing", 400

    if "youtube.com" in stream_url or "youtu.be" in stream_url:
        stream_url = get_youtube_stream_url(stream_url)
        if not stream_url:
            return "Could not fetch YouTube stream", 400

    if not (stream_url.startswith("rtsp://") or stream_url.startswith("http://") or stream_url.startswith("https://")):
        return "Invalid stream URL", 400

    return Response(generate_frames(stream_url), mimetype='multipart/x-mixed-replace; boundary=frame')

# SECTION: Start of flask route handlers
@app.route("/")
def serve_home():
    return send_from_directory("html", "home.html")

@app.route("/html/<path:filename>")
def serve_html(filename):
    return send_from_directory("html", filename)

@app.route("/<path:filename>")
def serve_static(filename):
    if filename.startswith(("css/", "js/", "img/", "json/", "model/")):
        return send_from_directory(".", filename)
    return send_from_directory("html", filename)

# SECTION: device configuration API
@app.route('/get_devices', methods=['GET'])
def get_devices():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM camera WHERE status = 'active'")
    devices = cursor.fetchall()
    return jsonify([dict(device) for device in devices])

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

@app.route('/delete_device', methods=['POST'])
def delete_device():
    data = request.get_json()
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE camera SET status = 'inactive' WHERE id = ?", (data['id'],))
    db.commit()
    return jsonify({"success": True})

# SECTION: feature toggle API
@app.route('/toggle_model', methods=['POST'])
def toggle_model():
    global detection_mode
    data = request.get_json()
    if 'enabled' in data:
        detection_mode = data['enabled']
    return jsonify({"detection_mode": detection_mode})

@app.route('/toggle_bounding_box', methods=['POST'])
def toggle_bounding_box():
    global show_bounding_box
    data = request.get_json()
    if 'enabled' in data:
        show_bounding_box = data['enabled']
    return jsonify({"show_bounding_box": show_bounding_box})

@app.route('/toggle_performance_metrics', methods=['POST'])
def toggle_performance_metrics():
    global performance_metrics_toggle
    data = request.get_json()
    if 'enabled' in data:
        performance_metrics_toggle = data['enabled']
    return jsonify({"performance_metrics_toggle": performance_metrics_toggle})

@app.route('/set_confidence_level', methods=['POST'])
def set_confidence_level():
    global confidence_level
    data = request.get_json()
    if 'confidence' in data:
        confidence_level = float(data['confidence'])  # The value from frontend is in 0-1 range
    return jsonify({"confidence_level": confidence_level})

@app.route('/set_update_metric_interval', methods=['POST'])
def set_update_metric_interval():
    global update_metric_interval
    data = request.get_json()
    if 'interval' in data:
        update_metric_interval = float(data['interval'])
    return jsonify({"update_metric_interval": update_metric_interval})

@app.route('/set_metric_font_size', methods=['POST'])
def set_metric_font_size():
    global metric_font_size
    data = request.get_json()
    if 'size' in data:
        metric_font_size = int(data['size'])
    return jsonify({"metric_font_size": metric_font_size})

@app.route('/set_max_frame_rate', methods=['POST'])
def set_max_frame_rate():
    global max_frame_rate
    data = request.get_json()
    if 'max_frame_rate' in data:
        max_frame_rate = int(data['max_frame_rate'])
    return jsonify({"max_frame_rate": max_frame_rate})

@app.route('/set_target_object', methods=['POST'])
def set_target_object():
    data = request.get_json()
    selected_target = data.get('target')
    print(f"Target object set to: {selected_target}")
    return jsonify({"selected_target": selected_target})

if __name__ == "__main__":
    # Start Flask server in a thread
    flask_thread = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=FLASK_PORT, threaded=True, use_reloader=False))
    flask_thread.daemon = True
    flask_thread.start()
    
    # Wait for Flask to initialize
    time.sleep(5)   
    
    # Open the default page in a browser
    webbrowser.open_new_tab(f"http://127.0.0.1:{FLASK_PORT}/html/home.html")
    
    # Start file watcher in the main thread
    start_file_watcher()