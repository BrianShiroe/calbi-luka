document.addEventListener("DOMContentLoaded", async function () {
    try {
        let response = await fetch("/api/concatenated_videos");
        let devices = await response.json();

        let container = document.querySelector(".video-container");
        container.innerHTML = ""; // Clear existing videos

        devices.forEach(device => {
            let videoCard = document.createElement("div");
            videoCard.classList.add("video-card");
            
            // Add device title
            let deviceTitle = document.createElement("h3");
            deviceTitle.textContent = `Device: ${device.device_id}`;
            videoCard.appendChild(deviceTitle);

            let videoElement = document.createElement("video");
            videoElement.style.width = "55vh";
            videoElement.style.height = "30vh";
            videoElement.style.borderRadius = "8px";
            videoElement.controls = true;

            let source = document.createElement("source");
            source.src = device.video_url;
            source.type = "video/mp4";

            videoElement.appendChild(source);
            videoCard.appendChild(videoElement);
            container.appendChild(videoCard);
        });

        // Stop all videos and processing when the user leaves the page
        window.addEventListener("beforeunload", function() {
            let videos = document.querySelectorAll("video");
            videos.forEach(video => {
                video.pause();   // Pause the video
                video.src = "";  // Remove the video source to stop fetching
                video.load();    // Reset the video and stop processing
            });
        });

    } catch (error) {
        console.error("Error loading videos:", error);
    }
});
