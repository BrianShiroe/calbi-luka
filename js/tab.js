function changeTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    if (tabName === 'live-feed') {
        document.getElementById('live-feed-tab').classList.add('active');
        document.getElementById('live-feed').classList.add('active');
    } else if (tabName === 'record-log') {
        document.getElementById('record-log-tab').classList.add('active');
        document.getElementById('record-log').classList.add('active');
    }

    // Store selected tab in localStorage
    localStorage.setItem('activeTab', tabName);
}

// Restore the active tab on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTab = localStorage.getItem('activeTab') || 'live-feed'; // Default to 'live-feed'
    changeTab(savedTab);
});
