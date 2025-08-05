# LUKA - Accident and Disaster Detection Web-based System

## Authors
- **Brian O. Haw**
- **Maria Zorene J. Ramos**
- **Mark Angelo P. Santonil**

## 📌 Description
**LUKA** is a Flask-based intelligent accident and disaster detection system leveraging **YOLO (You Only Look Once), OpenCV, CCTV, and IoT-based cameras** to provide real-time monitoring and automated alerting. Designed as a **final thesis project**, LUKA aims to enhance public safety by rapidly identifying incidents and notifying relevant authorities or personnel.

This system is built to detect road collisions, fires, floods, and other emergencies using **deep learning-powered video analysis**. The goal is to **minimize response times** and **improve situational awareness** by integrating smart detection capabilities into existing surveillance infrastructures.

## 📊 Sample Feeds and Demonstration Data

<ins>This system includes sample video feeds and data within the repository for demonstration purposes and to support report generation.</ins>

## ‼️Important Note: Mobile Notifications

⚠️ **Currently, mobile alert notifications can only be received on our internal development devices.**

If you would like proof that the mobile alert functionality is working correctly, please email us at ***mazorenej@gmail.com***. We are actively exploring and working on implementing broader mobile notification capabilities.

We apologize for any inconvenience this current limitation may cause.

## 🛠️ Setup and Installation
Follow these steps to set up **LUKA** on your system.

💡 Installation scripts for both Linux and Windows are available for easier setup. Visit:
https://github.com/LCbalsa/calbi-luka/tree/main/installscripts

```sh
# 1 Clone the Repository
git clone https://github.com/LCbalsa/calbi-luka.git

# 2 Navigate to the Project Directory
cd <env_path>

# 3 Verify Anaconda Installation
# Ensure Anaconda is installed before proceeding
conda --version || echo "❌ Anaconda not found! Please install Anaconda from https://www.anaconda.com/"

# 4 Check Existing Conda Environments
conda info --envs

# 5 Create a New Conda Environment for LUKA
conda create --name luka_env python=3.11.11 -y

# 6 Activate the Conda Environment
conda activate luka_env

# 5 Install Required Dependencies
pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu118

# 7 Verify Installation
python -m flask --version || echo "❌ Flask is not installed correctly!"
python -c "import torch; print('✔️ PyTorch Installed:', torch.__version__)" || echo "❌ PyTorch installation failed!"

# 8 Start the Web Application
python app.py

# ✅ Setup Complete! Wait for luka to open automatically on web or access LUKA on http://127.0.0.1:5500/
   ```

## 🚀 Quick Start (For Existing Installations)
If you have already set up **LUKA**, follow these steps to launch the application quickly:

```sh
# 1 Navigate to the Project Directory
cd <env_path>

# 2 Activate the Conda Environment
conda activate luka_env

# 3 Start the Web Application
python app.py

# ✅ LUKA is now running! Access it at http://127.0.0.1:5500/
```

## 🚀 Features
- **Real-Time YOLO-Based Detection** – Detects accidents and disasters using YOLOv11 and OpenCV.
- **Automated Alerts & Logging** – Incident reports stored in an SQLite database for later review.
- **Configurable Sensitivity** – Adjustable confidence thresholds and detection parameters.
- **Multi-Camera Stream Handling** – Supports multiple **RTSP, CCTV, and YouTube streams**.
- **Performance Monitoring** – Tracks **FPS, CPU usage, processing delay, and memory usage**.
- **Web-Based Dashboard** – A Flask-powered UI for monitoring live streams and detected incidents.
- **Dynamic Stream Control** – Adjust various stream settings to optimize performance.
- **Recording & Playback** – Provides recording of live streams. allowing playback of captured videos for further review.
- **IoT Camera Integration with Sensors** – Supports smart IoT cameras equipped with **temperature, humidity, rainfall and seimic sensors**.

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

## 🤝 Acknowledgments
We extend our gratitude to our mentors, professors, and peers who supported the development of LUKA. Special thanks to open-source contributors who made this project possible.

<!-- ## 📚 Documentation
For detailed documentation, installation instructions, and usage guidelines, please refer to the [LUKA Documentation](https://docs.google.com/document/d/1Xb9r_EgJ_dx0_urg7DnGRpxzY0-B9rsqIcPNPT30Lus/edit?usp=sharing). -->

## 🎥 Detection Demo
<p align="center">
   <img src="gif/1-collision-demo.gif" width="49%"/>
   <img src="gif/2-flood-demo.gif" width="49%"/><br><br>
   <img src="gif/3-fire-demo.gif" width="49%"/>
   <img src="gif/4-flood-demo.gif" width="49%"/><br><br>
  <img src="gif/7-house-fire-demo.gif" width="100%"/><br><br>
  <img src="gif/8-house-fire-demo.gif" width="100%"/>
</p>
