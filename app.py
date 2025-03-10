import time
import webbrowser
import threading
import sqlite3
import cv2
import yt_dlp
import numpy as np
import ffmpeg
import os
import re
import psutil
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
detected_records_path = "records"
os.makedirs(detected_records_path, exist_ok=True)
last_record_times = {}  # Dictionary to store last save time per stream

#Modifications
detection_mode = True
show_bounding_box = True
show_confidence_value = False
performance_metrics_toggle = True
confidence_level = 0.7
max_frame_rate = 60
update_metric_interval = 1
metric_font_size = 8
delay_for_record_logging = 5
stream_resolution = "720p"  # 144p, 160p, 180p, 240p, 360p, 480p, 720p, 1080p
stream_frame_skip = 1  # Only process 1 out of every 2 frames (adjust as needed)

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

# Subsection: process_frame
def detect_objects(frame):
    detected_objects = set()
    
    for model in models:
        results = model(frame, verbose=False, conf=confidence_level)
        
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls)
                class_name = model.names[class_id]  # Get the class name from the model
                detected_objects.add(class_name)

                if show_bounding_box:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])  # Get bounding box coordinates
                    color = (0, 255, 0)  # Green color for the bounding box
                    thickness = 5
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)  # Draw bounding box

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

    return frame, detected_objects
    
def save_detected_frame(frame, stream_url, detected_objects, device_title, device_location, device_id):
    global last_record_times
    current_time = time.time()
    last_record_time = last_record_times.get(stream_url, 0)
    
    if detected_objects and (current_time - last_record_time > delay_for_record_logging):
        last_record_times[stream_url] = current_time
        detected_objects_str = "_".join(sorted(detected_objects)) if detected_objects else "no_object"
        timestamp = time.strftime("%y%m%d_%H%M%S")
        filename = os.path.join(
            detected_records_path,
            f"detected_{timestamp}_{detected_objects_str}_{device_title}_{device_location}_ID{device_id}.jpg"
        )
        cv2.imwrite(filename, frame)
        print(f"Object Detected! Image saved as {filename}")
        
        # Ensure database operations are executed inside the Flask app context
        with app.app_context():
            db = get_db()
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO alert (camera_id, camera_title, event_type, location, detected_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (device_id, device_title, detected_objects_str, device_location, timestamp)
            )
            db.commit()

def process_frame(frame, stream_url, device_title, device_location, device_id):
    process_start = time.time()
    model_status_text = "Model: OFF"
    
    if detection_mode:
        model_status_text = "Model: ON"
        frame, detected_objects = detect_objects(frame)
        save_detected_frame(frame, stream_url, detected_objects, device_title, device_location, device_id)
    
    timestamp_text = time.strftime("%Y-%m-%d %H:%M:%S")
    # cv2.putText(frame, timestamp_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    processing_time = time.time() - process_start
    return frame, processing_time, model_status_text

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
        "displayed_cpu_usage": 0.0  # Ensure this key exists
    }

def update_metrics(metrics, frame_start_time, processing_time):
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
        "CPU Usage": (255, 140, 0)  # Orange color for CPU usage
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
            (f"CPU Usage: {metrics['displayed_cpu_usage']:.2f}%", "CPU Usage")  # Display CPU usage
        ]
        
        for i, (text, key) in enumerate(metrics_text):
            y_position = start_y + (i * line_spacing)
            cv2.putText(frame, text, (start_x, y_position), cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors[key], font_thickness)
    
    return frame

def set_stream_resolution(cap):
    if stream_resolution in resolutions:
        width, height = resolutions[stream_resolution]
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        print(f"Stream resolution set to {stream_resolution} ({width}x{height})")
    else:
        print(f"Invalid resolution: {stream_resolution}. Keeping default.")

def generate_frames(stream_url, device_title, device_location, device_id):
    global stream_resolution

    cap = initialize_stream(get_fresh_stream(stream_url))
    if cap is None:
        return

    set_stream_resolution(cap)  # Apply resolution
    metrics = initialize_metrics()
    frame_count = 0

    try:
        while True:
            frame_start_time = time.time()

            success, frame = cap.read()
            if not success:
                print(f"Stream disconnected: {stream_url}. Attempting to refresh URL...")
                cap.release()
                cap = initialize_stream(get_fresh_stream(stream_url))  
                if cap is None:
                    print("Failed to reconnect. Stopping stream.")
                    break
                set_stream_resolution(cap)  # Reapply resolution
                continue  

            frame_count += 1
            if frame_count % stream_frame_skip != 0:
                continue  

            # Manually resize frame (since OpenCV may ignore cap.set())
            if stream_resolution in resolutions:
                width, height = resolutions[stream_resolution]
                frame = cv2.resize(frame, (width, height))

            # Process frame
            frame, processing_time, model_status_text = process_frame(frame, stream_url, device_title, device_location, device_id)
            update_metrics(metrics, frame_start_time, processing_time)
            frame = overlay_metrics(frame, metrics, model_status_text)
            encoded_frame = encode_frame(frame)

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + encoded_frame + b'\r\n')

            enforce_frame_rate(frame_start_time)
    finally:
        cap.release()
        cv2.destroyAllWindows()

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

@app.route('/get_alerts', methods=['GET'])
def get_alerts():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM alert ORDER BY detected_at DESC")
    alerts = cursor.fetchall()
    return jsonify([dict(alert) for alert in alerts])

@app.route('/clear_alerts', methods=['POST'])
def clear_alerts():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM alert")
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
    
    # Permanently delete the device from the database
    cursor.execute("DELETE FROM camera WHERE id = ?", (data['id'],))
    
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