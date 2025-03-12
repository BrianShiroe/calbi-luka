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
        const videoFeedURL = `http://localhost:5500/stream?stream_url=${encodeURIComponent(device.ip_address)}&device_title=${encodeURIComponent(device.title)}&device_location=${encodeURIComponent(device.location)}&device_id=${device.id}`;
        const deviceCard = createDeviceCard(videoFeedURL, device.title, device.location, device.id, index); // Pass device.id
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

// SECTION: createDeviceCard
function createDeviceCard(videoFeedURL, deviceName, deviceLocation, deviceId, deviceIndex) {
    const deviceCard = document.createElement("div");
    deviceCard.className = "device-card";

    const mediaContainer = createMediaContainer(videoFeedURL);
    const nameElement = createTextElement("h3", deviceName);
    const locationElement = createTextElement("p", `Location: ${deviceLocation}`, { fontSize: "12px", color: "grey" });
    const menuContainer = createMenuContainer(deviceIndex, deviceId); // Pass deviceId to menu container

    deviceCard.append(mediaContainer, nameElement, locationElement, menuContainer);
    return deviceCard;
}

function createMediaContainer(videoFeedURL) {
    const mediaContainer = document.createElement("div");
    mediaContainer.style.position = "relative";
    mediaContainer.style.width = "100%";
    mediaContainer.style.borderRadius = "10px";
    mediaContainer.style.cursor = "pointer";

    const mediaElement = createMediaElement(videoFeedURL);
    mediaContainer.appendChild(mediaElement);
    return mediaContainer;
}

function createMediaElement(videoFeedURL) {
    let mediaElement;
    if (videoFeedURL.match(/\.(mp4|webm|ogg)$/i)) {
        mediaElement = document.createElement("video");
        mediaElement.controls = true;
    } else {
        mediaElement = document.createElement("img");
    }
    mediaElement.src = videoFeedURL;
    mediaElement.style.width = "100%";
    mediaElement.style.borderRadius = "10px";
    mediaElement.onclick = () => openFullscreen(videoFeedURL);
    return mediaElement;
}

function createTextElement(tag, textContent, styles = {}) {
    const element = document.createElement(tag);
    element.textContent = textContent;
    Object.assign(element.style, styles);
    return element;
}

function createMenuContainer(deviceIndex, deviceId) {
    const menuContainer = document.createElement("div");
    menuContainer.className = "menu-container";

    const menuIcon = document.createElement("i");
    menuIcon.className = "fas fa-ellipsis-v kebab-menu";
    const menuOptions = createMenuOptions(deviceIndex, deviceId); // Pass deviceId to menu options
    
    menuIcon.onclick = () => toggleMenu(menuOptions);
    menuContainer.append(menuIcon, menuOptions);
    return menuContainer;
}

function createMenuOptions(deviceIndex, deviceId) {
    const menuOptions = document.createElement("div");
    menuOptions.className = "menu-options";
    menuOptions.innerHTML = `
        <p onclick="openEditNamePopup(${deviceIndex}, '${deviceId}')">
            <span><i class="fa-solid fa-pen-to-square"></i></span> Edit
        </p>
        <p onclick="showDeletePopup(${deviceIndex}, '${deviceId}')">
            <span><i class="fa-solid fa-trash"></i></span> Delete
        </p>
    `;
    return menuOptions;
}

// SECTION: Fullscreen
function openFullscreen(videoFeedURL) {
    const videoContainer = document.createElement("div");
    videoContainer.className = "fullscreen-video";
    
    const mediaElement = createFullscreenMediaElement(videoFeedURL);
    const closeButton = createCloseButton();
    
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

    videoContainer.append(mediaElement, closeButton);
    document.body.appendChild(videoContainer);
}

function createFullscreenMediaElement(videoFeedURL) {
    let mediaElement;
    if (videoFeedURL.match(/\.(mp4|webm|ogg)$/i)) {
        mediaElement = document.createElement("video");
        mediaElement.controls = true;
        mediaElement.autoplay = true;
    } else {
        mediaElement = document.createElement("img");
        mediaElement.style.objectFit = "contain";
    }
    mediaElement.src = videoFeedURL;
    mediaElement.style.width = "100%";
    mediaElement.style.height = "100%";
    return mediaElement;
}

function createCloseButton() {
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
    return closeButton;
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
function showDeletePopup(deviceIndex, deviceId) {
    const deletePopup = document.getElementById("delete-form");
    deletePopup.style.display = "flex"; // Show the delete confirmation popup

    document.getElementById("confirm-delete").onclick = () => {
        deleteDevice(deviceIndex, deviceId); // Pass deviceId to deleteDevice
        deletePopup.style.display = "none"; // Hide the popup after deletion
    };

    document.getElementById("cancel-delete").onclick = () => {
        deletePopup.style.display = "none"; // Hide the popup without deleting
    };
}

// Delete a device from the list
function deleteDevice(deviceIndex, deviceId) {
    fetch("http://localhost:5500/delete_device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deviceId }) // Use the passed deviceId
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
function openEditNamePopup(deviceIndex, deviceId) {
    const device = devices[deviceIndex]; // Get the device data
    document.getElementById("edit-title").value = device.title || "";
    document.getElementById("edit-ip_address").value = device.ip_address || "";
    document.getElementById("edit-location").value = device.location || ""; // Populate location
    document.getElementById("edit-name-form").style.display = "flex"; // Show the edit form
    currentEditDeviceIndex = deviceIndex; // Store the index of the device being edited
    currentEditDeviceId = deviceId; // Store the ID of the device being edited
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

    if (newIpAddress && (newIpAddress.startsWith("rtsp://") || newIpAddress.startsWith("http://") || newIpAddress.startsWith("https://"))) {
        newTitle = newTitle || `CAM${currentEditDeviceIndex + 1}`; // Default to CAM# if empty
        newLocation = newLocation || "Unknown"; // Default location if empty

        fetch("http://localhost:5500/update_device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: currentEditDeviceId, // Use the stored device ID
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

document.addEventListener("DOMContentLoaded", () => {
    const deviceSizeSelect = document.getElementById("deviceSize");

    // Load saved preference
    const savedSize = localStorage.getItem("deviceCardSize") || "regular";
    deviceSizeSelect.value = savedSize;

    // Save preference when changed
    deviceSizeSelect.addEventListener("change", (event) => {
        localStorage.setItem("deviceCardSize", event.target.value);
    });
});

document.addEventListener("DOMContentLoaded", () => {
    applySavedDeviceSize();
});

function applySavedDeviceSize() {
    const savedSize = localStorage.getItem("deviceCardSize") || "regular";
    setDeviceCardSize(savedSize);
}

document.addEventListener("DOMContentLoaded", () => {
    const sizeSelector = document.getElementById("deviceSize");

    // Apply the saved device size on page load
    const savedSize = localStorage.getItem("deviceCardSize") || "regular";
    sizeSelector.value = savedSize;
    setDeviceCardSize(savedSize);

    // Listen for dropdown changes
    sizeSelector.addEventListener("change", (event) => {
        const newSize = event.target.value;
        setDeviceCardSize(newSize);
        localStorage.setItem("deviceCardSize", newSize);
    });
});

function setDeviceCardSize(size) {
    const container = document.documentElement; // Apply the class to the root element
    container.classList.remove("small", "regular", "large");
    container.classList.add(size);
}

