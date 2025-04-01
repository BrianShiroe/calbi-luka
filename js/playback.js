document.addEventListener('DOMContentLoaded', function() {
    const videoContainer = document.querySelector('.video-container');
    const eventSource = new EventSource('/sse');
    
    // Track currently displayed videos to avoid duplicates
    const activeVideos = new Set();
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateVideoList(data.devices);
    };
    
    function updateVideoList(devices) {
        // Remove videos that are no longer available
        Array.from(videoContainer.children).forEach(child => {
            const deviceId = child.id.replace('container-', '');
            if (!devices.includes(deviceId)) {
                child.remove();
                activeVideos.delete(deviceId);
            }
        });
        
        // Add new videos
        devices.forEach(deviceId => {
            if (!activeVideos.has(deviceId)) {
                activeVideos.add(deviceId);
                createVideoPlayer(deviceId);
            }
        });
    }
    
    function createVideoPlayer(deviceId) {
        // Create video element
        const videoElement = document.createElement("video");
        videoElement.id = `video-${deviceId}`;
        videoElement.style.width = "55vh";
        videoElement.style.height = "30vh";
        videoElement.style.borderRadius = "8px";
        videoElement.style.backgroundColor = "#000";
        videoElement.controls = true; // Enable default controls
        videoElement.playsInline = true;
        videoElement.preload = "none"; // Prevents autoplay and loading until manually played
        
        // Set up HLS playback
        if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            videoElement.src = `/playback/${deviceId}/${deviceId}.m3u8`;
        } else if (Hls.isSupported()) {
            // hls.js for other browsers
            const hls = new Hls();
            hls.loadSource(`/playback/${deviceId}/${deviceId}.m3u8`);
            hls.attachMedia(videoElement);
        } else {
            console.error('HLS not supported in this browser');
            return;
        }
        
        // Create container div for the video and its title
        const container = document.createElement("div");
        container.id = `container-${deviceId}`;
        container.style.margin = "10px";
        container.style.display = "inline-block";
        
        // Add device ID as title
        const title = document.createElement("p");
        title.textContent = deviceId;
        title.style.margin = "5px 0";
        title.style.textAlign = "center";
        title.style.color = "#5a5a5a";
        
        // Assemble the elements
        container.appendChild(title);
        container.appendChild(videoElement);
        videoContainer.appendChild(container);
    }
});
