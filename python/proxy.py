from flask import Flask, Response, request
import cv2
import threading
import time

app = Flask(__name__)

# Global configuration variables
FRAME_WIDTH = 640
FRAME_HEIGHT = 360
FRAME_FPS = 15
BUFFER_SIZE = 1
JPEG_QUALITY = 70

# Dictionary to store active video streams
streams = {}

class VideoStream:
    def __init__(self, stream_url):
        self.stream_url = stream_url
        self.frame = None
        self.running = True
        self.lock = threading.Lock()
        self.cap = None
        self.thread = threading.Thread(target=self.update_frames, daemon=True)
        self.thread.start()

    def open_capture(self):
        """Open stream with adjustable settings."""
        if self.cap:
            self.cap.release()
        if self.stream_url.startswith("rtsp://"):
            self.cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)  # Use FFmpeg backend for RTSP
        else:
            self.cap = cv2.VideoCapture(self.stream_url)  # Use default backend for HTTP/HTTPS
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, BUFFER_SIZE)  # Reduce buffer delay
        self.cap.set(cv2.CAP_PROP_FPS, FRAME_FPS)  # Limit FPS to reduce processing load
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)  # Set resolution
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    def update_frames(self):
        """Continuously capture frames while running."""
        self.open_capture()
        retries = 0

        while self.running:
            if self.cap is None or not self.cap.isOpened():
                if retries > 5:  # Stop if too many failures
                    break
                time.sleep(2)
                self.open_capture()
                retries += 1
                continue

            success, frame = self.cap.read()
            if success:
                retries = 0  # Reset retry counter on success
                frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))  # Adjust for speed
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                with self.lock:
                    self.frame = buffer.tobytes()
            else:
                time.sleep(0.1)  # Small delay to avoid excessive CPU usage

        if self.cap:
            self.cap.release()

    def get_frame(self):
        """Retrieve the latest frame."""
        with self.lock:
            return self.frame

    def stop(self):
        """Stop the stream."""
        self.running = False
        if self.cap:
            self.cap.release()

@app.route('/stream')
def stream():
    stream_url = request.args.get('stream_url')
    if not stream_url:
        return "Stream URL missing", 400

    if stream_url not in streams:
        streams[stream_url] = VideoStream(stream_url)

    def generate():
        while True:
            frame = streams[stream_url].get_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            else:
                time.sleep(1.0 / FRAME_FPS)  # Adjust sleep based on FPS

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stop')
def stop_stream():
    stream_url = request.args.get('stream_url')
    if stream_url in streams:
        streams[stream_url].stop()
        del streams[stream_url]
        return "Stream stopped", 200
    return "Stream not found", 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)