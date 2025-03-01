CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK(role IN ('admin', 'user', 'viewer')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE access_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    detection_mode INTEGER NOT NULL CHECK(detection_mode IN (0, 1)),
    show_bounding_box INTEGER NOT NULL CHECK(show_bounding_box IN (0, 1)),
    detection_confidence FLOAT NOT NULL,
    frame_rate INTEGER NOT NULL,
    target_objects TEXT CHECK(target_objects IN ('car_accident', 'fire_accident', 
    'flood_accident', 'landslide_accident', 'earthquake_accident')) NOT NULL
);

CREATE TABLE camera (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT CHECK(status IN ('active', 'inactive', 'maintenance')) NOT NULL,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recording (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER NOT NULL,
    FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE
);

CREATE TABLE report (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    report_level TEXT CHECK(report_level IN ('low', 'medium', 'high')) NOT NULL,
    FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE
);

CREATE TABLE alert (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    event_type TEXT CHECK(event_type IN ('car_accident', 'fire_accident', 'flood_accident', 'landslide_accident', 'earthquake_accident')) NOT NULL,
    alert_level TEXT CHECK(alert_level IN ('low', 'medium', 'high')) NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved INTEGER DEFAULT 0 CHECK(resolved IN (0, 1)),
    FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE
);
