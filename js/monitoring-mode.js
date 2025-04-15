document.querySelector(".monitoring-mode").addEventListener("click", function () {
    const gridContainer = document.querySelector(".grid-container");
    const htmlTag = document.documentElement; // Select the <html> tag

    gridContainer.classList.toggle("fullscreen");
    document.body.classList.toggle("fullscreen-mode", gridContainer.classList.contains("fullscreen"));

    if (gridContainer.classList.contains("fullscreen")) {
        htmlTag.classList.add("regular");
        ensureSevenDeviceCards();
    } else {
        htmlTag.classList.remove("regular");
        removeTemporaryCards();
    }

    this.innerHTML = gridContainer.classList.contains("fullscreen")
        ? "<i class='bx bx-exit-fullscreen'></i> Exit Monitoring Mode"
        : "<i class='bx bx-desktop'></i> Monitoring Mode";

    const soloFullscreenActive = document.querySelector(".fullscreen-video") !== null;
    const exitButton = document.querySelector(".exit-fullscreen-btn");

    if (gridContainer.classList.contains("fullscreen") && !soloFullscreenActive) {
        if (!exitButton) {
            const exitBtn = document.createElement("button");
            exitBtn.classList.add("exit-fullscreen-btn");
            exitBtn.innerHTML = "<i class='bx bx-exit'></i> Exit";
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
                htmlTag.classList.remove("regular");
                document.querySelector(".monitoring-mode").innerHTML = "<i class='bx bx-desktop'></i> Monitoring Mode";
                removeTemporaryCards();
                exitBtn.remove();
            });
            document.body.appendChild(exitBtn);
        }
    } else if (exitButton) {
        exitButton.remove();
    }
});

function ensureSevenDeviceCards() {
    const gridContainer = document.querySelector(".grid-container");
    const activeCards = gridContainer.querySelectorAll(".device-card").length;
    const neededCards = 7 - activeCards;
    
    if (neededCards > 0) {
        for (let i = 0; i < neededCards; i++) {
            const tempCard = document.createElement("div");
            tempCard.classList.add("device-card", "temporary-card");
            tempCard.innerHTML = "<p>No Feed</p>";
            Object.assign(tempCard.style, {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#292626",
                color: "#555",
                fontSize: "16px",
                height: "40vh",
                borderRadius: "5px",
            });
            gridContainer.appendChild(tempCard);
        }
    }
}

function removeTemporaryCards() {
    document.querySelectorAll(".temporary-card").forEach(card => card.remove());
}


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
        exitBtn.innerHTML = "<i class='bx bx-exit'></i> Exit";
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

    exitBtn.replaceWith(exitBtn.cloneNode(true));
    exitBtn = document.querySelector(".exit-fullscreen-btn");
    exitBtn.addEventListener("click", function () {
        const gridContainer = document.querySelector(".grid-container");
        gridContainer.classList.remove("fullscreen");
        document.body.classList.remove("fullscreen-mode");
        document.querySelector(".monitoring-mode").innerHTML = "<i class='bx bx-desktop'></i> Monitoring Mode";
        exitBtn.remove();
        removeTemporaryCards();
    });
}