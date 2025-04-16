import requests
import random
from time import time, sleep

BASE_URL = "http://localhost:5500"

def test_sensor_endpoints():
    # Test POSTing sensor data
    sensor_data = {
        "timestamp": int(time()),
        "accel_x": random.uniform(-2.0, 2.0),
        "accel_y": random.uniform(-2.0, 2.0),
        "accel_z": random.uniform(8.0, 10.0),
        "rain_percentage": random.uniform(0, 100),
        "temperature": random.uniform(20, 35),
        "humidity": random.uniform(30, 90),
        "rainfall_mm": random.uniform(0, 50),
        "earthquake_magnitude": random.uniform(0, 5)
    }
    
    print("Posting sensor data...")
    response = requests.post(f"{BASE_URL}/sensor/data", json=sensor_data)
    print(f"Response: {response.status_code} - {response.json()}")
    
    # Test critical conditions
    print("\nTesting earthquake alert...")
    quake_data = sensor_data.copy()
    quake_data["earthquake_magnitude"] = 4.5  # Above threshold
    response = requests.post(f"{BASE_URL}/sensor/data", json=quake_data)
    print(f"Response: {response.status_code} - {response.json()}")
    
    print("\nTesting flood alert...")
    flood_data = sensor_data.copy()
    flood_data["rainfall_mm"] = 55.0  # Above threshold
    response = requests.post(f"{BASE_URL}/sensor/data", json=flood_data)
    print(f"Response: {response.status_code} - {response.json()}")
    
    # Test GET endpoints
    print("\nFetching latest data...")
    response = requests.get(f"{BASE_URL}/sensor/fetch_data")
    print(f"Response: {response.status_code}")
    print(f"Data: {response.json()[:2]}")  # Print first two records
    
    print("\nFetching statistics...")
    response = requests.get(f"{BASE_URL}/sensor/stats")
    print(f"Response: {response.status_code}")
    print(f"Stats: {response.json()}")

if __name__ == "__main__":
    test_sensor_endpoints()
