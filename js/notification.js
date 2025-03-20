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
                li.textContent = `${alert.camera_title}: ${alert.event_type} detected on ${alert.location} at ${alert.detected_at}`;
                notificationList.appendChild(li);
            }
        });

        // Update the notification count
        const unresolvedCount = notifications.filter(alert => !alert.resolved).length;
        notificationCount.textContent = unresolvedCount;
        console.log('Current notifications:', notifications); // Debugging
        console.log('Unresolved count:', unresolvedCount); // Debugging

        // Show or hide the notification box
        if (showBox) {
            notificationBox.classList.add('show');
        }
    }

    // Function to highlight the corresponding device card
    function highlightDeviceCard(deviceId) {
        const deviceCard = document.getElementById(`device-${deviceId}`);
        if (deviceCard) {
            deviceCard.classList.add('highlight');

            // Retrieve and parse alert duration from "settings" in localStorage
            const settings = JSON.parse(localStorage.getItem('settings')) || {};
            const alertDuration = parseFloat(settings.alert_duration) || 5;
            const duration = alertDuration * 1000;

            setTimeout(() => {
                deviceCard.classList.remove('highlight');
            }, duration);
        }
    }

    // Function to clear all notifications
    function clearNotifications() {
        fetch('/clear_alerts', { method: 'POST' })
            .then(() => {
                notifications = notifications.map(alert => ({ ...alert, resolved: 1 })); // Mark all as resolved locally
                updateNotificationUI(false);
                notificationBox.classList.remove('show'); // Close notification box
            })
            .catch(error => console.error('Error clearing alerts:', error));
    }

    // Toggle notification box visibility
    function toggleNotificationBox() {
        notificationBox.classList.toggle('show');
    }

    // Remove any existing event listeners before adding new ones
    notificationIcon.removeEventListener('click', toggleNotificationBox);
    notificationIcon.addEventListener('click', toggleNotificationBox);

    clearNotificationsButton.removeEventListener('click', clearNotifications);
    clearNotificationsButton.addEventListener('click', clearNotifications);

    // Ensure only one SSE connection exists
    if (!window.eventSource) {
        window.eventSource = new EventSource('/stream_alerts');

        window.eventSource.onmessage = function (event) {
            const newAlert = JSON.parse(event.data);
            // Check if the alert already exists in the notifications array
            const exists = notifications.some(alert => alert.id === newAlert.id);
            if (!exists) {
                notifications.unshift(newAlert); // Add to the beginning of the array
                updateNotificationUI(true); // Update the UI and show the notification box
                highlightDeviceCard(newAlert.camera_id); // Highlight the specific device card
            }
        };

        window.eventSource.onerror = function (error) {
            console.error('SSE error:', error);
            window.eventSource.close(); // Close the connection on error
        };
    }

    // Initial fetch to load existing alerts on page load
    fetch('/get_alerts')
        .then(response => response.json())
        .then(data => {
            notifications = data; // Replace the notifications array with the fetched alerts
            updateNotificationUI(false);
        })
        .catch(error => console.error('Error fetching initial alerts:', error));
});