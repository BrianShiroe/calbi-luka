let devices = [];
let currentEditDeviceIndex = null;

window.onload = function () {
    loadDevices();
    renderDevices();

    showNotification();
};

function loadDevices() {
    const savedDevices = localStorage.getItem("devices");
    if (savedDevices) {
        devices = JSON.parse(savedDevices);
    }
}

function saveDevices() {
    localStorage.setItem("devices", JSON.stringify(devices));
}

function openPopup() {
    document.getElementById("popup").style.display = "flex";
}

function closePopup() {
    document.getElementById("popup").style.display = "none";
}

function addDevice() {
    const streamUrl = document.getElementById("stream-url").value;
    if (streamUrl && (streamUrl.startsWith("rtsp://") || streamUrl.startsWith("http://") || streamUrl.startsWith("https://"))) {
        devices.push({ name: `Stream Feed ${devices.length + 1}`, streamUrl });
        document.getElementById("stream-url").value = "";
        closePopup();
        saveDevices();
        renderDevices();
    } else {
        alert("Please enter a valid RTSP, HTTP, or HTTPS URL.");
    }
}

function renderDevices() {
    const gridContainer = document.getElementById("grid-container");
    gridContainer.innerHTML = ""; // Clear the grid before rendering

    devices.forEach((device, index) => {
        const videoFeedURL = `http://localhost:5000/stream?stream_url=${encodeURIComponent(device.streamUrl)}`;
        const deviceCard = createDeviceCard(videoFeedURL, device.name, index);
        gridContainer.appendChild(deviceCard);
    });

    // Add Device Button at the end of the grid
    const addDeviceCard = document.createElement("div");
    addDeviceCard.className = "device-card add-device-card";
    addDeviceCard.innerHTML = `
    <div class="add-device-container">
        <i class="fas fa-plus add-icon" style="font-size:20px; position:relative; left:35%;"></i>
        <p style="font-size:12px; color:grey;">Add Device</p>
    </div>
`   ;
    addDeviceCard.onclick = openPopup;
    gridContainer.appendChild(addDeviceCard);
}

function createDeviceCard(videoFeedURL, deviceName, deviceIndex) {
    const deviceCard = document.createElement("div");
    deviceCard.className = "device-card";

    const imgElement = document.createElement("img");
    imgElement.src = videoFeedURL;
    imgElement.style.width = "100%";
    imgElement.style.borderRadius = "10px";

    const nameElement = document.createElement("h3");
    nameElement.textContent = deviceName;

    // Kebab menu
    const menuContainer = document.createElement("div");
    menuContainer.className = "menu-container";

    const menuIcon = document.createElement("i");
    menuIcon.className = "fas fa-ellipsis-v kebab-menu";
    menuIcon.onclick = () => toggleMenu(menuOptions);

    const menuOptions = document.createElement("div");
    menuOptions.className = "menu-options";
    menuOptions.innerHTML = `
        <p onclick="openEditNamePopup(${deviceIndex})"><span><i class="fa-solid fa-pen-to-square"></i></span>  Edit</p>
        <p onclick="showDeletePopup(${deviceIndex})"><span><i class="fa-solid fa-trash"></i></span>  Delete</p>
    `;

    menuContainer.appendChild(menuIcon);
    menuContainer.appendChild(menuOptions);

    deviceCard.appendChild(imgElement);
    deviceCard.appendChild(nameElement);
    deviceCard.appendChild(menuContainer);

    return deviceCard;
}

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

function showDeletePopup(deviceIndex) {
    const deletePopup = document.getElementById("delete-popup");
    deletePopup.style.display = "flex";

    document.getElementById("confirm-delete").onclick = () => {
        deleteDevice(deviceIndex);
        deletePopup.style.display = "none";
    };

    document.getElementById("cancel-delete").onclick = () => {
        deletePopup.style.display = "none";
    };
}

function deleteDevice(deviceIndex) {
    devices.splice(deviceIndex, 1);
    saveDevices();
    renderDevices();
}

function openEditNamePopup(deviceIndex) {
    const device = devices[deviceIndex];
    document.getElementById("edit-device-name").value = device.name;
    document.getElementById("edit-name-popup").style.display = "flex";
    currentEditDeviceIndex = deviceIndex;
}

function closeEditNamePopup() {
    document.getElementById("edit-name-popup").style.display = "none";
}

function saveDeviceName() {
    const newName = document.getElementById("edit-device-name").value;
    if (newName) {
        devices[currentEditDeviceIndex].name = newName;
        saveDevices();
        renderDevices();
        closeEditNamePopup();
    }
}

function showNotification() {
    const notificationIcon = document.getElementById("notification-icon");
    notificationIcon.classList.add("show");
}