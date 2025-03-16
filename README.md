# LUKA - Accident and Disaster Detection Web-based System

## Authors
- **Brian O. Haw**  
- **Maria Zorene J. Ramos**  
- **Mark Angelo P. Santonil**  

## 📌 Description
**LUKA** is a Flask-based intelligent accident and disaster detection system leveraging **YOLO (You Only Look Once), OpenCV, CCTV, and IoT-based cameras** to provide real-time monitoring and automated alerting. Designed as a **final thesis project**, LUKA aims to enhance public safety by rapidly identifying incidents and notifying relevant authorities or personnel.

This system is built to detect road collisions, fires, floods, and other emergencies using **deep learning-powered video analysis**. The goal is to **minimize response times** and **improve situational awareness** by integrating smart detection capabilities into existing surveillance infrastructures.

## 🚀 Features
- **Real-Time YOLO-Based Detection** – Detects accidents and disasters using YOLOv8 and OpenCV.
- **Automated Alerts & Logging** – Incident reports stored in an SQLite database for later review.
- **Configurable Sensitivity** – Adjustable confidence thresholds and detection parameters.
- **Multi-Camera Stream Handling** – Supports multiple **RTSP, CCTV, and YouTube streams**.
- **Performance Monitoring** – Tracks **FPS, CPU usage, processing delay, and memory usage**.
- **Web-Based Dashboard** – A Flask-powered UI for monitoring live streams and detected incidents.
- **Dynamic Stream Control** – Adjust various stream settings to optimize performance.

## 🛠️ Installation
To set up LUKA on your local machine, follow these steps:

```sh
# Clone the repository
git clone https://github.com/LCbalsa/calbi-luka.git

# Navigate to the project directory
cd luka

# Install dependencies
pip install -r requirements.txt


### Additional Setup
- Ensure **Python 3.8+** is installed.
- Configure environment variables as needed for API keys and database settings.
- Recommended to use virtual environment like anaconda for ease of use.
   ```
## 📌 Usage
1. Start the Flask server: python app.py
2. Access the web dashboard at `http://127.0.0.1:5500`.
3. Configure detection parameters and monitor live feeds.
4. Review detected incidents and alerts.

## 🤖 Model & Detection
LUKA utilizes a pre-trained **Convolutional Neural Network (CNN)** fine-tuned for accident and disaster classification. The model can identify:
- **Traffic Accidents** (e.g., car collisions)
- **Fire and Smoke Detection** (e.g., fire, smokes)
- **Flooded Areas**
- **Landslide Detection**

## 📌 Future Enhancements
- **Edge AI Deployment** – Running models directly on IoT cameras for reduced latency.
- **Cloud Integration** – Storing incident reports and video clips for further analysis.
- **Enhanced Object Detection** – Adding additional AI models for better accuracy.
- **Mobile App** – Expanding access to real-time alerts on smartphones.

## 📝 License
This project is licensed under the **MIT License**. Feel free to use and modify it for educational and research purposes.

## 🤝 Acknowledgments
We extend our gratitude to our mentors, professors, and peers who supported the development of LUKA. Special thanks to open-source contributors who made this project possible.

## 📚 Documentation
For detailed documentation, installation instructions, and usage guidelines, please refer to the [LUKA Documentation](https://docs.google.com/document/d/1Xb9r_EgJ_dx0_urg7DnGRpxzY0-B9rsqIcPNPT30Lus/edit?usp=sharing).