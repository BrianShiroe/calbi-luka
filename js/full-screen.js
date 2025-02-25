let isFullScreen = false;
let currentFeed = null;
let timestampElement = null;

function toggleFullScreen(feedElement) {
    if (!isFullScreen) {
        // Enter full screen mode
        if (feedElement.requestFullscreen) {
            feedElement.requestFullscreen();
        } else if (feedElement.mozRequestFullScreen) { // Firefox
            feedElement.mozRequestFullScreen();
        } else if (feedElement.webkitRequestFullscreen) { // Chrome, Safari
            feedElement.webkitRequestFullscreen();
        } else if (feedElement.msRequestFullscreen) { // IE/Edge
            feedElement.msRequestFullscreen();
        }
        
        // Show the timestamp
        timestampElement = document.createElement('div');
        timestampElement.id = 'timestamp';
        timestampElement.style.position = 'absolute';
        timestampElement.style.top = '10px';
        timestampElement.style.left = '10px';
        timestampElement.style.fontSize = '20px';
        timestampElement.style.color = 'white';
        timestampElement.style.zIndex = '1000';
        document.body.appendChild(timestampElement);

        isFullScreen = true;
    } else {
        // Exit full screen mode
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
        
        // Remove the timestamp
        if (timestampElement) {
            document.body.removeChild(timestampElement);
        }

        isFullScreen = false;
    }
}

// Function to update the timestamp
function updateTimestamp() {
    if (isFullScreen && timestampElement) {
        const currentDateTime = new Date();
        timestampElement.textContent = currentDateTime.toLocaleString(); // Format: "MM/DD/YYYY, HH:MM:SS"
    }
}

// Function to handle playback controls
function togglePlayback(feedElement) {
    if (feedElement.paused) {
        feedElement.play();
    } else {
        feedElement.pause();
    }
}

// Function to control volume
function setVolume(feedElement, volume) {
    feedElement.volume = volume;
}

// Function to handle feed click
function onFeedClick(feedElement) {
    currentFeed = feedElement;
    toggleFullScreen(feedElement);
}

// Add event listener to the grid for dynamically added video feeds
document.getElementById('grid-container').addEventListener('click', function(e) {
    const feedElement = e.target.closest('.feed');
    if (feedElement && feedElement.tagName === 'VIDEO') {
        onFeedClick(feedElement);
    }
});

// Update the timestamp every second while in full-screen mode
setInterval(updateTimestamp, 1000);
