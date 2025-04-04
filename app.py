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
import pygame
import subprocess
import http.client, urllib
import psutil
import torch
from datetime import datetime
from dotenv import load_dotenv
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from flask import Flask, Response, request, jsonify, g, send_from_directory, stream_with_context, session, send_file
from flask_cors import CORS
from ultralytics import YOLO
from concurrent.futures import ThreadPoolExecutor
from tabulate import tabulate
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user

# Logging/Printing Function. INFO to Show all logs, ERROR to show only errors.
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Configuration
FLASK_PORT = 5500  # Flask serves as the main server
DIRECTORY = "html"  # Directory to serve static files from
DEFAULT_FILE = "home.html"
detected_records_path = "records"
playback_path = "playback"
load_dotenv("api.env") #load pushover api key
APP_TOKEN = os.getenv("PUSHOVER_APP_TOKEN")
USER_KEY = os.getenv("PUSHOVER_USER_KEY")
ffmpeg_path = os.path.abspath("ffmpeg/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe")

# General Settings variables
performance_metrics_toggle = False
update_metric_interval = 1
metric_font_size = 8
stream_resolution = "720p"  # 144p, 160p, 180p, 240p, 360p, 480p, 720p, 1080p
output_resolution = (1920, 1080)
stream_frame_skip = 0  # Only process 1 out of every 2 frames (adjust as needed)
max_frame_rate = 30
playback_recording = False

# Detection Settings variables
detection_mode = False
model_version = "car-fire-5.1.11n"
show_bounding_box = False
show_confidence_value = False
confidence_level = 0.7
enable_alert = False
enable_mobile_alert = False
enable_record_logging = False
delay_for_alert_and_record_logging = 20

# Alert sound variables
alert_sound = False
alert_duration = 2.5  # Duration in seconds
alert_volume = 30  # Volume percentage (0 to 100)
alert_sound_name = "red_alert"
alert_sound_path = f"sound-effect/{alert_sound_name}.mp3"
fade_out_duration = 500  # Fade-out duration in milliseconds (e.g., 500ms = 0.5s)
ALERT_PLAYING = False  # Prevent overlapping alerts

# Mapping of setting keys to global variable names
setting_vars = {
    # General
    "performance_metrics_toggle": "performance_metrics_toggle",
    "update_metric_interval": "update_metric_interval",
    "metric_font_size": "metric_font_size",
    "stream_resolution": "stream_resolution",
    "stream_frame_skip": "stream_frame_skip",
    "max_frame_rate": "max_frame_rate",
    "playback_recording": "playback_recording",
    
    # Model
    "detection_mode": "detection_mode",
    "model_version": "model_version",
    "show_bounding_box": "show_bounding_box",
    "show_confidence_value": "show_confidence_value",
    "confidence_level": "confidence_level",
    "enable_alert": "enable_alert",
    "enable_mobile_alert": "enable_mobile_alert",
    "enable_record_logging": "enable_record_logging",
    "delay_for_alert_and_record_logging": "delay_for_alert_and_record_logging",
    
    # Alert sound
    "alert_sound": "alert_sound",
    "alert_duration": "alert_duration",
    "alert_volume": "alert_volume",
    "alert_sound_name": "alert_sound_name"
}

MODEL_PATHS = [f"model/{model_version}.pt"]
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"YOLO is running on: {device.upper()}")
model = YOLO(MODEL_PATHS[0]).to(device)

# constant varaibles (Do Not Touch)
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

#Flask App Initialization with CORS and Pygame
app = Flask(__name__, static_folder=".") # Initialize Flask application
CORS(app)  # Enable Cross-Origin Resource Sharing (CORS)
pygame.mixer.init()
app.secret_key = 'your_secret_key'  # Change this to a secure key

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
DB_PATH = "db/luka.sqlite"

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

# SECTION: YouTube Stream Handling and Initialization
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

def initialize_stream(stream_url, device_title):
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"Failed to open stream: {device_title}")
        return None
    return cap

# SECTION: Frame Processing with YOLO Detection & Object Highlighting
def process_frame(frame, stream_url, device_title, device_location, device_id):
    process_start = time.time()
    model_status_text = "Model: OFF"
    
    if detection_mode:
        model_status_text = "Model: ON"
        frame, detected_objects = detect_objects(frame)
        save_detected_frame(frame, stream_url, detected_objects, device_title, device_location, device_id)
    
    processing_time = time.time() - process_start
    return frame, processing_time, model_status_text

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
                            
    return frame, detected_objects
    
