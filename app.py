import time
import webbrowser
import threading
import sqlite3
import cv2
import yt_dlp
import numpy as np
import os
import re
import psutil
import json
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from flask import Flask, Response, request, jsonify, g, send_from_directory, stream_with_context
from flask_cors import CORS
from ultralytics import YOLO
from concurrent.futures import ThreadPoolExecutor

# Logging/Printing Function. INFO to Show all logs, ERROR to show only errors.
log = logging.getLogger('werkzeug')
log.setLevel(logging.INFO)

# Configuration
FLASK_PORT = 5500  # Flask serves as the main server
DIRECTORY = "html"  # Directory to serve static files from
DEFAULT_FILE = "home.html"
DB_PATH = "db/luka.db"
detected_records_path = "records"
os.makedirs(detected_records_path, exist_ok=True)

#General Settings
detection_mode = False
performance_metrics_toggle = False
update_metric_interval = 1
metric_font_size = 8
stream_resolution = "720p"  # 144p, 160p, 180p, 240p, 360p, 480p, 720p, 1080p
stream_frame_skip = 0  # Only process 1 out of every 2 frames (adjust as needed)
max_frame_rate = 60
#Detection Settings
model_version = "yolo11n"
show_bounding_box = True
show_confidence_value = False
confidence_level = 0.7
plotting_method = "mark_object"  # mark_object, mark_screen
alert_and_record_logging = True
delay_for_alert_and_record_logging = 10

# Mapping of setting keys to global variable names
setting_vars = {
    "detection_mode": "detection_mode",
    "performance_metrics_toggle": "performance_metrics_toggle",
    "update_metric_interval": "update_metric_interval",
    "metric_font_size": "metric_font_size",
    "stream_resolution": "stream_resolution",
    "stream_frame_skip": "stream_frame_skip",
    "max_frame_rate": "max_frame_rate",
    "model_version": "model_version",
    "show_bounding_box": "show_bounding_box",
    "show_confidence_value": "show_confidence_value",
    "confidence_level": "confidence_level",
    "plotting_method": "plotting_method",
    "alert_and_record_logging": "alert_and_record_logging",
    "delay_for_alert_and_record_logging": "delay_for_alert_and_record_logging"
}

MODEL_PATHS = [f"model/{model_version}.pt"]
models = [YOLO(path).to('cuda') for path in MODEL_PATHS]  # Use GPU if available

# Global variables
active_streams = 0
active_streams_dict = {}  # Track active streams by device ID
last_record_times = {}  # Dictionary to store last save time per stream

#resolution options
resolutions = {
    "144p": (176, 144),
    "160p": (288, 160),
    "180p": (320, 180),
    "240p": (320, 240),
    "360p": (480, 360),
    "480p": (640, 480),
    "720p": (1280, 720),
    "1080p": (1920, 1080)
}

#DONT TOUCH (TO INCLUDE)
target_objects = {"crash", "smoke", "fire", "landslide", "flood"} #to detect objects for yolo

app = Flask(__name__, static_folder=".") # Initialize Flask application
CORS(app)  # Enable Cross-Origin Resource Sharing (CORS)

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

# SECTION: starting stream
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

# SECTION: object detection
def detect_objects(frame):
    global mark_screen_duration
    detected_objects = set()
    object_detected = False  # Track if an object was detected in this frame
    
    for model in models:
        results = model(frame, verbose=False, conf=confidence_level)
        
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls)
                class_name = model.names[class_id]  # Get the class name from the model
                detected_objects.add(class_name)
                object_detected = True  # Mark that an object is detected

                if show_bounding_box:
                    if plotting_method == "mark_object":
                        # Draw bounding box around detected objects
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        color = (0, 255, 0)  # Green color for the bounding box
                        thickness = 5
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)

                        if show_confidence_value:
                            confidence = box.conf[0].item()  # Get confidence value
                            label = f"{class_name} {confidence:.2f}"
                            font = cv2.FONT_HERSHEY_SIMPLEX
                            font_scale = 2
                            font_thickness = 5
                            text_color = (0, 255, 0)  # Green text

                            # Put text slightly above the bounding box
                            text_size = cv2.getTextSize(label, font, font_scale, font_thickness)[0]
                            text_x = x1
                            text_y = max(y1 - 5, text_size[1] + 5)  # Ensure text is inside the frame
                            cv2.putText(frame, label, (text_x, text_y), font, font_scale, text_color, font_thickness)
    
                    # Handle mark_screen logic
                    elif plotting_method == "mark_screen":
                        if object_detected:
                            screen_color = (0, 0, 255)  # Red color for screen marking
                            thickness = 50
                            height, width, _ = frame.shape
                            cv2.rectangle(frame, (0, 0), (width, height), screen_color, thickness)
                            
    return frame, detected_objects
    
