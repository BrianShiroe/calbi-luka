document.addEventListener("DOMContentLoaded", async function () {
    try {
        let response = await fetch("/api/videos");
        let videoUrls = await response.json();

        let container = document.querySelector(".video-container");
        container.innerHTML = ""; // Clear existing videos

        videoUrls.forEach((url) => {
            let videoElement = document.createElement("video");
            videoElement.width = 320;
            videoElement.height = 240;
            videoElement.controls = true;

            let source = document.createElement("source");
            source.src = url;
            source.type = "video/mp4";

            videoElement.appendChild(source);
            container.appendChild(videoElement);
        });
    } catch (error) {
        console.error("Error loading videos:", error);
    }
});