# SUBSECTION: Record and Alert Object Detected
def save_detected_frame(frame, stream_url, detected_objects, device_title, device_location, device_id):
    global last_record_times
    
    if not enable_record_logging and not enable_alert:  # Skip if both are disabled
        return
    
    current_time = time.time()
    last_record_time = last_record_times.get(stream_url, 0)

    if detected_objects and (current_time - last_record_time > delay_for_alert_and_record_logging):
        last_record_times[stream_url] = current_time
        detected_objects_str = "_".join(sorted(detected_objects)) if detected_objects else "no_object"
        timestamp = time.strftime("%m-%d-%y_%I-%M-%S%p")
        formatted_timestamp = time.strftime("%m-%d-%y_%I-%M-%S%p")
        
        if enable_record_logging:
            filename = os.path.join(
                detected_records_path,
                f"{timestamp}_{detected_objects_str}_detected_on_{device_title}_{device_location}.jpg"
            )
            cv2.imwrite(filename, frame)

        if enable_alert:
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
        
            # Play alert sound when an object is detected
            play_alert_sound()

def play_alert_sound():
    global ALERT_PLAYING

    # Check if sound is enabled
    if not alert_sound or ALERT_PLAYING:
        return  # Skip playing if sound is disabled or already playing

    def sound_thread():
        global ALERT_PLAYING
        ALERT_PLAYING = True

        pygame.mixer.music.load(alert_sound_path)

        # Set volume (pygame uses 0.0 to 1.0, so we normalize it)
        pygame.mixer.music.set_volume(alert_volume / 100.0)

        pygame.mixer.music.play()

        # Play for (alert_duration - fade_out_duration)
        time.sleep(max(0, alert_duration - (fade_out_duration / 1000)))  

        # Smoothly fade out the sound
        pygame.mixer.music.fadeout(fade_out_duration)  
        
        time.sleep(fade_out_duration / 1000)  # Wait for fade-out to complete
        ALERT_PLAYING = False  # Reset flag

    threading.Thread(target=sound_thread, daemon=True).start()

# SECTION: Utility Functions for Stream Handling and Optimization
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

def setup_stream_resolution(cap):
    """Initialize the capture device with optimal settings"""
    # We'll set to highest possible and handle scaling in processing
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

#SECTION: Performance Metrics Tracking and Overlay for Video Streams
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
    # frame_rate = 1 / (frame_start_time - metrics["last_frame_time"]) if metrics["last_frame_time"] else 0
    real_time_lag = time.time() - frame_start_time  
    cpu_usage = psutil.cpu_percent()  # Get current CPU usage

    metrics["last_frame_time"] = frame_start_time  

    # Update only if interval has passed
    if time.time() - metrics["last_update_time"] > update_metric_interval:
        metrics["last_update_time"] = time.time()
        metrics["displayed_fps"] = fps
        # metrics["displayed_frame_rate"] = frame_rate
        metrics["displayed_processing_time"] = processing_time
        metrics["displayed_real_time_lag"] = real_time_lag
        metrics["displayed_cpu_usage"] = cpu_usage  # Store CPU usage
        metrics["displayed_active_streams"] = active_streams  # Store active stream count

def overlay_metrics(frame, metrics, model_status_text):
    height, width, _ = frame.shape  # Get current frame dimensions
    font_scale = (height / 480) * (metric_font_size / 10)  # Scale font size dynamically
    font_thickness = max(1, int(height / 240))  # Adjust thickness based on resolution
    line_spacing = int(40 * font_scale)  # Adjust vertical spacing dynamically
    start_x = int(0.03 * width)  # Adjust left margin based on frame width
    start_y = int(0.10 * height)  # Starting position for text

    text_color = (255, 255, 255)  # White color for all text
    
    current_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time()))

    if performance_metrics_toggle:
        metrics_text = [
            f"Timestamp: {current_time}",
            model_status_text,
            f"FPS: {metrics['displayed_fps']:.2f}",
            # f"Frame Rate: {metrics['displayed_frame_rate']:.2f} FPS",
            f"Processing Time: {metrics['displayed_processing_time']:.3f}s",
            f"Streaming Delay: {metrics['displayed_real_time_lag']:.3f}s",
            f"Resolution: {stream_resolution}",
            f"CPU Usage: {metrics['displayed_cpu_usage']:.2f}%",
            f"Active Streams: {metrics['displayed_active_streams']}"
        ]
        
        # Calculate background rectangle size
        max_text_width = max([cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)[0][0] for text in metrics_text])
        bg_width = max_text_width + 20  # Add padding
        bg_height = len(metrics_text) * line_spacing + 10  # Total height
        
        # Draw background rectangle
        overlay = frame.copy()
        cv2.rectangle(overlay, (start_x - 10, start_y - 50), (start_x + bg_width, start_y + bg_height), (0, 0, 0), -1)
        alpha = 0.5
        cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)
        
        for i, text in enumerate(metrics_text):
            y_position = start_y + (i * line_spacing)
            cv2.putText(frame, text, (start_x, y_position), cv2.FONT_HERSHEY_SIMPLEX, font_scale, text_color, font_thickness)
    
    return frame

