from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO

# Load multiple YOLO models
models = [
    YOLO("model/yolo11n.pt"),
    # YOLO("model/car-fire-5.1.11n.pt"),
    # YOLO("model/flood-5.1.11n.pt"),
    # YOLO("model/landslide-5.1.11n.pt"),
]

# Toggle for enabling/disabling model inference
global model_toggle
model_toggle = True

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def generate_frames(stream_url):
    """ Continuously fetch frames from the video stream and return as HTTP response. """
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        return  # Suppress terminal output

    while True:
        success, frame = cap.read()
        if not success:
            break  # Suppress terminal output

        if model_toggle:
            merged_results = []
            
            for model in models:
                results = model(frame, verbose=False)  # Run inference with verbose=False
                for result in results:
                    if result.boxes:  # Check if any objects are detected
                        for box in result.boxes:
                            class_id = int(box.cls[0])  # Object class ID
                            confidence = box.conf[0].item()  # Confidence score
                            x1, y1, x2, y2 = map(int, box.xyxy[0])  # Bounding box coordinates

                            # Get class name (assuming model has class names)
                            class_name = model.names[class_id] if class_id in model.names else "Unknown"

                            print(f"Detected: {class_name} (Confidence: {confidence:.2f}) | Box: ({x1}, {y1}) -> ({x2}, {y2})")
                            merged_results.append([x1, y1, x2, y2, confidence, class_id])
                            
                            # Draw bounding box
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                            cv2.putText(frame, f"{class_name} {confidence:.2f}", (x1, y1 - 10), 
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                    
                    # Draw segmentation masks if available
                    if hasattr(result, 'masks') and result.masks:
                        masks = result.masks.xy  # Get mask coordinates
                        for mask in masks:
                            cv2.polylines(frame, [np.array(mask, np.int32)], isClosed=True, color=(0, 0, 255), thickness=2)
        
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

# Model on/off toggle
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
