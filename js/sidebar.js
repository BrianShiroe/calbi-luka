// Apply sidebar state before rendering
let isSidebarClosed = localStorage.getItem("sidebarClosed") === "true";
if (isSidebarClosed) {
    document.body.classList.add("sidebar-closed");
}

document.addEventListener("DOMContentLoaded", () => {
    let sidebar = document.querySelector(".sidebar");
    let toggleBtn = document.querySelector("#btn");
    let body = document.body;

    if (isSidebarClosed) {
        sidebar.classList.add("closed");
    }

    function updateBodyPadding() {
        body.style.paddingLeft = sidebar.classList.contains("closed") ? "100px" : "220px";
    }

    function toggleSidebar() {
        let isClosed = sidebar.classList.toggle("closed");
        body.classList.toggle("sidebar-closed", isClosed);
        updateBodyPadding();
        updateButtonIcon(isClosed);
        localStorage.setItem("sidebarClosed", isClosed);
    }

    function updateButtonIcon(isClosed) {
        toggleBtn.classList.replace(isClosed ? "bx-chevron-left" : "bx-chevron-right", isClosed ? "bx-chevron-right" : "bx-chevron-left");
    }

    updateBodyPadding();
    updateButtonIcon(isSidebarClosed);
    toggleBtn.addEventListener("click", toggleSidebar);
});
