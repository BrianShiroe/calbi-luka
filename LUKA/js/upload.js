// Function to handle video upload
function uploadVideo() {
    const fileInput = document.getElementById('video-file');
    const videoFile = fileInput.files[0];

    if (videoFile) {
        const videoURL = URL.createObjectURL(videoFile);

        // Create a new list item with the video element
        const listItem = document.createElement('li');
        const videoElement = document.createElement('video');
        videoElement.src = videoURL;
        videoElement.controls = true;
        listItem.appendChild(videoElement);

        // Append the new video item to the uploaded videos list
        document.getElementById('videos-list').appendChild(listItem);

        // Clear the input after upload
        fileInput.value = '';
    } 
    
    else {
        alert("Please select a video file to upload.");
    }
}