document.addEventListener("DOMContentLoaded", function () {
    const folderContainer = document.getElementById("folder-container");

    const addFolderModal = document.getElementById("add-folder-modal");
    const folderNameInput = document.getElementById("folder-name-input");
    const createFolderBtn = document.getElementById("create-folder-btn");
    const closeAddFolderModal = document.getElementById("close-add-folder-modal");

    const deleteFolderModal = document.getElementById("delete-folder-modal");
    const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
    const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

    let folderToDelete = null;

    const controlPanel = document.createElement("div");
    controlPanel.style.display = "flex";
    controlPanel.style.gap = "10px";
    controlPanel.style.marginBottom = "10px";
    controlPanel.style.alignItems = "center"; 

    const sortContainer = document.createElement("div");
    sortContainer.classList.add("sort-container");

    const sortButton = document.createElement("button");
    sortButton.classList.add("sort-button");
    sortButton.innerHTML = `<img src="../img/sort.png" style="height:20px;" alt="sortImg">`;

    const sortDropdown = document.createElement("div");
    sortDropdown.classList.add("sort-dropdown");
    sortDropdown.innerHTML = `
        <p data-sort="name-asc">Sort A-Z</p>
        <p data-sort="name-desc">Sort Z-A</p>
        <p data-sort="date-asc">Oldest First</p>
        <p data-sort="date-desc">Newest First</p>
    `;

    sortButton.addEventListener("click", function (e) {
        e.stopPropagation();
        sortDropdown.classList.toggle("visible");
    });

    sortDropdown.querySelectorAll("p").forEach(option => {
        option.addEventListener("click", function () {
            FolderManager.sortFolders(option.getAttribute("data-sort"));
            sortDropdown.classList.remove("visible");
        });
    });

    document.addEventListener("click", function () {
        sortDropdown.classList.remove("visible");
    });

    sortContainer.appendChild(sortButton);
    sortContainer.appendChild(sortDropdown);

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search folders...";
    searchInput.style.flex = "1";
    searchInput.addEventListener("input", () => FolderManager.searchFolders(searchInput.value));

    controlPanel.appendChild(sortContainer);
    controlPanel.appendChild(searchInput);

    folderContainer.parentElement.prepend(controlPanel);

    const addFolderButton = FolderManager.createAddFolderButton();
    folderContainer.appendChild(addFolderButton);
    
    function getUniqueFolderName(baseName) {
        let folderNames = FolderManager.getFolders().map(folder => folder.name);
        if (!folderNames.includes(baseName)) return baseName;

        let count = 2;
        let newName = `${baseName} (${count})`;

        while (folderNames.includes(newName)) {
            count++;
            newName = `${baseName} (${count})`;
        }

        return newName;
    }

    // When opening the modal, prefill the input with folder name "Untitled Folder"
    addFolderButton.addEventListener("click", function () {
        addFolderModal.style.display = "flex";
        folderNameInput.value = getUniqueFolderName("Untitled Folder");
        setTimeout(() => {
            folderNameInput.select();
            folderNameInput.focus(); 
        }, 100);
    });

    // Handle Enter key in modal input
    folderNameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault(); // Prevent accidental double submission
            createFolder();
        }
    });

    createFolderBtn.addEventListener("click", createFolder);

    function createFolder() {
        let folderName = folderNameInput.value.trim();

        if (!folderName) {
            alert("Folder name cannot be empty.");
            folderNameInput.focus();
            return;
        }

        folderName = getUniqueFolderName(folderName);
        FolderManager.addFolder(folderContainer, folderName);
        folderNameInput.value = "";
        addFolderModal.style.display = "none";
    }

    confirmDeleteBtn.onclick = function () {
        if (folderToDelete) {
            folderToDelete.remove();
            deleteFolderModal.style.display = "none";
        }
    };

    cancelDeleteBtn.onclick = function () {
        deleteFolderModal.style.display = "none";
    };
});