def store_video_recording_ffmpeg(frame, device_id, device_title, device_location, writer, width, height):
    """
    Stores video recording in small .ts segments and maintains an .m3u8 playlist.
    Continuously appends new segments to the playlist.
    Handles dynamic updates of title and location while keeping device_id as constant.
    """
    # Find existing folder by device_id (first part of folder name)
    existing_folder = None
    for folder in os.listdir(playback_path):
        if folder.startswith(f"{device_id}_"):
            existing_folder = folder
            break
    
    if existing_folder:
        folder_name = existing_folder
        # Update metadata if title or location changed
        metadata_path = os.path.join(playback_path, folder_name, "metadata.json")
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            if metadata.get('device_title') != device_title or metadata.get('device_location') != device_location:
                # Update metadata
                metadata['device_title'] = device_title
                metadata['device_location'] = device_location
                with open(metadata_path, 'w') as f:
                    json.dump(metadata, f)
                
                # Rename folder if title or location changed
                sanitized_title = "".join(c for c in device_title if c.isalnum() or c in (' ', '_')).rstrip()
                sanitized_location = "".join(c for c in device_location if c.isalnum() or c in (' ', '_')).rstrip()
                new_folder_name = f"{device_id}_{sanitized_title}_{sanitized_location}"
                
                if new_folder_name != folder_name:
                    old_path = os.path.join(playback_path, folder_name)
                    new_path = os.path.join(playback_path, new_folder_name)
                    os.rename(old_path, new_path)
                    folder_name = new_folder_name
        except Exception as e:
            print(f"Error updating metadata for {device_id}: {e}")
    else:
        # Create new folder if doesn't exist
        sanitized_title = "".join(c for c in device_title if c.isalnum() or c in (' ', '_')).rstrip()
        sanitized_location = "".join(c for c in device_location if c.isalnum() or c in (' ', '_')).rstrip()
        folder_name = f"{device_id}_{sanitized_title}_{sanitized_location}"
        os.makedirs(os.path.join(playback_path, folder_name), exist_ok=True)
        
        # Save initial metadata
        metadata_path = os.path.join(playback_path, folder_name, "metadata.json")
        with open(metadata_path, 'w') as f:
            json.dump({
                'device_id': device_id,
                'device_title': device_title,
                'device_location': device_location
            }, f)

    device_folder_path = os.path.join(playback_path, folder_name)
    segment_filename = os.path.join(device_folder_path, f"{device_id}_%03d.ts")
    playlist_filename = os.path.join(device_folder_path, f"{device_id}.m3u8")

    # Rest of the FFmpeg writer initialization remains the same...
    if writer is None:
        ffmpeg_cmd = [
            ffmpeg_path,
            "-y",
            "-f", "rawvideo",
            "-pix_fmt", "bgr24",
            "-s", f"{width}x{height}",
            "-r", "30",
            "-i", "-",
            "-c:v", "libx264",
            "-preset", "medium",
            "-g", "60",
            "-f", "hls",
            "-hls_time", "5",
            "-hls_flags", "append_list",
            "-hls_segment_filename", segment_filename,
            "-hls_list_size", "0",
            playlist_filename
        ]
        writer = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    try:
        writer.stdin.write(frame.tobytes())
    except Exception as e:
        print(f"Error writing frame to FFmpeg for {device_id}: {e}")
        writer.stdin.close()
        writer.wait()
        writer = None
    
    return writer

@app.route('/playback/<folder_name>/<path:filename>')
def playback_segment(folder_name, filename):
    """Serve HLS video segments with proper caching headers."""
    device_folder_path = os.path.join(playback_path, folder_name)
    response = send_from_directory(device_folder_path, filename)
    if filename.endswith('.ts'):
        response.headers['Cache-Control'] = 'public, max-age=60'
    return response

