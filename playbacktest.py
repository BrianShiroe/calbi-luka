import cv2
import os

def playback_videos(video_folder_path):
    # Get list of video files in the folder, sorted by filename
    video_files = sorted([f for f in os.listdir(video_folder_path) if f.endswith('.mp4')])
    
    if not video_files:
        print("No video files found in", video_folder_path)
        return
    
    for video_file in video_files:
        video_path = os.path.join(video_folder_path, video_file)
        print(f"Playing: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"Failed to open {video_path}")
            continue
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            cv2.imshow('Playback', frame)
            
            # Press 'q' to exit playback
            if cv2.waitKey(25) & 0xFF == ord('q'):
                cap.release()
                cv2.destroyAllWindows()
                return
        
        cap.release()
    
    cv2.destroyAllWindows()

# Example usage
playback_videos("playback/37")