document.addEventListener('DOMContentLoaded', function() {
    const videoContainer = document.querySelector('.video-container');
    const eventSource = new EventSource('/sse');
    
    // Track currently displayed videos by device_id to avoid duplicates
    const activeVideos = new Map();
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        fetch('/list_videos')
            .then(response => response.json())
            .then(videos => {
                videos.sort((a, b) => b.device_id - a.device_id); // Sort by highest to lowest ID
                updateVideoList(videos);
            })
            .catch(error => console.error('Error fetching video list:', error));
    };
    
    function updateVideoList(videos) {
        // Clear container before updating
        videoContainer.innerHTML = '';
        
        // First pass: update existing videos and remove deleted ones
        activeVideos.clear();
        videos.forEach(video => {
            activeVideos.set(video.device_id, video);
            createVideoPlayer(video);
        });
    }
    
    function updateVideoPlayer(videoInfo) {
        const container = document.getElementById(`container-${videoInfo.folder_name}`);
        if (!container) return;
        
        // Update title
        const titleElement = container.querySelector('h3');
        const formattedTitle = `${videoInfo.device_id} | ${videoInfo.title || 'Unknown'} | ${videoInfo.location || 'Location not specified'}`;
        if (titleElement) titleElement.textContent = formattedTitle;
        
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
        container.style.margin = "5px";
        container.style.display = "inline-block";
        container.style.verticalAlign = "top";
        
        // Add device info as title
        const title = document.createElement("h3");
        title.textContent = `${videoInfo.device_id} | ${videoInfo.title || 'Unknown'} | ${videoInfo.location || 'Location not specified'}`;
        title.style.margin = "5px 0";
        title.style.textAlign = "center";
        title.style.color = "#333";
        
        // Assemble the elements
        container.appendChild(title);
        container.appendChild(videoElement);
        videoContainer.appendChild(container); // Append at the end (highest ID first)
    }
});
