Database
    Database Used: SQlite

    Database Name: Luka
    
    Database:
        user v
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        access_log
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE

        settings - Stores modified settings
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            detection_mode INTEGER,
            show_bounding_box INTEGER,
            performance_metrics_toggle INTEGER,
            confidence_level FLOAT,
            max_frame_rate INTEGER,
            update_metric_interval INTEGER,
            metric_font_size INTEGER,
            target_objects TEXT

        camera - stores camera details
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            ip_address TEXT,
            location TEXT,
            status TEXT,
            installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        recording - stores the manual and automated recordings of feeds
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            camera_id INTEGER NOT NULL,
            file_path TEXT,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            duration INTEGER,
            FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE

        report - stores user reports
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            camera_id INTEGER NOT NULL,
            report_level TEXT,
            description TEXT,
            FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE

        alert - stores all the system alerts based on auto detections
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            camera_id INTEGER NOT NULL,
            camera_title TEXT,
            event_type TEXT,
            alert_level TEXT,
            location TEXT,
            detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved INTEGER,
            FOREIGN KEY (camera_id) REFERENCES camera(id) ON DELETE CASCADE



