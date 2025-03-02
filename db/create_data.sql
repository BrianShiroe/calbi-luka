CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK(role IN ('admin', 'user', 'viewer')) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE access_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    detection_mode INTEGER NULL CHECK(detection_mode IN (0, 1)),
    show_bounding_box INTEGER NULL CHECK(show_bounding_box IN (0, 1)),
    detection_confidence FLOAT NULL,
    frame_rate INTEGER NULL,
    target_objects TEXT CHECK(target_objects IN ('car_accident', 'fire_accident', 
    'flood_accident', 'landslide_accident', 'earthquake_accident')) NULL
);

CREATE TABLE camera (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NULL,
    ip_address TEXT NULL,
    location TEXT NULL,
    status TEXT CHECK(status IN ('active', 'inactive', 'maintenance')) NULL,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recording (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    file_path TEXT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER NULL,
    FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE
);

CREATE TABLE report (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    description TEXT NULL,
    report_level TEXT CHECK(report_level IN ('low', 'medium', 'high')) NULL,
    FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE
);

CREATE TABLE alert (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    event_type TEXT CHECK(event_type IN ('car_accident', 'fire_accident', 'flood_accident', 'landslide_accident', 'earthquake_accident')) NULL,
    alert_level TEXT CHECK(alert_level IN ('low', 'medium', 'high')) NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved INTEGER DEFAULT 0 CHECK(resolved IN (0, 1)),
    FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE
);
