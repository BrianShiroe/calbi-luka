import time
import webbrowser
import threading
import sqlite3
import psutil
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
models = [YOLO(path) for path in MODEL_PATHS] # Load multiple YOLO models

#Modifications
detection_mode = True  # Toggle for enabling/disabling model inference
show_bounding_box = True  # Toggle model bounding Box
confidence_level = 0.7  # Model's confidence level
max_frame_rate = 60 #60fps. Provide maximum frame that the feed can stream.
performance_metrics_toggle = True # Toggle for displaying performance metrics
update_metric_interval = 1 # Update text every # second instead of every frame
metric_font_size = 24 #24px. font size for metric values

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

def get_memory_usage():
    process = psutil.Process()
    return process.memory_info().rss / (1024 * 1024)  # Convert to MB

# Continuously fetch frames from the video stream and return as HTTP response
def generate_frames(stream_url):
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"Failed to open stream: {stream_url}")
        return
    
    frame_count = 0
    start_time = time.time()
    last_frame_time = None
    last_update_time = time.time()  # Controls how often metrics are updated

    # Cached values for smoother updates
    displayed_fps = 0
    displayed_frame_rate = 0
    displayed_processing_time = 0
    displayed_real_time_lag = 0

    while True:
        frame_start_time = time.time()  
        success, frame = cap.read()
        if not success:
            print(f"Stream disconnected: {stream_url}")
            break

        # Calculate frame rate and timing
        if last_frame_time:
            frame_interval = frame_start_time - last_frame_time  
            frame_rate = 1 / frame_interval if frame_interval > 0 else 0
        else:
            frame_rate = 0  

        last_frame_time = frame_start_time 

        # Measure processing time
        process_start = time.time()

        model_status_text = "Model: OFF"
        if detection_mode:
            model_status_text = "Model: ON"
            for model in models:
                results = model(frame, verbose=False, conf=confidence_level)
                for result in results:
                    if show_bounding_box:
                        frame = result.plot()

        process_end = time.time()
        processing_time = process_end - process_start  

        # FPS Calculation
        frame_count += 1
        elapsed_time = time.time() - start_time
        fps = frame_count / elapsed_time if elapsed_time > 0 else 0

        # Real-Time Lag (Streaming Delay)
        real_time_lag = time.time() - frame_start_time  

        # Only update displayed values every `update_metric_interval` seconds
        if time.time() - last_update_time > update_metric_interval:
            last_update_time = time.time()
            displayed_fps = fps
            displayed_frame_rate = frame_rate
            displayed_processing_time = processing_time
            displayed_real_time_lag = real_time_lag

        # Text properties
        font_scale = metric_font_size / 10  # Adjust font scale based on metric_font_size
        font_thickness = 6  
        colors = {
            "Model Status": (0, 0, 255),  # Red
            "FPS": (0, 255, 0),       # Green
            "Frame Rate": (255, 255, 0),  # Yellow
            "Processing Time": (255, 0, 255),  # Magenta
            "Streaming Delay": (0, 165, 255)  # Orange
        }

        if performance_metrics_toggle:
            cv2.putText(frame, model_status_text, (30, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["Model Status"], font_thickness)
            cv2.putText(frame, f"FPS: {displayed_fps:.2f}", (30, 200),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["FPS"], font_thickness)
            cv2.putText(frame, f"Frame Rate: {displayed_frame_rate:.2f} FPS", (30, 300),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["Frame Rate"], font_thickness)
            cv2.putText(frame, f"Processing Time: {displayed_processing_time:.3f}s", (30, 400),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["Processing Time"], font_thickness)
            cv2.putText(frame, f"Streaming Delay: {displayed_real_time_lag:.3f}s", (30, 500),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, colors["Streaming Delay"], font_thickness)
            memory_usage = get_memory_usage()
            cv2.putText(frame, f"Memory: {memory_usage:.2f} MB", (30, 600),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), font_thickness)

        # Encode frame
        _, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

        # Enforce max frame rate for streaming only
        if max_frame_rate > 0:
            time_to_wait = 1.0 / max_frame_rate - (time.time() - frame_start_time)
            if time_to_wait > 0:
                time.sleep(time_to_wait)

    cap.release()

# Flask route handlers
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
    return send_from_directory("html", filename)  # Default to HTML folder

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

@app.route('/stream')
def stream():
    stream_url = request.args.get('stream_url')
    if not stream_url:
        return "Stream URL is missing", 400
    if not (stream_url.startswith("rtsp://") or stream_url.startswith("http://") or stream_url.startswith("https://")):
        return "Invalid stream URL", 400
    return Response(generate_frames(stream_url), mimetype='multipart/x-mixed-replace; boundary=frame')

# Modification Toggle and Setup
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
        confidence_level = float(data['confidence'])  # The value from frontend is in 0-1 range now
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
    time.sleep(3)   
    
    # Open the default page in a browser
    webbrowser.open_new_tab(f"http://127.0.0.1:{FLASK_PORT}/html/home.html")
    
    # Start file watcher in the main thread
    start_file_watcher()