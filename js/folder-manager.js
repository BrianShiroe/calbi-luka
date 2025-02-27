const FolderManager = (() => {
    let folders = [];
    let folderToDelete = null;

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
        folderTitle.setAttribute("contenteditable", "false");

        folderTitle.addEventListener("dblclick", function () {
            enableRename(folderTitle);
        });

        folderTitle.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                disableRename(folderTitle, folderName);
            }
        });

        folderTitle.addEventListener("blur", function () {
            disableRename(folderTitle, folderName);
        });

        const kebabMenu = document.createElement("div");
        kebabMenu.classList.add("kebab-menu");
        kebabMenu.innerHTML = "⋮";
        kebabMenu.addEventListener("click", function (e) {
            e.stopPropagation();
            toggleMenu(folderElement, folderTitle);
        });

        folderElement.appendChild(folderIcon);
        folderElement.appendChild(folderTitle);
        folderElement.appendChild(kebabMenu);

        return folderElement;
    }

    function enableRename(folderTitle) {
        folderTitle.setAttribute("contenteditable", "true");
        folderTitle.classList.add("editing");
        folderTitle.focus();

        // Select text inside the folder name
        const range = document.createRange();
        range.selectNodeContents(folderTitle);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function disableRename(folderTitle, originalName) {
        folderTitle.setAttribute("contenteditable", "false");
        folderTitle.classList.remove("editing");

        const newName = folderTitle.innerText.trim();
        if (!newName) {
            alert("Folder name cannot be empty.");
            folderTitle.innerText = originalName;
        } else {
            updateFolderName(folderTitle.parentElement, newName);
        }
    }

    function toggleMenu(folderElement, folderTitle) {
        let existingMenu = document.querySelector(".menu-container");
        if (existingMenu) existingMenu.remove();

        const menuContainer = document.createElement("div");
        menuContainer.className = "menu-container";

        menuContainer.innerHTML = `
            <div class="menu-options">
                <p class="rename-option"><i class="fa-solid fa-pen"></i> Rename</p>
                <p class="delete-option"><i class="fa-solid fa-trash"></i> Delete</p>
            </div>
        `;

        menuContainer.querySelector(".rename-option").addEventListener("click", function () {
            enableRename(folderTitle);
            menuContainer.remove();
        });

        menuContainer.querySelector(".delete-option").addEventListener("click", function () {
            showDeletePopup(folderElement);
            menuContainer.remove();
        });

        folderElement.appendChild(menuContainer);
        document.addEventListener("click", function closeMenu(e) {
            if (!menuContainer.contains(e.target)) {
                menuContainer.remove();
                document.removeEventListener("click", closeMenu);
            }
        });
    }

    function showDeletePopup(folderElement) {
        folderToDelete = folderElement;
        document.getElementById("delete-folder-modal").style.display = "flex";
    }

    function deleteFolder() {
        if (folderToDelete) {
            folderToDelete.remove();
            folders = folders.filter(folder => folder.element !== folderToDelete);
            folderToDelete = null;
            document.getElementById("delete-folder-modal").style.display = "none";
        }
    }

    function updateFolderName(folderElement, newName) {
        const folder = folders.find(folder => folder.element === folderElement);
        if (folder) {
            folder.name = newName;
        }
    }

    function sortFolders(value) {
        if (value === "name-asc") {
            folders.sort((a, b) => a.name.localeCompare(b.name));
        } else if (value === "name-desc") {
            folders.sort((a, b) => b.name.localeCompare(a.name));
        } else if (value === "date-asc") {
            folders.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));
        } else if (value === "date-desc") {
            folders.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
        }

        const folderContainer = document.getElementById("folder-container");
        folderContainer.innerHTML = "";
        const addFolderButton = createAddFolderButton();
        folderContainer.appendChild(addFolderButton);
        folders.forEach(folder => folderContainer.insertBefore(folder.element, addFolderButton));
    }

    function searchFolders(query) {
        query = query.toLowerCase();
        folders.forEach(folder => {
            const match = folder.name.toLowerCase().includes(query);
            folder.element.style.display = match ? "flex" : "none";
        });
    }

    function addFolder(folderContainer, folderName) {
        const folderElement = createFolderElement(folderName);
        folders.push({ name: folderName, dateCreated: new Date(), element: folderElement });
        const addFolderButton = document.querySelector(".add-folder");
        folderContainer.insertBefore(folderElement, addFolderButton);
    }

    function createAddFolderButton() {
        const button = document.createElement("div");
        button.className = "folder add-folder";
        button.innerHTML = `
            <div class="add-folder-container">
                <i class="fas fa-plus add-icon" style="font-size:20px; margin-left:35%;"></i>
                <p style="font-size:12px; color:grey;">Add Folder</p>
            </div>
        `;
        button.addEventListener("click", function () {
            document.getElementById("add-folder-modal").style.display = "flex";
        });
        return button;
    }

    return {
        createFolderElement,
        createAddFolderButton,
        sortFolders,
        searchFolders,
        addFolder,
        deleteFolder,
        setFolders: newFolders => (folders = newFolders),
        getFolders: () => folders,
    };
})();