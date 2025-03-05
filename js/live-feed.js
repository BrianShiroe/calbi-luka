let devices = []; // Array to store device information
let currentEditDeviceIndex = null; // Stores index of device being edited

// Initialize app on window load
window.onload = function () {
    loadDevices(); // Load saved devices from local storage
    renderDevices(); // Render devices in the UI
    showNotification(); // Show notification icon (if applicable)
};

// Load devices
function loadDevices() {
    fetch("http://localhost:5500/get_devices")
        .then(response => response.json())
        .then(data => {
            devices = data; // Store the fetched devices
            renderDevices(); // Render the devices in the UI
        })
        .catch(error => console.error("Error loading devices:", error));
}

// Open the add device popup
function openPopup() {
    document.getElementById("add-form").style.display = "flex";
}

// Close the add device popup
function closePopup() {
    document.getElementById("add-form").style.display = "none";
}

// Add a new device to the list
function addDevice() {
    const streamUrl = document.getElementById("ip_address").value.trim();
    let feedName = document.getElementById("title").value.trim();
    let location = document.getElementById("location").value.trim();

    if (streamUrl && (streamUrl.startsWith("rtsp://") || streamUrl.startsWith("http://") || streamUrl.startsWith("https://"))) {
        feedName = feedName || `CAM${devices.length + 1}`;
        location = location || "Unknown"; // Default location if empty

        fetch("http://localhost:5500/add_device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: feedName, ip_address: streamUrl, location: location })
        })
        .then(response => response.json())
        .then(data => {
            devices.push({ id: data.id, title: feedName, ip_address: streamUrl, location: location });
            document.getElementById("title").value = "";
            document.getElementById("ip_address").value = "";
            document.getElementById("location").value = "";
            closePopup();
            renderDevices();
        })
        .catch(error => console.error("Error adding device:", error));
    } else {
        alert("Please enter a valid RTSP, HTTP, or HTTPS URL.");
    }
}



// Render the devices on the UI
function renderDevices() {
    const gridContainer = document.getElementById("grid-container");
    gridContainer.innerHTML = ""; // Clear the grid before rendering

    devices.forEach((device, index) => {
        const videoFeedURL = `http://localhost:5500/stream?stream_url=${encodeURIComponent(device.ip_address)}`;
        const deviceCard = createDeviceCard(videoFeedURL, device.title, device.location, index);
        gridContainer.appendChild(deviceCard);
    });

    // Add 'Add Device' button at the end of the grid
    const addDeviceCard = document.createElement("div");
    addDeviceCard.className = "device-card add-device-card";
    addDeviceCard.innerHTML = `
        <div class="add-device-container">
            <i class="fas fa-plus add-icon" style="font-size:20px; position:relative; left:35%;"></i>
            <p style="font-size:12px; color:grey;">Add Device</p>
        </div>
    `;
    addDeviceCard.onclick = openPopup;
    gridContainer.appendChild(addDeviceCard);
}

function createDeviceCard(videoFeedURL, deviceName, deviceLocation, deviceIndex) {
    const deviceCard = document.createElement("div");
    deviceCard.className = "device-card";

    const mediaContainer = document.createElement("div");
    mediaContainer.style.position = "relative";
    mediaContainer.style.width = "100%";
    mediaContainer.style.borderRadius = "10px";
    mediaContainer.style.cursor = "pointer";

    let mediaElement;

    if (videoFeedURL.match(/\.(mp4|webm|ogg)$/i)) {
        // If it's a video file, use the <video> element
        mediaElement = document.createElement("video");
        mediaElement.src = videoFeedURL;
        mediaElement.style.width = "100%";
        mediaElement.style.borderRadius = "10px";
        mediaElement.controls = true;
    } else {
        // Fallback to image if it's not a recognized video format
        mediaElement = document.createElement("img");
        mediaElement.src = videoFeedURL;
        mediaElement.style.width = "100%";
        mediaElement.style.borderRadius = "10px";
    }

    mediaElement.onclick = function () {
        openFullscreen(videoFeedURL);
    };

    mediaContainer.appendChild(mediaElement);

    const nameElement = document.createElement("h3");
    nameElement.textContent = deviceName;

    const locationElement = document.createElement("p");
    locationElement.textContent = `Location: ${deviceLocation}`;
    locationElement.style.fontSize = "12px";
    locationElement.style.color = "grey";

    // Kebab menu for options
    const menuContainer = document.createElement("div");
    menuContainer.className = "menu-container";

    const menuIcon = document.createElement("i");
    menuIcon.className = "fas fa-ellipsis-v kebab-menu";
    menuIcon.onclick = () => toggleMenu(menuOptions);

    const menuOptions = document.createElement("div");
    menuOptions.className = "menu-options";
    menuOptions.innerHTML = `
        <p onclick="openEditNamePopup(${deviceIndex})"><span><i class="fa-solid fa-pen-to-square"></i></span> Edit</p>
        <p onclick="showDeletePopup(${deviceIndex})"><span><i class="fa-solid fa-trash"></i></span> Delete</p>
    `;

    menuContainer.appendChild(menuIcon);
    menuContainer.appendChild(menuOptions);

    deviceCard.appendChild(mediaContainer);
    deviceCard.appendChild(nameElement);
    deviceCard.appendChild(locationElement);
    deviceCard.appendChild(menuContainer);

    return deviceCard;
}

