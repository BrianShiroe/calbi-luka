import sqlite3
from random import randint, choice
from datetime import datetime, timedelta

# Connect to SQLite database
conn = sqlite3.connect('db/luka.sqlite')
cursor = conn.cursor()

def insert_random_alerts(total_rows):
    """
    Insert a total of `total_rows` random alerts on random dates between Jan 1 and Mar 27, 2025.
    """
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 3, 27)
    date_range = (end_date - start_date).days
    
    for _ in range(total_rows):
        # Generate a random date within the range
        random_days = randint(0, date_range)
        random_date = start_date + timedelta(days=random_days)
        
        # Generate a random time on that date
        random_datetime = datetime(
            random_date.year,
            random_date.month,
            random_date.day,
            randint(0, 23),
            randint(0, 59),
            randint(0, 59)
        )
        formatted_date = random_datetime.strftime('%m-%d-%y_%I.%M.%S%p')
        
        # Generate other random data
        camera_id = randint(1, 10)
        camera_title = 'CAM' + str(randint(1, 5))
        event_type = choice(['fire', 'smoke', 'flood', 'landslide'])
        alert_level = choice(['low', 'medium', 'high'])
        location = choice(['north', 'south', 'east', 'west'])
        resolved = randint(0, 1)
        
        # Insert data into alert table
        cursor.execute("""
            INSERT INTO alert (camera_id, camera_title, event_type, alert_level, location, detected_at, resolved)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (camera_id, camera_title, event_type, alert_level, location, formatted_date, resolved))
    
# Insert 2000 random alerts
insert_random_alerts(2000)

conn.commit()
conn.close()

print("Inserted 2000 random alerts between January 1 and March 27, 2025.")
