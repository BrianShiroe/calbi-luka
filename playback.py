import os
import subprocess

# Path to the folder containing the videos
ffmpeg_path = os.path.abspath("ffmpeg/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe")
ffplay_path = os.path.abspath("ffmpeg/ffmpeg-master-latest-win64-gpl-shared/bin/ffplay.exe")
folder_path = "playback/37"

# Get all the .mp4 video files in the folder
video_files = [f for f in os.listdir(folder_path) if f.endswith(".mp4")]
video_files.sort()  # Optional: Sort to combine them in a specific order

# Create a temporary file to list the videos for concatenation
with open("file_list.txt", "w") as file_list:
    for video in video_files:
        file_list.write(f"file '{os.path.join(folder_path, video)}'\n")

# Output file
output_file = "playback/37/combined_video.mp4"

# Run FFmpeg to concatenate the videos
subprocess.run([
    ffmpeg_path, "-f", "concat", "-safe", "0", "-i", "file_list.txt", "-c", "copy", output_file
])

# Clean up the temporary file
os.remove("file_list.txt")

print(f"Videos combined successfully into {output_file}")

# Play the combined video using ffplay
subprocess.run([ffplay_path, output_file])
