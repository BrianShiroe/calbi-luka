document.addEventListener('DOMContentLoaded', function () {
    const notificationIcon = document.getElementById('notification-icon');
    const notificationBox = document.getElementById('notification-box');
    const notificationList = document.getElementById('notification-list');
    const notificationCount = document.getElementById('notification-count');
    const clearNotificationsButton = document.getElementById('clear-notifications');

    let notifications = [];

    // Function to fetch new alerts from the database
    function fetchAlerts() {
        fetch('/get_alerts')
            .then(response => response.json())
            .then(data => {
                notifications = data;
                updateNotificationUI();
            })
            .catch(error => console.error('Error fetching alerts:', error));
    }

    // Function to update the notification UI
    function updateNotificationUI() {
        notificationList.innerHTML = '';
        notifications.forEach((alert, index) => {
            const li = document.createElement('li');
            li.textContent = `Alert: ${alert.event_type} detected at ${alert.location} by ${alert.camera_title} on ${alert.detected_at}`;
            notificationList.appendChild(li);
        });
        notificationCount.textContent = notifications.length;
        notificationBox.classList.toggle('show', notifications.length > 0);
    }

    // Function to clear all notifications
    function clearNotifications() {
        fetch('/clear_alerts', { method: 'POST' })
            .then(() => {
                notifications = [];
                updateNotificationUI();
            })
            .catch(error => console.error('Error clearing alerts:', error));
    }

    // Toggle notification box visibility
    notificationIcon.addEventListener('click', function () {
        notificationBox.classList.toggle('show');
    });

    // Clear all notifications
    clearNotificationsButton.addEventListener('click', clearNotifications);

    // Fetch alerts every 10 seconds
    setInterval(fetchAlerts, 10000);

    // Initial fetch
    fetchAlerts();
});