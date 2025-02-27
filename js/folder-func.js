document.addEventListener("DOMContentLoaded", function () {
    const folderContainer = document.getElementById("folder-container");
    const breadcrumbContainer = document.createElement("div"); // Breadcrumb navigation
    breadcrumbContainer.classList.add("breadcrumb");
    
    const addFolderModal = document.getElementById("add-folder-modal");
    const folderNameInput = document.getElementById("folder-name-input");
    const createFolderBtn = document.getElementById("create-folder-btn");
    const closeAddFolderModal = document.getElementById("close-add-folder-modal");

    let currentPath = []; // Track folder path
    let folderStructure = {}; // Store folder hierarchy

    function renderFolders(path) {
        folderContainer.innerHTML = ""; // Clear existing folders

        // Show breadcrumb navigation
        breadcrumbContainer.innerHTML = `<span class="breadcrumb-item" data-path="">Home</span>`;
        path.forEach((folder, index) => {
            breadcrumbContainer.innerHTML += ` / <span class="breadcrumb-item" data-path="${path.slice(0, index + 1).join('/')}">${folder}</span>`;
        });

        let currentFolder = getCurrentFolder(path);
        Object.keys(currentFolder).forEach(folderName => {
            const folder = document.createElement("div");
            folder.classList.add("folder");
            folder.textContent = folderName;

            folder.addEventListener("click", function () {
                currentPath.push(folderName);
                renderFolders(currentPath);
            });

            folderContainer.appendChild(folder);
        });

        const addFolderButton = FolderManager.createAddFolderButton();
        folderContainer.appendChild(addFolderButton);
    }

    function getCurrentFolder(path) {
        return path.reduce((acc, folder) => acc[folder] || {}, folderStructure);
    }

    function createFolder() {
        let folderName = folderNameInput.value.trim();
        if (!folderName) {
            alert("Folder name cannot be empty.");
            folderNameInput.focus();
            return;
        }

        let uniqueName = getUniqueFolderName(folderName);
        let currentFolder = getCurrentFolder(currentPath);
        currentFolder[uniqueName] = {}; // Create a new folder in the structure

        renderFolders(currentPath);
        addFolderModal.style.display = "none";
    }

    function getUniqueFolderName(baseName) {
        let currentFolder = getCurrentFolder(currentPath);
        let existingNames = Object.keys(currentFolder);
        if (!existingNames.includes(baseName)) return baseName;

        let count = 2;
        let newName = `${baseName} (${count})`;
        while (existingNames.includes(newName)) {
            count++;
            newName = `${baseName} (${count})`;
        }
        return newName;
    }

    folderContainer.parentElement.prepend(breadcrumbContainer);
    breadcrumbContainer.addEventListener("click", function (e) {
        if (e.target.classList.contains("breadcrumb-item")) {
            let path = e.target.getAttribute("data-path").split("/");
            currentPath = path.filter(Boolean);
            renderFolders(currentPath);
        }
    });

    addFolderButton.addEventListener("click", function () {
        addFolderModal.style.display = "flex";
        folderNameInput.value = getUniqueFolderName("Untitled Folder");
        setTimeout(() => folderNameInput.select(), 100);
    });

    createFolderBtn.addEventListener("click", createFolder);
    folderNameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            createFolder();
        }
    });

    renderFolders(currentPath); // Initialize folder view
});