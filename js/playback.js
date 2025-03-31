document.addEventListener("DOMContentLoaded", async function () {
    try {
        let response = await fetch("/api/videos");
        let videoUrls = await response.json();

        let container = document.querySelector(".video-container");
        container.innerHTML = ""; // Clear existing videos

        videoUrls.forEach((url) => {
            let videoCard = document.createElement("div");
            videoCard.classList.add("video-card");

            let videoElement = document.createElement("video");
            videoElement.style.width = "55vh";
            videoElement.style.height = "30vh";
            videoElement.style.borderRadius = "8px";
            videoElement.controls = true;

            let source = document.createElement("source");
            source.src = url;
            source.type = "video/mp4";

            videoElement.appendChild(source);
            videoCard.appendChild(videoElement);
            container.appendChild(videoCard);
        });
    } catch (error) {
        console.error("Error loading videos:", error);
    }
});
