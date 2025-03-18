CREATE TABLE alert_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL,
    camera_title TEXT,
    event_type TEXT,
    alert_level TEXT,
    location TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved INTEGER CHECK(resolved IN (0, 1)) DEFAULT 0,
    FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE
);

INSERT INTO alert_new (id, camera_id, camera_title, event_type, alert_level, location, detected_at, resolved)
SELECT id, camera_id, camera_title, event_type, alert_level, location, detected_at, COALESCE(resolved, 0)
FROM alert;

DROP TABLE alert;

ALTER TABLE alert_new RENAME TO alert;

