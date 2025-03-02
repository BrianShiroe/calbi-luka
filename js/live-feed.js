let devices = []; // Array to store device information
let currentEditDeviceIndex = null; // Stores index of device being edited

// Initialize app on window load
window.onload = function () {
    loadDevices(); // Load saved devices from local storage
    renderDevices(); // Render devices in the UI
    showNotification(); // Show notification icon (if applicable)
};

// Load devices from localStorage
function loadDevices() {
    const savedDevices = localStorage.getItem("devices");
    if (savedDevices) {
        devices = JSON.parse(savedDevices);
    }
}

// Save devices to localStorage
function saveDevices() {
    localStorage.setItem("devices", JSON.stringify(devices));
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
    const streamUrl = document.getElementById("ip_address").value;
    const feedName = document.getElementById("title").value.trim();
    
    if (streamUrl && (streamUrl.startsWith("rtsp://") || streamUrl.startsWith("http://") || streamUrl.startsWith("https://"))) {
        const deviceName = feedName || `Stream Feed ${devices.length + 1}`;
        devices.push({ name: deviceName, streamUrl });
        
        // Clear input fields
        document.getElementById("title").value = "";
        document.getElementById("ip_address").value = "";
        
        saveDevices(); // Save updated devices list
        closePopup(); // Close the popup
        renderDevices(); // Re-render device list
    } else {
        alert("Please enter a valid RTSP, HTTP, or HTTPS URL.");
    }
}

// Render the devices on the UI
function renderDevices() {
    const gridContainer = document.getElementById("grid-container");
    gridContainer.innerHTML = ""; // Clear the grid before rendering

    devices.forEach((device, index) => {
        const videoFeedURL = `http://localhost:5000/stream?stream_url=${encodeURIComponent(device.streamUrl)}`;
        const deviceCard = createDeviceCard(videoFeedURL, device.name, index);
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

// Create a device card element
function createDeviceCard(videoFeedURL, deviceName, deviceIndex) {
    const deviceCard = document.createElement("div");
    deviceCard.className = "device-card";

    const imgElement = document.createElement("img");
    imgElement.src = videoFeedURL;
    imgElement.style.width = "100%";
    imgElement.style.borderRadius = "10px";

    const nameElement = document.createElement("h3");
    nameElement.textContent = deviceName;

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

    deviceCard.appendChild(imgElement);
    deviceCard.appendChild(nameElement);
    deviceCard.appendChild(menuContainer);

    return deviceCard;
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
    deletePopup.style.display = "flex";

    document.getElementById("confirm-delete").onclick = () => {
        deleteDevice(deviceIndex);
        deletePopup.style.display = "none";
    };

    document.getElementById("cancel-delete").onclick = () => {
        deletePopup.style.display = "none";
    };
}

// Delete a device from the list
function deleteDevice(deviceIndex) {
    devices.splice(deviceIndex, 1);
    saveDevices(); // Save updated devices list
    renderDevices(); // Re-render device list
}

// Open the edit name popup for a specific device
function openEditNamePopup(deviceIndex) {
    const device = devices[deviceIndex];
    document.getElementById("edit-title").value = device.name;
    document.getElementById("edit-ip_address").value = device.streamUrl;
    document.getElementById("edit-name-form").style.display = "flex";
    currentEditDeviceIndex = deviceIndex;
}

// Close the edit name popup
function closeEditNamePopup() {
    document.getElementById("edit-name-form").style.display = "none";
}

// Save the edited device details (name and stream URL)
function saveDeviceDetails() {
    const newName = document.getElementById("edit-title").value.trim();
    const newStreamUrl = document.getElementById("edit-ip_address").value.trim();

    if (newStreamUrl && (newStreamUrl.startsWith("rtsp://") || newStreamUrl.startsWith("http://") || newStreamUrl.startsWith("https://"))) {
        devices[currentEditDeviceIndex].name = newName || `Stream Feed ${currentEditDeviceIndex + 1}`;
        devices[currentEditDeviceIndex].streamUrl = newStreamUrl;
        saveDevices();
        renderDevices();
        closeEditNamePopup();
    } else {
        alert("Please enter a valid RTSP, HTTP, or HTTPS URL.");
    }
}

// Show notification icon
function showNotification() {
    const notificationIcon = document.getElementById("notification-icon");
    notificationIcon.classList.add("show");
}
