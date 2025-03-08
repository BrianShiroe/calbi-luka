import yt_dlp
import subprocess
import sys

def get_youtube_stream_url(youtube_url):
    """Extracts the direct video stream URL from YouTube using yt-dlp."""
    ydl_opts = {
        "quiet": True,
        "format": "best",
        "noplaylist": True,
        "extract_flat": False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            return info.get("url")
    except Exception as e:
        print("Error extracting stream URL:", e)
        sys.exit(1)

def stream_to_web(youtube_url, output_url):
    """Streams the YouTube video to an RTMP/HTTP server using FFmpeg."""
    stream_url = get_youtube_stream_url(youtube_url)
    if not stream_url:
        print("Failed to extract stream URL.")
        return

    print("Streaming from:", stream_url)
    
    ffmpeg_cmd = [
        "ffmpeg",
        "-re",  # Read input at native frame rate
        "-i", stream_url,  # Input URL
        "-c:v", "libx264",  # Encode in H.264
        "-preset", "ultrafast",  # Low latency preset
        "-tune", "zerolatency",  # Optimize for low latency
        "-b:v", "2500k",  # Bitrate
        "-c:a", "aac",  # Audio codec
        "-f", "flv", output_url  # Output format and destination
    ]

    try:
        subprocess.run(ffmpeg_cmd)
    except KeyboardInterrupt:
        print("\nStreaming stopped.")
    except Exception as e:
        print("Error starting FFmpeg:", e)

if __name__ == "__main__":
    youtube_link = "https://youtu.be/BxEmGNapmr4"
    output_stream = "rtmp://your-server/live/stream"  # Replace with your RTMP URL

    stream_to_web(youtube_link, output_stream)
