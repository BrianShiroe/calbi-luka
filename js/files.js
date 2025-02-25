document.addEventListener("DOMContentLoaded", function() {
    const folderContainer = document.getElementById("folder-container");
    const addFolderModal = document.getElementById("add-folder-modal");
    const folderNameInput = document.getElementById("folder-name-input");
    const createFolderBtn = document.getElementById("create-folder-btn");
    const closeAddFolderModal = document.getElementById("close-add-folder-modal");

    const editFolderNameModal = document.getElementById("edit-folder-name-modal");
    const editFolderNameInput = document.getElementById("edit-folder-name-input");
    const saveEditedFolderBtn = document.getElementById("save-edited-folder-btn");
    const closeEditFolderNameModal = document.getElementById("close-edit-folder-name-modal");

    const deleteFolderModal = document.getElementById("delete-folder-modal");
    const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
    const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

    let folderToDelete = null;
    let folders = [];

    const searchInput = document.createElement("input");
    searchInput.setAttribute("type", "text");
    searchInput.setAttribute("placeholder", "Search folders...");
    searchInput.style.width = "100%";
    searchInput.style.marginBottom = "10px";
    searchInput.addEventListener("input", searchFolders);
    folderContainer.parentElement.prepend(searchInput);

    const sortDropdown = document.createElement("select");
    sortDropdown.innerHTML = `
        <option value="name-asc">Sort A-Z</option>
        <option value="name-desc">Sort Z-A</option>
        <option value="date-asc">Oldest First</option>
        <option value="date-desc">Newest First</option>
        <option value="custom">Custom Order</option>
    `;
    sortDropdown.style.marginBottom = "10px";
    sortDropdown.addEventListener("change", sortFolders);
    folderContainer.parentElement.prepend(sortDropdown);

    const addFolderButton = createAddFolderButton();
    folderContainer.appendChild(addFolderButton);

    function createAddFolderButton() {
        const addFolderButton = document.createElement("div");
        addFolderButton.className = "folder add-folder";
        addFolderButton.innerHTML = `
            <div class="add-folder-container">
                <i class="fas fa-plus add-icon" style="font-size:20px; margin-left:35%;"></i>
                <p style="font-size:12px; color:grey;">Add Folder</p>
            </div>
        `;
        addFolderButton.addEventListener("click", function() {
            addFolderModal.style.display = "flex";
        });
        return addFolderButton;
    }

    closeAddFolderModal.addEventListener("click", function() {
        addFolderModal.style.display = "none";
    });

    createFolderBtn.addEventListener("click", function() {
        const folderName = folderNameInput.value.trim();
        if (folderName) {
            const folderElement = createFolderElement(folderName);
            folders.push({ name: folderName, dateCreated: new Date(), element: folderElement });
            folderContainer.insertBefore(folderElement, addFolderButton);
            folderNameInput.value = "";
            addFolderModal.style.display = "none";
        } else {
            alert("Folder name cannot be empty.");
        }
    });

    function createFolderElement(folderName) {
        const folderElement = document.createElement("div");
        folderElement.classList.add("folder");
        folderElement.setAttribute("draggable", "true");
        folderElement.setAttribute("data-date", new Date().toISOString());

        const folderIcon = document.createElement("div");
        folderIcon.classList.add("folder-icon");
        folderIcon.innerHTML = "📁";

        const folderTitle = document.createElement("div");
        folderTitle.classList.add("folder-name");
        folderTitle.innerText = folderName;
        folderTitle.setAttribute("contenteditable", "true");
        folderTitle.addEventListener("blur", function() {
            if (!folderTitle.innerText.trim()) {
                alert("Folder name cannot be empty.");
                folderTitle.innerText = folderName;
            }
        });

        const kebabMenu = document.createElement("div");
        kebabMenu.classList.add("kebab-menu");
        kebabMenu.innerHTML = "⋮";
        kebabMenu.addEventListener("click", function(e) {
            e.stopPropagation();
            toggleMenu(folderElement, folderTitle);
        });

        folderElement.appendChild(folderIcon);
        folderElement.appendChild(folderTitle);
        folderElement.appendChild(kebabMenu);

        folderElement.addEventListener("dragstart", dragStart);
        folderElement.addEventListener("dragover", dragOver);
        folderElement.addEventListener("drop", drop);

        return folderElement;
    }

    function toggleMenu(folderElement, folderTitle) {
        const menuContainer = document.createElement("div");
        menuContainer.className = "menu-container";
        menuContainer.style.display = "block";

        const menuOptions = document.createElement("div");
        menuOptions.className = "menu-options";
        menuOptions.innerHTML = `
            <p onclick="openEditNamePopup('${folderTitle.innerText}', ${folderElement})" style="font-size: 12px;">
                <span><i class="fa-solid fa-pen-to-square"></i></span> Edit
            </p>
            <p onclick="changeFolderColor(${folderElement})" style="font-size: 12px;">
                <span><i class="fa-solid fa-palette"></i></span> Change Color
            </p>
            <p onclick="showDeletePopup(${folderElement})" style="font-size: 12px;">
                <span><i class="fa-solid fa-trash"></i></span> Delete
            </p>
        `;

        menuContainer.appendChild(menuOptions);
        folderElement.appendChild(menuContainer);

        document.addEventListener("click", function closeMenu(e) {
            if (!menuContainer.contains(e.target)) {
                menuContainer.remove();
                document.removeEventListener("click", closeMenu);
            }
        });
    }

    window.changeFolderColor = function(folderElement) {
        const color = prompt("Enter a color (e.g., #ff5733 or 'blue'):");
        if (color) folderElement.style.backgroundColor = color;
    };

    function sortFolders() {
        const value = sortDropdown.value;
        if (value === "name-asc") {
            folders.sort((a, b) => a.name.localeCompare(b.name));
        } else if (value === "name-desc") {
            folders.sort((a, b) => b.name.localeCompare(a.name));
        } else if (value === "date-asc") {
            folders.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));
        } else if (value === "date-desc") {
            folders.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
        }

        folderContainer.innerHTML = "";
        folderContainer.appendChild(addFolderButton);
        folders.forEach(folder => folderContainer.insertBefore(folder.element, addFolderButton));
    }

    function searchFolders() {
        const query = searchInput.value.toLowerCase();
        folders.forEach(folder => {
            const match = folder.name.toLowerCase().includes(query);
            folder.element.style.display = match ? "flex" : "none";
        });
    }

    function dragStart(e) {
        e.dataTransfer.setData("text/plain", e.target.outerHTML);
        e.target.classList.add("dragging");
    }

    function dragOver(e) {
        e.preventDefault();
    }

    function drop(e) {
        e.preventDefault();
        const draggedHTML = e.dataTransfer.getData("text/plain");
        const draggedElement = document.createElement("div");
        draggedElement.innerHTML = draggedHTML;
        const newFolder = draggedElement.firstChild;
        folderContainer.insertBefore(newFolder, e.target);
        e.target.classList.remove("dragging");
    }

    closeEditFolderNameModal.addEventListener("click", function() {
        editFolderNameModal.style.display = "none";
    });

    window.showDeletePopup = function(folderElement) {
        folderToDelete = folderElement;
        deleteFolderModal.style.display = "flex";
    };

    cancelDeleteBtn.addEventListener("click", function() {
        deleteFolderModal.style.display = "none";
    });

    confirmDeleteBtn.addEventListener("click", function() {
        if (folderToDelete) {
            folderToDelete.remove();
            deleteFolderModal.style.display = "none";
        }
    });
});