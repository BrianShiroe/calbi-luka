document.addEventListener("DOMContentLoaded", () => {
    let sidebar = document.querySelector(".sidebar");
    let closeBtn = document.querySelector("#btn");
    let body = document.body;

    let isSidebarOpen = localStorage.getItem("sidebarOpen") === "true";

    sidebar.classList.remove("transition");

    if (isSidebarOpen) {
        sidebar.classList.add("open");
        body.style.marginLeft = "120px";
    } else {
        sidebar.classList.remove("open");
        body.style.marginLeft = "0";
    }

    function toggleSidebar() {
        let isOpen = sidebar.classList.toggle("open");
        menuBtnChange();

        body.style.marginLeft = isOpen ? "120px" : "0";
        localStorage.setItem("sidebarOpen", isOpen);
    }

    function menuBtnChange() {
        if (sidebar.classList.contains("open")) {
            closeBtn.classList.replace("bx-chevron-right", "bx-chevron-left");
        } else {
            closeBtn.classList.replace("bx-chevron-left", "bx-chevron-right");
        }
    }

    closeBtn.addEventListener("click", toggleSidebar);
});