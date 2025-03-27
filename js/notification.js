document.addEventListener('DOMContentLoaded', function () {
    const notificationIcon = document.getElementById('notification-icon');
    const notificationBox = document.getElementById('notification-box');
    const notificationList = document.getElementById('notification-list');
    const notificationCount = document.getElementById('notification-count');
    const clearNotificationsButton = document.getElementById('clear-notifications');
    const showUnreadButton = document.getElementById('show-unread');
    const showAllButton = document.getElementById('show-all');

    let notifications = [];
    
    // Event listener for 'Unread' button
    showUnreadButton.addEventListener('click', () => {
        // Toggle active class
        showUnreadButton.classList.add('active');
        showAllButton.classList.remove('active');
        
        // Update notifications to show unread only
        updateNotificationUI(true, 'unread');
    });
    
    // Event listener for 'All' button
    showAllButton.addEventListener('click', () => {
        // Toggle active class
        showAllButton.classList.add('active');
        showUnreadButton.classList.remove('active');
        
        // Update notifications to show all
        updateNotificationUI(true, 'all');
    });

    // Function to update the notification UI
    function updateNotificationUI(showBox, filterType = 'unread') {
        notificationList.innerHTML = '';  // Clear the existing list
        
        // Filter notifications based on the selected filter type
        const filteredNotifications = notifications.filter(alert => {
            if (filterType === 'unread') {
                return !alert.resolved; // Only unresolved alerts
            } else {
                return alert.resolved === 0 || alert.resolved === 1; // Show both unresolved and resolved alerts
            }
        });
        
        filteredNotifications.forEach(alert => {
            const li = document.createElement('li');
            
            // Format the event time to the desired format
            const rawTime = alert.detected_at; // e.g., '03-26-25_10.37.44PM'
            const formattedTime = rawTime.replace('_', ' : ').replace(/(\d{2})\.(\d{2})\.(\d{2})(AM|PM)/, '$1:$2:$3 $4');
            
            // Create the notification content with event type and camera details
            const eventText = `${alert.camera_title}: ${alert.event_type} detected on ${alert.location} at ${formattedTime}`;
            li.textContent = eventText;
            
            // Add the notification item to the list
            notificationList.appendChild(li);
        });
        
        // Update the notification count
        const unresolvedCount = notifications.filter(alert => !alert.resolved).length;
        notificationCount.textContent = unresolvedCount;
        
        // Show or hide the notification box
        if (showBox) {
            notificationBox.classList.add('show');
        }
        
        // Set visibility of notification count
        if (unresolvedCount > 0) {
            notificationCount.style.visibility = 'visible';
        } else {
            notificationCount.style.visibility = 'hidden';
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
    
            // Ensure the "Unread" button is active when a device is highlighted
            showUnreadButton.classList.add('active');
            showAllButton.classList.remove('active');
    
            // Update the notification UI to show unread alerts
            updateNotificationUI(true, 'unread');
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