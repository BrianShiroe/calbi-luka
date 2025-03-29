document.addEventListener("DOMContentLoaded", () => {
    let sidebar = document.querySelector(".sidebar");
    let toggleBtn = document.querySelector("#btn");
    let body = document.body;

    // if (isSidebarClosed) {
    //     sidebar.classList.add("closed");
    // }

    function updateBodyPadding() {
        body.style.paddingLeft = sidebar.classList.contains("closed") ? "100px" : "220px";
    }

    // function toggleSidebar() {
    //     let isClosed = sidebar.classList.toggle("closed");
    //     body.classList.toggle("sidebar-closed", isClosed);
    //     updateBodyPadding();
    //     // updateButtonIcon(isClosed);
    //     localStorage.setItem("sidebarClosed", isClosed);
    // }

    // function updateButtonIcon(isClosed) {
    //     toggleBtn.classList.replace(isClosed ? "bx-chevron-left" : "bx-chevron-right", isClosed ? "bx-chevron-right" : "bx-chevron-left");
    // }

    updateBodyPadding();
    // updateButtonIcon(isSidebarClosed);
    toggleBtn.addEventListener("click", toggleSidebar);
});

window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        document.querySelectorAll("style, link[rel='stylesheet']").forEach((styleSheet) => {
            if (styleSheet.sheet) {
                try {
                    for (let i = styleSheet.sheet.cssRules.length - 1; i >= 0; i--) {
                        let rule = styleSheet.sheet.cssRules[i];
                        if (rule.style && rule.style.transition === "none") {
                            rule.style.transition = ""; // Remove the "none" value
                        }
                    }
                } catch (e) {
                    console.warn("Could not modify stylesheet:", e);
                }
            }
        });
    }, 200); // Delay for 0.2 seconds
});