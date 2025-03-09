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
        const files = await response.json();

        const gridContainer = document.getElementById('record-log-grid');
        gridContainer.innerHTML = ''; // Clear existing content

        files.forEach(file => {
            const fileExtension = file.split('.').pop().toLowerCase();
            const card = document.createElement('div');
            card.className = 'record-card';

            if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
                // Display image files
                card.innerHTML = `
                    <img src="/records/${file}" alt="${file}">
                    <p>${file}</p>
                `;
            } else if (['mp4', 'avi'].includes(fileExtension)) {
                // Display video files
                card.innerHTML = `
                    <video controls>
                        <source src="/records/${file}" type="video/${fileExtension}">
                        Your browser does not support the video tag.
                    </video>
                    <p>${file}</p>
                `;
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