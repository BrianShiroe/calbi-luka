document.querySelector(".monitoring-mode").addEventListener("click", function () {
    const gridContainer = document.querySelector(".grid-container");
    gridContainer.classList.toggle("fullscreen");

    // Ensure body doesn't scroll in fullscreen mode
    document.body.classList.toggle("fullscreen-mode", gridContainer.classList.contains("fullscreen"));

    // Update button text
    this.innerHTML = gridContainer.classList.contains("fullscreen")
        ? "<i class='bx bx-exit-fullscreen'></i> Exit Monitoring Mode"
        : "<i class='bx bx-desktop'></i> Monitoring Mode";

    // Check if a stream (individual) fullscreen video exists (has a close button)
    const soloFullscreenActive = document.querySelector(".fullscreen-video") !== null;
    const exitButton = document.querySelector(".exit-fullscreen-btn");

    if (gridContainer.classList.contains("fullscreen") && !soloFullscreenActive) {
        // Only create exit button if it's Monitoring Mode fullscreen, NOT Solo Stream fullscreen
        if (!exitButton) {
            const exitBtn = document.createElement("button");
            exitBtn.classList.add("exit-fullscreen-btn");
            exitBtn.innerHTML = "<i class='bx bx-x'></i> Exit";
            Object.assign(exitBtn.style, {
                position: "fixed",
                top: "15px",
                right: "15px",
                padding: "10px 15px",
                background: "red",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                zIndex: "1100",
            });
            exitBtn.addEventListener("click", function () {
                gridContainer.classList.remove("fullscreen");
                document.body.classList.remove("fullscreen-mode");
                document.querySelector(".monitoring-mode").innerHTML = "<i class='bx bx-desktop'></i> Monitoring Mode";
                exitBtn.remove(); // Remove exit button when exiting fullscreen
            });
            document.body.appendChild(exitBtn);
        }
    } else if (exitButton) {
        // Remove exit button if a solo stream fullscreen is detected
        exitButton.remove();
    }
});

// Hook into individual stream fullscreen function to remove exit button if it appears
function openFullscreen(videoFeedURL) {
    const videoContainer = document.createElement("div");
    videoContainer.className = "fullscreen-video";

    const mediaElement = createFullscreenMediaElement(videoFeedURL);
    const closeButton = createCloseButton();

    Object.assign(videoContainer.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        backgroundColor: "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: "1000",
    });

    videoContainer.append(mediaElement, closeButton);
    document.body.appendChild(videoContainer);

    // Remove the exit button if it exists (so it doesn't show up in individual fullscreen mode)
    const exitButton = document.querySelector(".exit-fullscreen-btn");
    if (exitButton) {
        exitButton.remove();
    }
}

function closeFullscreen() {
    const videoContainer = document.querySelector(".fullscreen-video");
    if (videoContainer) {
        videoContainer.remove();
    }

    // Re-add the exit button if Monitoring Mode is still active
    const gridContainer = document.querySelector(".grid-container");
    if (gridContainer.classList.contains("fullscreen")) {
        restoreExitButton();
    }
}

function restoreExitButton() {
    let exitBtn = document.querySelector(".exit-fullscreen-btn");

    if (!exitBtn) {
        exitBtn = document.createElement("button");
        exitBtn.classList.add("exit-fullscreen-btn");
        exitBtn.innerHTML = "<i class='bx bx-x'></i> Exit";
        Object.assign(exitBtn.style, {
            position: "fixed",
            top: "15px",
            right: "15px",
            padding: "10px 15px",
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            zIndex: "1100",
        });

        document.body.appendChild(exitBtn);
    }

    // Remove any existing event listeners to prevent duplicates
    exitBtn.replaceWith(exitBtn.cloneNode(true));
    exitBtn = document.querySelector(".exit-fullscreen-btn");

    // Reattach event listener to make exit button functional again
    exitBtn.addEventListener("click", function () {
        const gridContainer = document.querySelector(".grid-container");
        gridContainer.classList.remove("fullscreen");
        document.body.classList.remove("fullscreen-mode");
        document.querySelector(".monitoring-mode").innerHTML = "<i class='bx bx-desktop'></i> Monitoring Mode";
        exitBtn.remove(); // Remove exit button when exiting fullscreen
    });
}