@app.route('/list_videos')
def list_videos():
    """Returns a list of available video streams with metadata."""
    videos = []
    for folder_name in os.listdir(playback_path):
        folder_path = os.path.join(playback_path, folder_name)
        if os.path.isdir(folder_path):
            m3u8_path = os.path.join(folder_path, f"{folder_name.split('_')[0]}.m3u8")
            metadata_path = os.path.join(folder_path, "metadata.json")
            
            if os.path.exists(m3u8_path):
                video_info = {
                    'folder_name': folder_name,
                    'device_id': folder_name.split('_')[0],
                    'url': f'/playback/{folder_name}/{folder_name.split("_")[0]}.m3u8',
                    'last_modified': os.path.getmtime(m3u8_path)
                }
                
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r') as f:
                        try:
                            metadata = json.load(f)
                            video_info.update({
                                'title': metadata.get('device_title', ''),
                                'location': metadata.get('device_location', '')
                            })
                        except json.JSONDecodeError:
                            pass
                
                videos.append(video_info)
    return json.dumps(videos)

@app.route('/sse')
def sse():
    """Improved SSE endpoint with version tracking."""
    def generate_sse():
        last_version = 0
        while True:
            current_videos = []
            version = 0
            for folder_name in os.listdir(playback_path):
                folder_path = os.path.join(playback_path, folder_name)
                if os.path.isdir(folder_path):
                    m3u8_path = os.path.join(folder_path, f"{folder_name.split('_')[0]}.m3u8")
                    if os.path.exists(m3u8_path):
                        current_videos.append(folder_name)
                        version += int(os.path.getmtime(m3u8_path))
            
            if version != last_version:
                last_version = version
                yield f"data: {json.dumps({'version': version, 'devices': current_videos})}\n\n"
            time.sleep(2)

    return Response(generate_sse(), mimetype='text/event-stream')

# SECTION: Main Streaming Function
def generate_frames(stream_url, device_title, device_location, device_id):
    global stream_resolution, active_streams  

    active_streams_dict[device_id] = True  
    cap = initialize_stream(get_fresh_stream(stream_url), device_title)
    if cap is None:
        return
    
    setup_stream_resolution(cap)
    metrics = initialize_metrics()
    frame_count = 0
    active_streams += 1  

    writer = None  # Initially, no writer (FFmpeg)
    recording_start = time.time()
    
    try:
        while active_streams_dict.get(device_id, False):  
            frame_start_time = time.time()  

            success, frame = cap.read()
            if not success:
                cap.release()
                cap = initialize_stream(get_fresh_stream(stream_url), device_title)
                if cap is None:
                    print("Failed to reconnect. Stopping stream.")
                    break  
                setup_stream_resolution(cap)
                continue  

            frame_count += 1
            if stream_frame_skip > 0 and frame_count % stream_frame_skip != 0:
                continue  

            # Apply pixelation effect based on stream_resolution
            if stream_resolution in resolutions:
                # Step 1: Downscale to target resolution
                width, height = resolutions[stream_resolution]
                small_frame = cv2.resize(frame, (width, height), 
                                        interpolation=cv2.INTER_NEAREST)
                
                # Step 2: Upscale back to output resolution
                frame = cv2.resize(small_frame, output_resolution, 
                                  interpolation=cv2.INTER_NEAREST)
            else:
                # Default to output resolution if invalid setting
                frame = cv2.resize(frame, output_resolution)

            # Now only one model is used for all streams
            frame, processing_time, model_status_text = process_frame(frame, stream_url, device_title, device_location, device_id)
            update_metrics(metrics, frame_start_time, processing_time, active_streams)
            frame = overlay_metrics(frame, metrics, model_status_text)
            encoded_frame = encode_frame(frame)

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + encoded_frame + b'\r\n')

            enforce_frame_rate(frame_start_time)

            if playback_recording:
                try:
                    writer = store_video_recording_ffmpeg(frame, device_id, device_title, device_location, writer, 
                                                        output_resolution[0], output_resolution[1])
                except Exception as e:
                    print(f"Error storing video recording for {device_id}: {e}")

    finally:
        active_streams -= 1  
        cap.release()
        cv2.destroyAllWindows()
        active_streams_dict.pop(device_id, None)

        if writer:
            writer.stdin.close()
            writer.wait()
            writer = None

