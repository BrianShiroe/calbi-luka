document.addEventListener('DOMContentLoaded', function () {
    const notificationIcon = document.getElementById('notification-icon');
    const notificationBox = document.getElementById('notification-box');
    const notificationList = document.getElementById('notification-list');
    const notificationCount = document.getElementById('notification-count');
    const clearNotificationsButton = document.getElementById('clear-notifications');

    // Load notifications from localStorage
    let notifications = JSON.parse(localStorage.getItem('notifications')) || [];

    // Function to save notifications to localStorage
    function saveNotifications() {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    // Function to add a new accident notification
    function addAccidentNotification(cameraLocation) {
        const timestamp = new Date().toLocaleTimeString();
        const message = `Accident detected on CAM1 ${cameraLocation} at ${timestamp}`;
        notifications.push(message);
        saveNotifications(); // Save to localStorage
        updateNotificationUI();
    }

    // Function to update the notification UI
    function updateNotificationUI() {
        notificationList.innerHTML = '';
        notifications.forEach((message, index) => {
            const li = document.createElement('li');
            li.textContent = message;
            notificationList.appendChild(li);
        });
        notificationCount.textContent = notifications.length;
        notificationBox.classList.toggle('show', notifications.length > 0);
    }

    // Function to clear all notifications
    function clearNotifications() {
        notifications = [];
        saveNotifications(); // Clear from localStorage
        updateNotificationUI();
    }

    // Toggle notification box visibility
    notificationIcon.addEventListener('click', function () {
        notificationBox.classList.toggle('show');
    });

    // Clear all notifications
    clearNotificationsButton.addEventListener('click', clearNotifications);

    // Simulate accident notifications for specific cameras
    const cameraLocations = ["Main Street", "Highway 101", "Downtown Intersection", "Airport Road"];
    setInterval(() => {
        const randomCamera = cameraLocations[Math.floor(Math.random() * cameraLocations.length)];
        addAccidentNotification(randomCamera);
    }, 60000); // Add a notification every 60 seconds

    // Load notifications when the page loads
    updateNotificationUI();
});