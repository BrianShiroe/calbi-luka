from flask import Flask, Response, request
import cv2
import threading
import time

app = Flask(__name__)

# Dictionary to store active video streams
streams = {}

class VideoStream:
    def __init__(self, rtsp_url):
        self.rtsp_url = rtsp_url
        self.frame = None
        self.running = True
        self.lock = threading.Lock()
        self.cap = None
        self.thread = threading.Thread(target=self.update_frames, daemon=True)
        self.thread.start()

    def open_capture(self):
        """Open RTSP stream with lower latency settings."""
        if self.cap:
            self.cap.release()
        self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)  # Use FFmpeg backend
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer delay
        self.cap.set(cv2.CAP_PROP_FPS, 15)  # Limit FPS to reduce processing load
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)  # Lower resolution for stability
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)

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
                frame = cv2.resize(frame, (640, 360))  # Adjust for speed
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
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
    rtsp_url = request.args.get('rtsp_url')
    if not rtsp_url:
        return "RTSP URL missing", 400

    if rtsp_url not in streams:
        streams[rtsp_url] = VideoStream(rtsp_url)

    def generate():
        while True:
            frame = streams[rtsp_url].get_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            else:
                time.sleep(0.1)

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stop')
def stop_stream():
    rtsp_url = request.args.get('rtsp_url')
    if rtsp_url in streams:
        streams[rtsp_url].stop()
        del streams[rtsp_url]
        return "Stream stopped", 200
    return "Stream not found", 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)