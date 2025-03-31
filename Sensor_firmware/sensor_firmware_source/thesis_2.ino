#include <WiFi.h>
#include <HTTPClient.h>
#include <EEPROM.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include "MPU6050.h"

#define EEPROM_SIZE 64
#define RAIN_SENSOR_PIN 34
#define LED_PIN 2
#define DATA_POINTS 10  

String ssid = "YourWiFi";
String password = "YourPassword";
String serverUrl = "http://<Flask_Server_IP>:5000/data";

MPU6050 mpu;
float accelX = 0.0, accelY = 0.0, accelZ = 0.0;
int rainPercentage = 0;

float accelDataX[DATA_POINTS];
float accelDataY[DATA_POINTS];
float accelDataZ[DATA_POINTS];
float rainData[DATA_POINTS];
int dataIndex = 0;

unsigned long lastSendTime = 0;
int userInterval = 5000;

// Function Prototypes
void readSensors();
void sendToServer();
void connectWiFi();
void delayOptimized(uint16_t ms);
float integralApproximation(float values[], int n);
float calculateMean(float values[], int n);
float calculateMedian(float values[], int n);
float calculateMode(float values[], int n);
float calculateStdDev(float values[], int n);
void getUserInterval();
void saveWiFiCredentials();
void loadWiFiCredentials();

void setup() {
    Serial.begin(115200);
    EEPROM.begin(EEPROM_SIZE);
    
    pinMode(RAIN_SENSOR_PIN, INPUT);
    pinMode(LED_PIN, OUTPUT);
    Wire.begin();
    
    loadWiFiCredentials();
    connectWiFi();
    mpu.initialize();

    getUserInterval();
}

void loop() {
    readSensors();

    if (millis() - lastSendTime > userInterval) {  
        sendToServer();
        lastSendTime = millis();
    }

    delayOptimized(1000);
}

void readSensors() {
    int16_t ax, ay, az;
    mpu.getAcceleration(&ax, &ay, &az);
    accelX = ax / 16384.0;
    accelY = ay / 16384.0;
    accelZ = az / 16384.0;

    rainPercentage = analogRead(RAIN_SENSOR_PIN) / 40;

    accelDataX[dataIndex] = accelX;
    accelDataY[dataIndex] = accelY;
    accelDataZ[dataIndex] = accelZ;
    rainData[dataIndex] = rainPercentage;
    
    dataIndex = (dataIndex + 1) % DATA_POINTS;
}

void connectWiFi() {
    Serial.print("Connecting to WiFi...");
    WiFi.begin(ssid.c_str(), password.c_str());
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts++ < 20) {
        delayOptimized(500);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nConnected!");
        digitalWrite(LED_PIN, HIGH);
    } else {
        Serial.println("\nWiFi Connection Failed.");
        digitalWrite(LED_PIN, LOW);
    }
}

void sendToServer() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi lost. Reconnecting...");
        connectWiFi();
        return;
    }

    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<512> doc;
    doc["timestamp"] = millis();
    doc["accel_x"] = accelX;
    doc["accel_y"] = accelY;
    doc["accel_z"] = accelZ;
    doc["rain_percentage"] = rainPercentage;
    doc["mean_accel_x"] = calculateMean(accelDataX, DATA_POINTS);
    doc["median_accel_x"] = calculateMedian(accelDataX, DATA_POINTS);
    doc["mode_accel_x"] = calculateMode(accelDataX, DATA_POINTS);
    doc["std_dev_accel_x"] = calculateStdDev(accelDataX, DATA_POINTS);
    doc["integral_accel_x"] = integralApproximation(accelDataX, DATA_POINTS);

    String payload;
    serializeJson(doc, payload);
    
    int httpResponseCode = http.POST(payload);
    Serial.printf("Server Response: %d\n", httpResponseCode);
    http.end();
}

void delayOptimized(uint16_t ms) {
    asm volatile (
        "1: sbiw %0,1\n"
        "brne 1b" 
        : "=w" (ms) 
        : "0" (ms)
    );
}

float integralApproximation(float values[], int n) {
    float sum = 0;
    for (int i = 0; i < n - 1; i++) {
        sum += (values[i] + values[i + 1]) / 2.0;
    }
    return sum;
}

float calculateMean(float values[], int n) {
    float sum = 0;
    for (int i = 0; i < n; i++) {
        sum += values[i];
    }
    return sum / n;
}

float calculateMedian(float values[], int n) {
    float sorted[n];
    memcpy(sorted, values, n * sizeof(float));
    for (int i = 0; i < n - 1; i++) {
        for (int j = i + 1; j < n; j++) {
            if (sorted[i] > sorted[j]) {
                float temp = sorted[i];
                sorted[i] = sorted[j];
                sorted[j] = temp;
            }
        }
    }
    return (n % 2 == 0) ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0 : sorted[n / 2];
}

float calculateMode(float values[], int n) {
    float mode = values[0];
    int maxCount = 1;
    for (int i = 0; i < n; i++) {
        int count = 1;
        for (int j = i + 1; j < n; j++) {
            if (values[i] == values[j]) {
                count++;
            }
        }
        if (count > maxCount) {
            maxCount = count;
            mode = values[i];
        }
    }
    return mode;
}

float calculateStdDev(float values[], int n) {
    float mean = calculateMean(values, n);
    float sum = 0;
    for (int i = 0; i < n; i++) {
        sum += pow(values[i] - mean, 2);
    }
    return sqrt(sum / n);
}

void getUserInterval() {
    Serial.println("Enter data send interval (ms):");
    while (Serial.available() == 0);
    userInterval = Serial.parseInt();
    Serial.printf("Set interval to: %d ms\n", userInterval);
}

void saveWiFiCredentials() {
    EEPROM.writeString(0, ssid);
    EEPROM.writeString(32, password);
    EEPROM.commit();
}

void loadWiFiCredentials() {
    ssid = EEPROM.readString(0);
    password = EEPROM.readString(32);
}
