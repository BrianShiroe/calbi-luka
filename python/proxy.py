from flask import Flask, Response, request
import cv2

app = Flask(__name__)

# Dictionary to store active video capture objects
streams = {}

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

    # Validate that URL starts with supported protocols
    if not (stream_url.startswith("rtsp://") or stream_url.startswith("http://") or stream_url.startswith("https://")):
        return "Invalid stream URL. Must start with rtsp://, http://, or https://", 400

    return Response(generate_frames(stream_url), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
