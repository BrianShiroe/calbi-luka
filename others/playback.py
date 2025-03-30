import os
import subprocess

# Path to the folder containing the videos
ffmpeg_path = os.path.abspath("ffmpeg/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe")
folder_path = "playback/37"

# Get a list of all .mp4 files in the folder
video_files = [f for f in os.listdir(folder_path) if f.endswith('.mp4')]

# Check if there are fewer than 3 video files
if len(video_files) < 3:
    print("Not enough video files to concatenate. At least 3 files are required.")
else:
    # Sort the video files if necessary (e.g., by name or modification date)
    video_files.sort()

    # Select the first 2 video files
    video_files = video_files[:2]

    # Create a temporary text file to hold the file paths for concatenation
    with open('file_list.txt', 'w') as f:
        for video in video_files:
            f.write(f"file '{os.path.join(folder_path, video)}'\n")

    # Use the name of the first video as part of the output file name
    output_file = os.path.join(folder_path, f"{os.path.splitext(video_files[0])[0]}_temp.mp4")

    # Run ffmpeg to concatenate the videos
    subprocess.run([ffmpeg_path, '-f', 'concat', '-safe', '0', '-i', 'file_list.txt', '-c', 'copy', output_file])

    # Delete the used video files
    for video in video_files:
        os.remove(os.path.join(folder_path, video))

    # Clean up the temporary file
    os.remove('file_list.txt')

    # Remove the '_temp' from the output file name and rename it
    final_output_file = output_file.replace('_temp', '')
    os.rename(output_file, final_output_file)

    print(f"Videos concatenated successfully into {final_output_file} and the used files have been deleted.")
