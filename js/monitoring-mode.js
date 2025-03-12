document.querySelector(".monitoring-mode").addEventListener("click", function () {
    const gridContainer = document.querySelector(".grid-container");
    gridContainer.classList.toggle("fullscreen");

    // Ensure body doesn't scroll in fullscreen mode
    document.body.classList.toggle("fullscreen-mode", gridContainer.classList.contains("fullscreen"));

    // Update button text
    this.innerHTML = gridContainer.classList.contains("fullscreen")
        ? "<i class='bx bx-exit-fullscreen'></i> Exit Monitoring Mode"
        : "<i class='bx bx-desktop'></i> Monitoring Mode";
});
