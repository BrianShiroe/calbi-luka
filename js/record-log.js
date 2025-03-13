document.addEventListener('DOMContentLoaded', function () {
    function isRecordLogTabActive() {
        const recordLogTab = document.getElementById('record-log-tab');
        return recordLogTab.classList.contains('active');
    }

    async function fetchAndDisplayRecordedFiles() {
        // Only proceed if the "Record Log" tab is active
        if (!isRecordLogTabActive()) {
            return;
        }

        try {
            const response = await fetch('/get_recorded_files');
            let files = await response.json();
            
            // Reverse order to show newest first
            files = files.reverse();

            const gridContainer = document.getElementById('record-log-grid');
            gridContainer.innerHTML = ''; // Clear existing content

            files.forEach(file => {
                const fileExtension = file.split('.').pop().toLowerCase();
                const card = document.createElement('div');
                card.className = 'record-card';

                if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
                    // Display image files with lazy loading
                    card.innerHTML = `
                        <img src="/records/${file}" alt="${file}" loading="lazy">
                        <p>${file}</p>
                    `;
                } else if (['mp4', 'avi'].includes(fileExtension)) {
                    // Display video files with lazy loading
                    card.innerHTML = `
                        <video controls preload="none" poster="/records/${file}.jpg">
                            <source data-src="/records/${file}" type="video/${fileExtension}">
                            Your browser does not support the video tag.
                        </video>
                        <p>${file}</p>
                    `;

                    // Lazy load video when it comes into view
                    const video = card.querySelector('video');
                    const source = card.querySelector('source');
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                source.src = source.dataset.src; // Load the video source
                                video.load(); // Load the video
                                observer.unobserve(video); // Stop observing once loaded
                            }
                        });
                    }, { threshold: 0.5 }); // Trigger when 50% of the video is in view

                    observer.observe(video);
                }

                gridContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Error fetching recorded files:', error);
        }
    }

    // Call the function when the page loads or when the "Record Log" tab is clicked
    document.addEventListener('DOMContentLoaded', fetchAndDisplayRecordedFiles);
    document.getElementById('record-log-tab').addEventListener('click', fetchAndDisplayRecordedFiles);
});