# SUBSECTION: record and alert object detected
def save_detected_frame(frame, stream_url, detected_objects, device_title, device_location, device_id):
    global last_record_times
    
    if not alert_and_record_logging:  # Skip recording if logging is disabled
        return
    
    current_time = time.time()
    last_record_time = last_record_times.get(stream_url, 0)

    if detected_objects and (current_time - last_record_time > delay_for_alert_and_record_logging):
        last_record_times[stream_url] = current_time
        detected_objects_str = "_".join(sorted(detected_objects)) if detected_objects else "no_object"
        timestamp = time.strftime("%m-%d-%y_%I.%M.%S%p")
        formatted_timestamp = time.strftime("%m-%d-%y_%I.%M.%S%p")
        
        filename = os.path.join(
            detected_records_path,
            f"{timestamp}_{detected_objects_str}_detected_on_{device_title}_{device_location}.jpg"
        )
        cv2.imwrite(filename, frame)
        # print(f"Object Detected! Image saved as {filename}")

        # Ensure database operations are executed inside the Flask app context
        with app.app_context():
            db = get_db()
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO alert (camera_id, camera_title, event_type, location, detected_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (device_id, device_title, detected_objects_str, device_location, formatted_timestamp)
            )
            db.commit()

def process_frame(frame, stream_url, device_title, device_location, device_id):
    process_start = time.time()
    model_status_text = "Model: OFF"
    
    if detection_mode:
        model_status_text = "Model: ON"
        frame, detected_objects = detect_objects(frame)
        save_detected_frame(frame, stream_url, detected_objects, device_title, device_location, device_id)
    
    processing_time = time.time() - process_start
    return frame, processing_time, model_status_text

# SECTION: stream settings
def sanitize_filename(url):
    sanitized = re.sub(r'[^\w\-_.]', '_', url)  # Replace unsafe characters with '_'
    return sanitized[:50]  # Limit length to avoid filesystem issues

def encode_frame(frame):
    _, buffer = cv2.imencode('.jpg', frame)
    return buffer.tobytes()

def enforce_frame_rate(frame_start_time):
    if max_frame_rate > 0:
        time_to_wait = 1.0 / max_frame_rate - (time.time() - frame_start_time)
        if time_to_wait > 0:
            time.sleep(time_to_wait)

#SECTION: metrics
def initialize_metrics():
    return {
        "frame_count": 0,
        "start_time": time.time(),
        "last_frame_time": None,
        "last_update_time": time.time(),
        "displayed_fps": 0,
        "displayed_frame_rate": 0,
        "displayed_processing_time": 0,
        "displayed_real_time_lag": 0,
        "displayed_cpu_usage": 0.0,
        "displayed_active_streams": 0  # Track active streams
    }

def update_metrics(metrics, frame_start_time, processing_time, active_streams):
    metrics["frame_count"] += 1
    elapsed_time = time.time() - metrics["start_time"]

    fps = metrics["frame_count"] / elapsed_time if elapsed_time > 0 else 0
    frame_rate = 1 / (frame_start_time - metrics["last_frame_time"]) if metrics["last_frame_time"] else 0
    real_time_lag = time.time() - frame_start_time  
    cpu_usage = psutil.cpu_percent()  # Get current CPU usage

    metrics["last_frame_time"] = frame_start_time  

    # Update only if interval has passed
    if time.time() - metrics["last_update_time"] > update_metric_interval:
        metrics["last_update_time"] = time.time()
        metrics["displayed_fps"] = fps
        metrics["displayed_frame_rate"] = frame_rate
        metrics["displayed_processing_time"] = processing_time
        metrics["displayed_real_time_lag"] = real_time_lag
        metrics["displayed_cpu_usage"] = cpu_usage  # Store CPU usage
        metrics["displayed_active_streams"] = active_streams  # Store active stream count