# Flask Route for Video Streaming with Device Metadata
@app.route('/stream')
def stream():
    stream_url = request.args.get('stream_url')
    device_title = request.args.get('device_title', 'Unknown')
    device_location = request.args.get('device_location', 'Unknown')
    device_id = request.args.get('device_id', 'Unknown')  # Get the device ID from the request

    if not stream_url:
        return send_file("img/no-feed-img.png", mimetype='image/png')

    if "youtube.com" in stream_url or "youtu.be" in stream_url:
        stream_url = get_youtube_stream_url(stream_url)
        if not stream_url:
            return send_file("img/no-feed-img.png", mimetype='image/png')

    if not (stream_url.startswith("rtsp://") or stream_url.startswith("http://") or stream_url.startswith("https://")):
        return send_file("img/no-feed-img.png", mimetype='image/png')

    return Response(generate_frames(stream_url, device_title, device_location, device_id), mimetype='multipart/x-mixed-replace; boundary=frame')

# SECTION: Flask Routes for Serving HTML and Static Files
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

# SECTION: Database Connection Management
def get_db(): # Database helper function
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(error):
    if 'db' in g:
        g.db.close()

# SECTION: User Registration and Login API
class User(UserMixin):
    def __init__(self, id, username, password, email, role):
        self.id = id
        self.username = username
        self.password = password
        self.email = email
        self.role = role

@login_manager.user_loader
def load_user(user_id):
    db = get_db()
    user = db.execute("SELECT * FROM user WHERE id = ?", (user_id,)).fetchone()
    if user:
        return User(user['id'], user['username'], user['password'], user['email'], user['role'])
    return None

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'viewer') #admin, manager, viewer

    if not username or not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400

    hashed_password = generate_password_hash(password)
    db = get_db()
    try:
        db.execute("INSERT INTO user (username, password, email, role) VALUES (?, ?, ?, ?)",
                   (username, hashed_password, email, role))
        db.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username or email already exists'}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    db = get_db()
    user = db.execute("SELECT * FROM user WHERE email = ?", (email,)).fetchone()

    if user and check_password_hash(user['password'], password):
        user_obj = User(user['id'], user['username'], user['password'], user['email'], user['role'])
        login_user(user_obj)
        return jsonify({'message': 'Login successful', 'user': user_obj.username, 'role': user_obj.role}), 200
    
    return jsonify({'error': 'Invalid email or password'}), 401

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/profile', methods=['GET'])
@login_required
def profile():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'role': current_user.role
    }), 200

@app.route('/auth/check', methods=['GET'])
def auth_check():
    if current_user.is_authenticated:
        return jsonify({'logged_in': True, 'username': current_user.username, 'role': current_user.role}), 200
    return jsonify({'logged_in': False}), 401

# SECTION: User and user Settings
@app.route('/auth/user', methods=['GET'])
@login_required
def get_authenticated_user():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'role': current_user.role
    }), 200

@app.route('/auth/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')

    if not old_password or not new_password or not confirm_password:
        return jsonify({'error': 'All fields are required'}), 400
    
    if not check_password_hash(current_user.password, old_password):
        return jsonify({'error': 'Current password is incorrect'}), 400

    if new_password != confirm_password:
        return jsonify({'error': 'New passwords do not match'}), 400
    
    hashed_new_password = generate_password_hash(new_password)
    db = get_db()
    db.execute("UPDATE user SET password = ? WHERE id = ?", (hashed_new_password, current_user.id))
    db.commit()
    
    return jsonify({'message': 'Password updated successfully'}), 200

# SECTION: Streaming and Managing Alerts API
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

# alert notification
@app.route('/get_alerts', methods=['GET'])
def get_alerts():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM alert WHERE resolved IN (0, 1) ORDER BY detected_at DESC")
    alerts = cursor.fetchall()
    return jsonify([dict(alert) for alert in alerts])

@app.route('/clear_alerts', methods=['POST'])
def clear_alerts():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE alert SET resolved = 1 WHERE resolved = 0")
    db.commit()
    return jsonify({"success": True})

# Section: analytics incidents
@app.route("/api/incidents", methods=["GET"])
def get_incidents():
    db = get_db()
    query = "SELECT detected_at, event_type, camera_title, location FROM alert ORDER BY detected_at DESC"
    incidents = db.execute(query).fetchall()
    
    results = [
        {"detected_at": row["detected_at"], "event_type": row["event_type"], "camera_title": row["camera_title"], "location": row["location"]}
        for row in incidents
    ]
    return jsonify(results)

