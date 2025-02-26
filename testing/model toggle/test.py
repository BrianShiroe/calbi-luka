# test.py
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow frontend requests

toggle_status = False  # Default state

@app.route("/toggle", methods=["POST"])
def toggle():
    global toggle_status
    data = request.get_json()
    toggle_status = data.get("status", False)
    print(f"Toggle is {'ON' if toggle_status else 'OFF'}")  # Real-time print
    return jsonify({"status": toggle_status, "message": "Status updated"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  # Accessible on LAN
