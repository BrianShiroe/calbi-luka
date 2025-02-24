function changeTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    if (tabName === 'live-feed') {
        document.getElementById('live-feed-tab').classList.add('active');
        document.getElementById('live-feed').classList.add('active');
    } else if (tabName === 'video-uploads') {
        document.getElementById('video-uploads-tab').classList.add('active');
        document.getElementById('video-uploads').classList.add('active');
    }
}