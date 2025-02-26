from flask import Flask, Response, request
import cv2
import torch
from ultralytics import YOLO

# Load YOLO model from the specified path
model_path = "model/yolo11n.pt"
model = YOLO(model_path)

# Toggle flag for enabling/disabling YOLO model inference
model_toggle = False 

# Initialize Flask application
app = Flask(__name__)

def generate_frames(stream_url):
    """ Continuously fetch frames from the video stream and return as an HTTP response. """
    cap = cv2.VideoCapture(stream_url)  # Open video stream
    
    if not cap.isOpened():
        print(f"Failed to open stream: {stream_url}")
        return

    while True:
        success, frame = cap.read()  # Read frame from the stream
        if not success:
            print(f"Stream disconnected: {stream_url}")
            break

        # If model inference is enabled, process the frame using YOLO
        if model_toggle:
            results = model(frame)  # Perform object detection
            for result in results:
                frame = result.plot()  # Draw detections on the frame

        # Encode frame as JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        # Yield frame as multipart HTTP response
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()  # Release the video capture object

@app.route('/stream')
def stream():
    """ Endpoint to stream video from RTSP, HTTP, or HTTPS sources. """
    stream_url = request.args.get('stream_url')
    if not stream_url:
        return "Stream URL is missing", 400

    # Validate the stream URL format
    if not (stream_url.startswith("rtsp://") or stream_url.startswith("http://") or stream_url.startswith("https://")):
        return "Invalid stream URL. Must start with rtsp://, http://, or https://", 400

    # Return the generated video stream response
    return Response(generate_frames(stream_url), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/toggle_model', methods=['POST'])
def toggle_model():
    """ Toggle the YOLO model inference on or off. """
    global model_toggle
    model_toggle = not model_toggle  # Flip the state of model_toggle
    return {"model_active": model_toggle}  # Return the updated status

if __name__ == '__main__':
    # Run the Flask app on all available network interfaces, port 5000, with threading enabled
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
