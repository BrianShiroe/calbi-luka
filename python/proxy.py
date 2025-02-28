from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import cv2
import torch
from ultralytics import YOLO

# Load YOLO model
model_path = "model/yolo11n.pt"
model = YOLO(model_path)

# Toggle for enabling/disabling model inference
global model_toggle
model_toggle = True

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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

        # run model in cctv
        if model_toggle:
            results = model(frame)
            for result in results:
                frame = result.plot()  # Draw detections on the frame

        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()

@app.route('/stream')
def stream():
    """ Endpoint to stream video from RTSP, HTTP, or HTTPS sources. """
    stream_url = request.args.get('stream_url')
    if not stream_url:
        return "Stream URL is missing", 400

    if not (stream_url.startswith("rtsp://") or stream_url.startswith("http://") or stream_url.startswith("https://")):
        return "Invalid stream URL. Must start with rtsp://, http://, or https://", 400

    return Response(generate_frames(stream_url), mimetype='multipart/x-mixed-replace; boundary=frame')

# model on/off toggle
@app.route('/toggle_model', methods=['POST'])
def toggle_model():
    """ Toggle model inference on or off. """
    global model_toggle
    data = request.get_json()
    if 'enabled' in data:
        model_toggle = data['enabled']
    return jsonify({"model_toggle": model_toggle})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
