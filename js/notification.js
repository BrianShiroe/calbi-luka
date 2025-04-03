document.addEventListener('DOMContentLoaded', function () {
    const notificationIcon = document.getElementById('notification-icon');
    const notificationBox = document.getElementById('notification-box');
    const notificationList = document.getElementById('notification-list');
    const notificationCount = document.getElementById('notification-count');
    const clearNotificationsButton = document.getElementById('clear-notifications');
    const showUnreadButton = document.getElementById('show-unread');
    const showAllButton = document.getElementById('show-all');

    let notifications = [];
    const notificationIds = new Set(); // Store alert IDs for quick duplicate checks

    // Retrieve persisted filter type
    const persistedFilterType = localStorage.getItem('notificationFilterType') || 'unread';
    showUnreadButton.classList.toggle('active', persistedFilterType === 'unread');
    showAllButton.classList.toggle('active', persistedFilterType === 'all');

    updateNotificationUI(false, persistedFilterType);

    showUnreadButton.addEventListener('click', () => toggleFilter('unread'));
    showAllButton.addEventListener('click', () => toggleFilter('all'));

    function toggleFilter(filterType) {
        showUnreadButton.classList.toggle('active', filterType === 'unread');
        showAllButton.classList.toggle('active', filterType === 'all');
        updateNotificationUI(true, filterType);
    }

    function updateNotificationUI(showBox, filterType = null) {
        filterType = filterType || localStorage.getItem("notificationFilterType") || "unread";
        localStorage.setItem("notificationFilterType", filterType);

        notificationList.innerHTML = "";

        const filteredNotifications = notifications.filter(alert => filterType === "all" || !alert.resolved);
        if (filteredNotifications.length === 0) {
            const noDataLi = document.createElement("li");
            noDataLi.textContent = "No Alerts at the Moment!";
            noDataLi.style.textAlign = "center";
            noDataLi.style.color = "#888";
            notificationList.appendChild(noDataLi);
        } else {
            filteredNotifications.forEach(alert => {
                const li = document.createElement("li");
                li.textContent = formatDateTime(alert);
                notificationList.appendChild(li);
            });
        }

        const unresolvedCount = notifications.filter(alert => !alert.resolved).length;
        notificationCount.textContent = unresolvedCount;
        notificationCount.style.visibility = unresolvedCount > 0 ? "visible" : "hidden";

        // if (showBox) {
        //     notificationBox.classList.add("show");
        // }
    }

    function formatDateTime(alert) {
        const settings = JSON.parse(localStorage.getItem("settings")) || {};
        const dateFormat = settings.alert_date_format || "mm-dd-yyyy";
        const timeFormat = settings.alert_time_format || "12hr-with-seconds";
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const [datePart, timePart] = alert.detected_at.split("_");
        let [month, day, year] = datePart.split("-");
        year = `20${year}`;

        let [hours, minutes, secondsWithPeriod] = timePart.split("-");
        let seconds = secondsWithPeriod.substring(0, 2);
        let period = secondsWithPeriod.substring(2);

        if (dateFormat.includes("abbr")) {
            month = monthNames[parseInt(month, 10) - 1];
        }

        const formattedDate = {
            "dd-mm-yyyy": `${day}-${month}-${year}`,
            "yyyy-mm-dd": `${year}-${month}-${day}`,
            "mm-dd-yyyy-abbr": `${month}-${day}-${year}`,
            "dd-mm-yyyy-abbr": `${day}-${month}-${year}`,
            "yyyy-mm-dd-abbr": `${year}-${month}-${day}`,
            "mm-dd-yyyy": `${month}-${day}-${year}`
        }[dateFormat] || `${month}-${day}-${year}`;

        const formattedTime = {
            "12hr-no-seconds": `${hours}:${minutes} ${period}`,
            "24hr-with-seconds": `${convertTo24Hour(hours, period)}:${minutes}:${seconds}`,
            "24hr-no-seconds": `${convertTo24Hour(hours, period)}:${minutes}`,
            "12hr-with-seconds": `${hours}:${minutes}:${seconds} ${period}`
        }[timeFormat] || `${hours}:${minutes}:${seconds} ${period}`;

        return `${alert.camera_title}: ${alert.event_type} detected on ${alert.location} at ${formattedDate} ${formattedTime}`;
    }

    function convertTo24Hour(hours, period) {
        hours = parseInt(hours, 10);
        if (period === "PM" && hours !== 12) hours += 12;
        else if (period === "AM" && hours === 12) hours = 0;
        return hours.toString().padStart(2, "0");
    }

    function highlightDeviceCard(deviceId) {
        const deviceCard = document.getElementById(`device-${deviceId}`);
        if (deviceCard) {
            deviceCard.classList.add('highlight');
            const alertDuration = (JSON.parse(localStorage.getItem('settings'))?.alert_duration || 5) * 1000;
            setTimeout(() => deviceCard.classList.remove('highlight'), alertDuration);
            toggleFilter('unread');
        }
    }

    function clearNotifications() {
        fetch('/clear_alerts', { method: 'POST' })
            .then(() => {
                notifications.forEach(alert => alert.resolved = 1);
                updateNotificationUI(false);
                notificationBox.classList.remove('show');
            })
            .catch(error => console.error('Error clearing alerts:', error));
    }

    function toggleNotificationBox() {
        notificationBox.classList.toggle('show');
    }

    notificationIcon.removeEventListener('click', toggleNotificationBox);
    notificationIcon.addEventListener('click', toggleNotificationBox);
    clearNotificationsButton.removeEventListener('click', clearNotifications);
    clearNotificationsButton.addEventListener('click', clearNotifications);

    if (!window.eventSource) {
        window.eventSource = new EventSource('/stream_alerts');
        window.eventSource.onmessage = function (event) {
            const newAlert = JSON.parse(event.data);
            if (notificationIds.has(newAlert.id)) return;
            
            notificationIds.add(newAlert.id);
            notifications.unshift(newAlert);

            updateNotificationUI(true);
            highlightDeviceCard(newAlert.camera_id);

            fetch('/send_pushover_notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: formatDateTime(newAlert) })
            }).catch(error => console.error('Pushover notification error:', error));
        };

        window.eventSource.onerror = function (error) {
            console.error('SSE error:', error);
            window.eventSource.close();
        };
    }

    fetch('/get_alerts')
        .then(response => response.json())
        .then(data => {
            notifications = data;
            data.forEach(alert => notificationIds.add(alert.id));
            updateNotificationUI(false);
        })
        .catch(error => console.error('Error fetching initial alerts:', error));
});
