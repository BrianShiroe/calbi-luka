document.addEventListener('DOMContentLoaded', function () {
    function isRecordLogTabActive() {
        const recordLogTab = document.getElementById('record-log-tab');
        return recordLogTab.classList.contains('active');
    }

    async function fetchAndDisplayRecordedFiles() {
        if (!isRecordLogTabActive()) {
            return;
        }

        try {
            const response = await fetch('/get_recorded_files');
            let files = await response.json();
            
            files = files.reverse(); // Show newest first

            const gridContainer = document.getElementById('record-log-grid');
            gridContainer.innerHTML = ''; // Clear existing content

            files.forEach(file => {
                const fileExtension = file.split('.').pop().toLowerCase();
                const card = document.createElement('div');
                card.className = 'record-card';

                if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
                    card.innerHTML = `
                        <img src="/records/${file}" alt="${file}" loading="lazy">
                        <p>${file}</p>
                    `;
                } else if (['mp4', 'avi'].includes(fileExtension)) {
                    card.innerHTML = `
                        <video controls preload="none" poster="/records/${file}.jpg">
                            <source data-src="/records/${file}" type="video/${fileExtension}">
                            Your browser does not support the video tag.
                        </video>
                        <p>${file}</p>
                    `;

                    const video = card.querySelector('video');
                    const source = card.querySelector('source');
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                source.src = source.dataset.src;
                                video.load();
                                observer.unobserve(video);
                            }
                        });
                    }, { threshold: 0.5 });

                    observer.observe(video);
                }

                gridContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Error fetching recorded files:', error);
        }
    }

    // Event listener for tab click
    document.getElementById('record-log-tab').addEventListener('click', fetchAndDisplayRecordedFiles);

    // 🔹 Set up SSE to listen for alerts and refresh recorded files
    const eventSource = new EventSource('/stream_alerts');

    eventSource.onmessage = function(event) {
        console.log("New alert received:", event.data);

        // Only update the record log if the tab is active
        if (isRecordLogTabActive()) {
            fetchAndDisplayRecordedFiles();
        }
    };

    eventSource.onerror = function() {
        console.error("EventSource connection error. Retrying...");
        eventSource.close();
    };
});
