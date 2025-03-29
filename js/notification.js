document.addEventListener('DOMContentLoaded', function () {
    const notificationIcon = document.getElementById('notification-icon');
    const notificationBox = document.getElementById('notification-box');
    const notificationList = document.getElementById('notification-list');
    const notificationCount = document.getElementById('notification-count');
    const clearNotificationsButton = document.getElementById('clear-notifications');
    const showUnreadButton = document.getElementById('show-unread');
    const showAllButton = document.getElementById('show-all');

    let notifications = [];
    
    // Retrieve persisted filter type from localStorage (default to 'unread' if not set)
    const persistedFilterType = localStorage.getItem('notificationFilterType') || 'unread';

    // Set the active button on page load based on the persisted filter type
    if (persistedFilterType === 'unread') {
        showUnreadButton.classList.add('active');
        showAllButton.classList.remove('active');
    } else if (persistedFilterType === 'all') {
        showAllButton.classList.add('active');
        showUnreadButton.classList.remove('active');
    }

    // Initial UI update using the persisted filter type
    updateNotificationUI(true, persistedFilterType);

    // Event listener for 'Unread' button
    showUnreadButton.addEventListener('click', () => {
        // Toggle active class
        showUnreadButton.classList.add('active');
        showAllButton.classList.remove('active');
        
        // Update notifications to show unread only and persist filter type
        updateNotificationUI(true, 'unread');
    });

    // Event listener for 'All' button
    showAllButton.addEventListener('click', () => {
        // Toggle active class
        showAllButton.classList.add('active');
        showUnreadButton.classList.remove('active');
        
        // Update notifications to show all and persist filter type
        updateNotificationUI(true, 'all');
    });

    // Function to update the notification UI
    function updateNotificationUI(showBox, filterType = null) {
        // Retrieve settings from localStorage
        const settings = JSON.parse(localStorage.getItem("settings")) || {};
        const dateFormat = settings.alert_date_format || "mm-dd-yyyy"; // Default: MM-DD-YYYY
        const timeFormat = settings.alert_time_format || "12hr-with-seconds"; // Default: 12-hour with seconds
    
        // If filterType is not provided, retrieve it from localStorage (or default to 'unread')
        if (filterType === null) {
            filterType = localStorage.getItem("notificationFilterType") || "unread";
        } else {
            localStorage.setItem("notificationFilterType", filterType);
        }
    
        notificationList.innerHTML = ""; // Clear the existing list
    
        const filteredNotifications = notifications.filter(alert => {
            if (filterType === "unread") {
                return !alert.resolved;
            } else {
                return alert.resolved === 0 || alert.resolved === 1;
            }
        });
    
        if (filteredNotifications.length === 0) {
            const noDataLi = document.createElement("li");
            noDataLi.textContent = "No Alerts at the Moment!";
            noDataLi.style.textAlign = "center";
            noDataLi.style.color = "#888";
            notificationList.appendChild(noDataLi);
        } else {
            filteredNotifications.forEach(alert => {
                const li = document.createElement("li");
    
                // Parse detected_at timestamp
                const [datePart, timePart] = alert.detected_at.split("_");
                let [month, day, year] = datePart.split("-");
                year = `20${year}`; // Convert short year to full year
    
                let [hours, minutes, secondsWithPeriod] = timePart.split(".");
                let seconds = secondsWithPeriod.substring(0, 2);
                let period = secondsWithPeriod.substring(2); // AM/PM
    
                // Format date based on settings
                let formattedDate;
                switch (dateFormat) {
                    case "dd-mm-yyyy":
                        formattedDate = `${day}-${month}-${year}`;
                        break;
                    case "yyyy-mm-dd":
                        formattedDate = `${year}-${month}-${day}`;
                        break;
                    default: // "mm-dd-yyyy"
                        formattedDate = `${month}-${day}-${year}`;
                        break;
                }
    
                // Format time based on settings
                let formattedTime;
                switch (timeFormat) {
                    case "12hr-no-seconds":
                        formattedTime = `${hours}:${minutes} ${period}`;
                        break;
                    case "24hr-with-seconds":
                        formattedTime = `${convertTo24Hour(hours, period)}:${minutes}:${seconds}`;
                        break;
                    case "24hr-no-seconds":
                        formattedTime = `${convertTo24Hour(hours, period)}:${minutes}`;
                        break;
                    default: // "12hr-with-seconds"
                        formattedTime = `${hours}:${minutes}:${seconds} ${period}`;
                        break;
                }
    
                // Create notification content
                const eventText = `${alert.camera_title}: ${alert.event_type} detected on ${alert.location} at ${formattedDate} ${formattedTime}`;
                li.textContent = eventText;
    
                notificationList.appendChild(li);
            });
        }
    
        const unresolvedCount = notifications.filter(alert => !alert.resolved).length;
        notificationCount.textContent = unresolvedCount;
    
        if (showBox) {
            notificationBox.classList.add("show");
        }
    
        notificationCount.style.visibility = unresolvedCount > 0 ? "visible" : "hidden";
    }
    
    // Helper function to convert 12-hour time to 24-hour format
    function convertTo24Hour(hours, period) {
        hours = parseInt(hours, 10);
        if (period === "PM" && hours !== 12) {
            hours += 12;
        } else if (period === "AM" && hours === 12) {
            hours = 0;
        }
        return hours.toString().padStart(2, "0");
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
        
                // Format the alert data properly for UI and notification
                const [datePart, timePart] = newAlert.detected_at.split("_");
                let [month, day, year] = datePart.split("-");
                year = `20${year}`; // Convert short year to full year
        
                let [hours, minutes, secondsWithPeriod] = timePart.split(".");
                let seconds = secondsWithPeriod.substring(0, 2);
                let period = secondsWithPeriod.substring(2); // AM/PM
        
                const settings = JSON.parse(localStorage.getItem("settings")) || {};
                const dateFormat = settings.alert_date_format || "mm-dd-yyyy"; // Default: MM-DD-YYYY
                const timeFormat = settings.alert_time_format || "12hr-with-seconds"; // Default: 12-hour with seconds
        
                // Format date
                let formattedDate;
                switch (dateFormat) {
                    case "dd-mm-yyyy":
                        formattedDate = `${day}-${month}-${year}`;
                        break;
                    case "yyyy-mm-dd":
                        formattedDate = `${year}-${month}-${day}`;
                        break;
                    default: // "mm-dd-yyyy"
                        formattedDate = `${month}-${day}-${year}`;
                        break;
                }
        
                // Format time
                let formattedTime;
                switch (timeFormat) {
                    case "12hr-no-seconds":
                        formattedTime = `${hours}:${minutes} ${period}`;
                        break;
                    case "24hr-with-seconds":
                        formattedTime = `${convertTo24Hour(hours, period)}:${minutes}:${seconds}`;
                        break;
                    case "24hr-no-seconds":
                        formattedTime = `${convertTo24Hour(hours, period)}:${minutes}`;
                        break;
                    default: // "12hr-with-seconds"
                        formattedTime = `${hours}:${minutes}:${seconds} ${period}`;
                        break;
                }
        
                // Properly formatted notification message
                const eventText = `${newAlert.camera_title}: ${newAlert.event_type} detected on ${newAlert.location} at ${formattedDate} ${formattedTime}`;
        
                updateNotificationUI(true); // Update the UI and show the notification box
                highlightDeviceCard(newAlert.camera_id); // Highlight the specific device card
        
                // Send Pushover notification using formatted eventText
                fetch('/send_pushover_notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: eventText })
                }).catch(error => console.error('Pushover notification error:', error));
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