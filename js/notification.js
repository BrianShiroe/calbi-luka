document.addEventListener('DOMContentLoaded', function () {
    const notificationIcon = document.getElementById('notification-icon');
    const notificationBox = document.getElementById('notification-box');
    const notificationList = document.getElementById('notification-list');
    const notificationCount = document.getElementById('notification-count');
    const clearNotificationsButton = document.getElementById('clear-notifications');

    let notifications = [];

    // Function to update the notification UI
    function updateNotificationUI(showBox) {
        notificationList.innerHTML = '';
        notifications.forEach(alert => {
            if (!alert.resolved) {
                const li = document.createElement('li');
                li.textContent = `${alert.event_type} detected on ${alert.camera_title}: ${alert.location} at ${alert.detected_at}`;
                notificationList.appendChild(li);
            }
        });
        notificationCount.textContent = notifications.filter(alert => !alert.resolved).length;
    
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
                notificationBox.classList.remove('show'); // Close notification box
            })
            .catch(error => console.error('Error clearing alerts:', error));
    }

    // Toggle notification box visibility
    notificationIcon.addEventListener('click', function () {
        notificationBox.classList.toggle('show');
    });

    // Clear all notifications
    clearNotificationsButton.addEventListener('click', clearNotifications);

    // Establish SSE connection for real-time alerts
    const eventSource = new EventSource('/stream_alerts');

    eventSource.onmessage = function (event) {
        const newAlert = JSON.parse(event.data);

        // Add the new alert to the notifications array
        notifications.unshift(newAlert); // Add to the beginning of the array
        updateNotificationUI(true); // Update the UI and show the notification box
    };

    eventSource.onerror = function (error) {
        console.error('SSE error:', error);
        eventSource.close(); // Close the connection on error
    };

    // Initial fetch (optional, if you want to load existing alerts on page load)
    fetch('/get_alerts')
        .then(response => response.json())
        .then(data => {
            notifications = data;
            updateNotificationUI(false);
        })
        .catch(error => console.error('Error fetching initial alerts:', error));
});