def overlay_metrics(frame, metrics, model_status_text):
    height, width, _ = frame.shape  # Get current frame dimensions
    font_scale = (height / 480) * (metric_font_size / 10)  # Scale font size dynamically
    font_thickness = max(1, int(height / 240))  # Adjust thickness based on resolution
    line_spacing = int(40 * font_scale)  # Adjust vertical spacing dynamically
    start_x = int(0.05 * width)  # Adjust left margin based on frame width
    start_y = int(0.10 * height)  # Starting position for text

    colors = {
        "Timestamp": (173, 216, 230),
        "Model Status": (0, 0, 255),
        "FPS": (0, 255, 0),
        "Frame Rate": (255, 255, 0),
        "Processing Time": (255, 0, 255),
        "Streaming Delay": (0, 165, 255),
        "Resolution": (255, 255, 255),
        "CPU Usage": (255, 140, 0),  # Orange color for CPU usage
        "Active Streams": (0, 255, 255)  # Cyan color for active streams
    }

    current_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time()))

    if performance_metrics_toggle:
        metrics_text = [
            (f"Timestamp: {current_time}", "Timestamp"),
            (model_status_text, "Model Status"),
            (f"FPS: {metrics['displayed_fps']:.2f}", "FPS"),
            (f"Frame Rate: {metrics['displayed_frame_rate']:.2f} FPS", "Frame Rate"),
            (f"Processing Time: {metrics['displayed_processing_time']:.3f}s", "Processing Time"),
            (f"Streaming Delay: {metrics['displayed_real_time_lag']:.3f}s", "Streaming Delay"),
            (f"Resolution: {stream_resolution}", "Resolution"),
            (f"CPU Usage: {metrics['displayed_cpu_usage']:.2f}%", "CPU Usage"),
            (f"Active Streams: {metrics['displayed_active_streams']}", "Active Streams")  # Display active streams
        ]
        
        for i, (text, key) in enumerate(metrics_text):
            y_position = start_y + (i * line_spacing)
            cv2.putText(frame, text, (start_x, y_position), cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors[key], font_thickness)
    
    return frame

def setup_stream_resolution(cap):
    if stream_resolution in resolutions:
        width, height = resolutions[stream_resolution]
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        #print(f"Stream resolution set to {stream_resolution} ({width}x{height})")
    else:
        print(f"Invalid resolution: {stream_resolution}. Keeping default.")

#SECTION: Main Streaming Function
def generate_frames(stream_url, device_title, device_location, device_id):
    global stream_resolution, active_streams  

    # Register the stream as active
    active_streams_dict[device_id] = True  

    cap = initialize_stream(get_fresh_stream(stream_url))
    if cap is None:
        return

    setup_stream_resolution(cap)
    metrics = initialize_metrics()
    frame_count = 0
    active_streams += 1  

    try:
        while active_streams_dict.get(device_id, False):  # Check if stream is still allowed
            frame_start_time = time.time()

            success, frame = cap.read()
            if not success:
                print(f"Stream disconnected: {device_title}. Attempting to refresh URL...")
                cap.release()
                cap = initialize_stream(get_fresh_stream(stream_url))  
                if cap is None:
                    print("Failed to reconnect. Stopping stream.")
                    break
                setup_stream_resolution(cap)
                continue  

            frame_count += 1
            if stream_frame_skip > 0 and frame_count % stream_frame_skip != 0:
                continue  

            if stream_resolution in resolutions:
                width, height = resolutions[stream_resolution]
                frame = cv2.resize(frame, (width, height))

            frame, processing_time, model_status_text = process_frame(frame, stream_url, device_title, device_location, device_id)
            update_metrics(metrics, frame_start_time, processing_time, active_streams)
            frame = overlay_metrics(frame, metrics, model_status_text)
            encoded_frame = encode_frame(frame)

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + encoded_frame + b'\r\n')

            enforce_frame_rate(frame_start_time)

    finally:
        active_streams -= 1  
        cap.release()
        cv2.destroyAllWindows()
        active_streams_dict.pop(device_id, None)  # Remove from active tracking

