document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("change", function() {
        document.querySelectorAll(".settings-panel").forEach(panel => panel.style.display = "none");
        if (this.id === "tab1") document.getElementById("general-settings").style.display = "block";
        if (this.id === "tab2") document.getElementById("account-settings").style.display = "block";
        if (this.id === "tab3") document.getElementById("security-settings").style.display = "block";
    });
});

// General Settings