@app.route('/send_pushover_notification', methods=['POST'])
def send_pushover_notification():
    if not enable_mobile_alert:  # Check if mobile alert is enabled
        return jsonify({"success": False, "message": "Mobile alerts disabled"}), 403
    
    data = request.json
    message = data.get("message", "New alert received")

    conn = http.client.HTTPSConnection("api.pushover.net")
    conn.request("POST", "/1/messages.json",
      urllib.parse.urlencode({
        "token": APP_TOKEN,
        "user": USER_KEY,
        "message": message,
      }), 
      { "Content-type": "application/x-www-form-urlencoded" })

    response = conn.getresponse()
    response_data = response.read().decode()
    return jsonify({"status": response.status, "response": response_data})

# Camera Device Management API
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

# SECTION: Recorded Files Management API
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

# Dynamic Alert Sound Path Updater
def update_alert_sound_path():
    global alert_sound_path
    alert_sound_path = f"sound-effect/{alert_sound_name}.mp3"
    # print(f"Alert sound path updated to: {alert_sound_path}")

# SECTION: Dynamic System Settings Updater with Model Reloading
@app.route('/update_settings', methods=['POST'])
def update_settings():
    global detection_mode, performance_metrics_toggle, update_metric_interval, metric_font_size, playback_recording
    global stream_resolution, stream_frame_skip, max_frame_rate, model_version
    global show_bounding_box, show_confidence_value, confidence_level
    global enable_alert, enable_mobile_alert, enable_record_logging, delay_for_alert_and_record_logging, models
    global alert_sound, alert_duration, alert_volume, alert_sound_name

    data = request.get_json()
    model_updated = False  # Flag to track if model needs reloading

    for key, value in data.items():
        if key in setting_vars:
            globals()[setting_vars[key]] = value
            if key == "model_version":
                model_updated = True
            if key == "alert_sound_name":  # Update sound path if sound name changes
                update_alert_sound_path()

    ### print_updated_settings()  # Call the function to print updated settings

    if model_updated:
        try:
            MODEL_PATHS = [f"model/{model_version}.pt"]
            models = [YOLO(path).to('cuda') for path in MODEL_PATHS]  # Reload model
            for model in models:
                model.fuse()  # Disable fusion to avoid attribute error
            # print(f"Model {model_version} loaded successfully!")
        except Exception as e:
            print(f"Error loading model {model_version}: {e}")

    return jsonify(data)

# System Settings Overview with Tabulated Display
def print_updated_settings():
    settings = [
        ("Detection Mode", detection_mode, 
         "Performance Metrics", performance_metrics_toggle, 
         "Metric Update Interval", update_metric_interval,
         "Playback Recording Mode", playback_recording),
        
        ("Metric Font Size", metric_font_size, 
         "Stream Resolution", stream_resolution, 
         "Stream Frame Skip", stream_frame_skip),
        
        ("Max Frame Rate", max_frame_rate, 
         "Model Version", model_version, 
         "Show Bounding Box", show_bounding_box),
        
        ("Show Confidence Value", show_confidence_value, 
         "Confidence Level", confidence_level),
        
        ("Enable Alert", enable_alert, 
         "Enable Mobile Alert", enable_mobile_alert, 
         "Enable Record Logging", enable_record_logging, 
         "Delay for Logging", delay_for_alert_and_record_logging),
        
        ("Alert Sound", alert_sound, 
         "Alert Duration", alert_duration, 
         "Alert Volume", alert_volume, 
         "Alert Sound Name", alert_sound_name)
    ]
    print("Updated Settings:\n")
    print(tabulate(settings, headers=["Setting", "Value", "Setting", "Value", "Setting", "Value"], tablefmt="grid"))

# Main entry point for the application execution
if __name__ == "__main__":
    # Start the Flask server in a separate thread to keep the main thread available for other tasks.
    flask_thread = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=FLASK_PORT, threaded=True, use_reloader=False))
    flask_thread.daemon = True  # Mark the thread as a daemon, so it will exit when the main program ends.
    flask_thread.start()  # Start the Flask server in the background.

    # Allow some time for the Flask server to initialize before proceeding.
    time.sleep(0)   
    
    # Open the default home page in the user's web browser automatically.
    webbrowser.open_new_tab(f"http://127.0.0.1:{FLASK_PORT}/html/home.html")
    
    # Start monitoring file changes in the main thread to enable automatic updates or reloads.
    start_file_watcher()