# stream handler
@app.route('/stream')
def stream():
    stream_url = request.args.get('stream_url')
    device_title = request.args.get('device_title', 'Unknown')
    device_location = request.args.get('device_location', 'Unknown')
    device_id = request.args.get('device_id', 'Unknown')  # Get the device ID from the request

    if not stream_url:
        return "Stream URL is missing", 400

    if "youtube.com" in stream_url or "youtu.be" in stream_url:
        stream_url = get_youtube_stream_url(stream_url)
        if not stream_url:
            return "Could not fetch YouTube stream", 400

    if not (stream_url.startswith("rtsp://") or stream_url.startswith("http://") or stream_url.startswith("https://")):
        return "Invalid stream URL", 400

    return Response(generate_frames(stream_url, device_title, device_location, device_id), mimetype='multipart/x-mixed-replace; boundary=frame')

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
def get_db(): # Database helper function
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.route('/stream_alerts', methods=['GET'])
def stream_alerts():
    def event_stream():
        db = get_db()
        cursor = db.cursor()
        last_id = 0  # Track the last alert ID sent to the client

        while True:
            # Fetch new unresolved alerts (those with ID > last_id and resolved = 0)
            cursor.execute("SELECT * FROM alert WHERE id > ? AND resolved = 0 ORDER BY detected_at DESC", (last_id,))
            alerts = cursor.fetchall()

            if alerts:
                for alert in alerts:
                    last_id = alert['id']  # Update the last sent alert ID
                    data = json.dumps(dict(alert))  # Convert alert to JSON
                    yield f"data: {data}\n\n"  # SSE format

            time.sleep(1)  # Polling interval (can be adjusted)

    return Response(stream_with_context(event_stream()), content_type='text/event-stream')

@app.route('/get_alerts', methods=['GET'])
def get_alerts():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM alert WHERE resolved = 0 ORDER BY detected_at DESC")
    alerts = cursor.fetchall()
    return jsonify([dict(alert) for alert in alerts])

@app.route('/clear_alerts', methods=['POST'])
def clear_alerts():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE alert SET resolved = 1 WHERE resolved = 0")
    db.commit()
    return jsonify({"success": True})

@app.teardown_appcontext # Close the database connection when the app context ends
def close_db(error):
    if 'db' in g:
        g.db.close()

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
    device_id = data['id']

    # Stop the stream if it's running
    if device_id in active_streams_dict:
        active_streams_dict[device_id] = False  # Signal stream to stop
        time.sleep(1)  # Give time for the stream to properly stop

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE camera SET title = ?, ip_address = ?, location = ? WHERE id = ?",
        (data['title'], data['ip_address'], data['location'], data['id'])
    )
    db.commit()

    # Ensure the stream restarts when next requested
    active_streams_dict.pop(device_id, None)

    return jsonify({"success": True})

@app.route('/delete_device', methods=['POST'])
def delete_device():
    data = request.get_json()
    device_id = data['id']

    # Stop the stream if it's running
    if device_id in active_streams_dict:
        active_streams_dict[device_id] = False  # Signal stream to stop

    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("DELETE FROM camera WHERE id = ?", (device_id,))
    
    db.commit()
    return jsonify({"success": True})

# SECTION: record logs
@app.route('/get_recorded_files', methods=['GET'])
def get_recorded_files():
    try:
        # Get the list of files in the detected_records_path directory
        files = os.listdir(detected_records_path)
        # Filter out only image and video files (you can add more extensions if needed)
        valid_extensions = ['.jpg', '.jpeg', '.png', '.mp4', '.avi']
        files = [file for file in files if os.path.splitext(file)[1].lower() in valid_extensions]
        # Return the list of files as JSON
        return jsonify(files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/records/<path:filename>')
def serve_recorded_file(filename):
    return send_from_directory(detected_records_path, filename)

# SECTION: setting feature toggle API
@app.route('/update_settings', methods=['POST'])
def update_settings():
    global detection_mode, performance_metrics_toggle, update_metric_interval, metric_font_size
    global stream_resolution, stream_frame_skip, max_frame_rate, model_version
    global show_bounding_box, show_confidence_value, confidence_level, plotting_method
    global alert_and_record_logging, delay_for_alert_and_record_logging, models

    data = request.get_json()
    model_updated = False  # Flag to track if model needs reloading

    for key, value in data.items():
        if key in setting_vars:
            globals()[setting_vars[key]] = value
            if key == "model_version":
                model_updated = True

    if model_updated:
        try:
            MODEL_PATHS = [f"model/{model_version}.pt"]
            models = [YOLO(path).to('cuda') for path in MODEL_PATHS]  # Reload model
            for model in models:
                model.fuse(False)  # Disable fusion to avoid attribute error
            print(f"Model {model_version} loaded successfully!")
        except Exception as e:
            print(f"Error loading model {model_version}: {e}")

    return jsonify(data)

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