function openFullscreen(videoFeedURL) {
    const videoContainer = document.createElement("div");
    videoContainer.className = "fullscreen-video";

    let mediaElement;

    if (videoFeedURL.match(/\.(mp4|webm|ogg)$/i)) {
        mediaElement = document.createElement("video");
        mediaElement.src = videoFeedURL;
        mediaElement.style.width = "100%";
        mediaElement.style.height = "100%";
        mediaElement.controls = true;
        mediaElement.autoplay = true;
    } else {
        mediaElement = document.createElement("img");
        mediaElement.src = videoFeedURL;
        mediaElement.style.width = "100%";
        mediaElement.style.height = "100%";
        mediaElement.style.objectFit = "contain";
    }

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    Object.assign(closeButton.style, {
        position: "absolute",
        top: "10px",
        right: "10px",
        background: "black",
        color: "white",
        padding: "5px 10px",
        border: "none",
        cursor: "pointer",
    });
    closeButton.onclick = closeFullscreen;

    Object.assign(videoContainer.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        backgroundColor: "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: "1000",
    });

    videoContainer.appendChild(mediaElement);
    videoContainer.appendChild(closeButton);
    document.body.appendChild(videoContainer);
}

function closeFullscreen() {
    const videoContainer = document.querySelector(".fullscreen-video");
    if (videoContainer) {
        videoContainer.remove();
    }
}

// Toggle the visibility of the kebab menu
function toggleMenu(menu) {
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// Close menu when clicking outside
document.addEventListener("click", function (event) {
    document.querySelectorAll(".menu-options").forEach(menu => {
        if (!menu.parentElement.contains(event.target)) {
            menu.style.display = "none";
        }
    });
});

// Show confirmation popup for deleting a device
function showDeletePopup(deviceIndex) {
    const deletePopup = document.getElementById("delete-form");
    deletePopup.style.display = "flex"; // Show the delete confirmation popup

    document.getElementById("confirm-delete").onclick = () => {
        deleteDevice(deviceIndex); // Call the deleteDevice function
        deletePopup.style.display = "none"; // Hide the popup after deletion
    };

    document.getElementById("cancel-delete").onclick = () => {
        deletePopup.style.display = "none"; // Hide the popup without deleting
    };
}

// Delete a device from the list
function deleteDevice(deviceIndex) {
    const deviceId = devices[deviceIndex].id; // Get the device ID

    fetch("http://localhost:5500/delete_device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deviceId }) // Send the device ID to the backend
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            devices.splice(deviceIndex, 1); // Remove the device from the local array
            renderDevices(); // Refresh the UI
        } else {
            console.error("Failed to delete device:", data.error);
        }
    })
    .catch(error => console.error("Error deleting device:", error));
}

// Open the edit name popup for a specific device
function openEditNamePopup(deviceIndex) {
    const device = devices[deviceIndex]; // Get the device data
    document.getElementById("edit-title").value = device.title || "";
    document.getElementById("edit-ip_address").value = device.ip_address || "";
    document.getElementById("edit-location").value = device.location || ""; // Populate location
    document.getElementById("edit-name-form").style.display = "flex"; // Show the edit form
    currentEditDeviceIndex = deviceIndex; // Store the index of the device being edited
}

// Close the edit name popup
function closeEditNamePopup() {
    document.getElementById("edit-name-form").style.display = "none"; // Hide the edit form
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-ip_address").value = "";
    document.getElementById("edit-location").value = "";
}

function saveDeviceDetails() {
    let newTitle = document.getElementById("edit-title").value.trim();
    let newIpAddress = document.getElementById("edit-ip_address").value.trim();
    let newLocation = document.getElementById("edit-location").value.trim();
    const deviceId = devices[currentEditDeviceIndex].id;

    if (newIpAddress && (newIpAddress.startsWith("rtsp://") || newIpAddress.startsWith("http://") || newIpAddress.startsWith("https://"))) {
        newTitle = newTitle || `CAM${currentEditDeviceIndex + 1}`; // Default to CAM# if empty
        newLocation = newLocation || "Unknown"; // Default location if empty

        fetch("http://localhost:5500/update_device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: deviceId,
                title: newTitle,
                ip_address: newIpAddress,
                location: newLocation
            })
        })
        .then(response => response.json())
        .then(data => {
            devices[currentEditDeviceIndex].title = newTitle;
            devices[currentEditDeviceIndex].ip_address = newIpAddress;
            devices[currentEditDeviceIndex].location = newLocation;
            renderDevices(); // Refresh the device list
            closeEditNamePopup(); // Close the edit form
        })
        .catch(error => console.error("Error updating device:", error));
    } else {
        alert("Please enter a valid RTSP, HTTP, or HTTPS URL.");
    }
}

// Show notification icon
function showNotification() {
    const notificationIcon = document.getElementById("notification-icon");
    notificationIcon.classList.add("show");
}