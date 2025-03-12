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
                // Sort alerts in reverse order (newest first)
                data.sort((a, b) => b.id - a.id);
    
                if (JSON.stringify(data) !== JSON.stringify(notifications)) {
                    notifications = data;
                    updateNotificationUI(true);
                }
            })
            .catch(error => console.error('Error fetching alerts:', error));
    }    

    // Function to update the notification UI
    function updateNotificationUI(showBox) {
        notificationList.innerHTML = '';
        notifications.forEach(alert => {
            const li = document.createElement('li');
            li.textContent = `${alert.event_type} detected on ${alert.camera_title}: ${alert.location} at ${alert.detected_at}`;
            notificationList.appendChild(li);
        });
        notificationCount.textContent = notifications.length;
    
        if (showBox) {
            notificationBox.classList.add('show');
        }
    }

    // Function to clear all notifications
    function clearNotifications() {
        fetch('/clear_alerts', { method: 'POST' })
            .then(() => {
                notifications = [];
                updateNotificationUI(false);
            })
            .catch(error => console.error('Error clearing alerts:', error));
    }

    // Toggle notification box visibility
    notificationIcon.addEventListener('click', function () {
        notificationBox.classList.toggle('show');
    });

    // Clear all notifications
    clearNotificationsButton.addEventListener('click', clearNotifications);

    // Fetch alerts every 2 seconds
    setInterval(fetchAlerts, 2000);

    // Initial fetch
    fetchAlerts();
});