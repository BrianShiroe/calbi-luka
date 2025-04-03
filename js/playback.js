document.addEventListener('DOMContentLoaded', function() {
    const videoContainer = document.querySelector('.video-container');
    const eventSource = new EventSource('/sse');
    
    // Track currently displayed videos by device_id to avoid duplicates
    const activeVideos = new Map();
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        fetch('/list_videos')
            .then(response => response.json())
            .then(videos => updateVideoList(videos))
            .catch(error => console.error('Error fetching video list:', error));
    };
    
    function updateVideoList(videos) {
        // First pass: update existing videos and remove deleted ones
        activeVideos.forEach((videoInfo, deviceId) => {
            const currentVideo = videos.find(v => v.device_id === deviceId);
            if (!currentVideo) {
                // Video was removed
                const container = document.getElementById(`container-${videoInfo.folder_name}`);
                if (container) container.remove();
                activeVideos.delete(deviceId);
            } else if (currentVideo.folder_name !== videoInfo.folder_name || 
                      currentVideo.title !== videoInfo.title || 
                      currentVideo.location !== videoInfo.location) {
                // Video metadata changed - update UI
                updateVideoPlayer(currentVideo);
                activeVideos.set(deviceId, currentVideo);
            }
        });
        
        // Second pass: add new videos
        videos.forEach(video => {
            if (!activeVideos.has(video.device_id)) {
                activeVideos.set(video.device_id, video);
                createVideoPlayer(video);
            }
        });
    }
    
    function updateVideoPlayer(videoInfo) {
        const container = document.getElementById(`container-${videoInfo.folder_name}`);
        if (!container) return;
        
        // Update title and location
        const titleElement = container.querySelector('h3');
        const locationElement = container.querySelector('p');
        
        if (titleElement) titleElement.textContent = videoInfo.title || videoInfo.device_id;
        if (locationElement) locationElement.textContent = videoInfo.location || "Location not specified";
        
        // Update container ID if folder name changed
        if (container.id !== `container-${videoInfo.folder_name}`) {
            container.id = `container-${videoInfo.folder_name}`;
        }
    }
    
    function createVideoPlayer(videoInfo) {
        // Create video element
        const videoElement = document.createElement("video");
        videoElement.id = `video-${videoInfo.device_id}`;
        videoElement.style.width = "55vh";
        videoElement.style.height = "30vh";
        videoElement.style.borderRadius = "8px";
        videoElement.style.backgroundColor = "#000";
        videoElement.controls = true;
        videoElement.playsInline = true;
        videoElement.preload = "none";
        
        // Set up HLS playback
        if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = videoInfo.url;
        } else if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(videoInfo.url);
            hls.attachMedia(videoElement);
        } else {
            console.error('HLS not supported in this browser');
            return;
        }
        
        // Create container div for the video and its info
        const container = document.createElement("div");
        container.id = `container-${videoInfo.folder_name}`;
        container.style.margin = "10px";
        container.style.display = "inline-block";
        container.style.verticalAlign = "top";
        
        // Add device info as title
        const title = document.createElement("h3");
        title.textContent = videoInfo.title || videoInfo.device_id;
        title.style.margin = "5px 0";
        title.style.textAlign = "center";
        title.style.color = "#333";
        
        // Add location info
        const location = document.createElement("p");
        location.textContent = videoInfo.location || "Location not specified";
        location.style.margin = "5px 0";
        location.style.textAlign = "center";
        location.style.color = "#5a5a5a";
        location.style.fontSize = "0.9em";
        
        // Assemble the elements
        container.appendChild(title);
        container.appendChild(location);
        container.appendChild(videoElement);
        videoContainer.appendChild(container);
    }
});