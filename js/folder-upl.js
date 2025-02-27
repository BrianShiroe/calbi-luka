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

        const folderContent = document.createElement("div");
        folderContent.classList.add("folder-content");
        folderContent.style.display = "none";

        const fileStorage = document.createElement("div");
        fileStorage.classList.add("file-storage");

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.style.display = "none";

        const uploadButton = document.createElement("button");
        uploadButton.innerText = "Upload Files";
        uploadButton.classList.add("upload-button");
        uploadButton.addEventListener("click", function () {
            fileInput.click();
        });

        fileInput.addEventListener("change", function () {
            handleFileUpload(fileStorage, fileInput.files);
        });

        folderElement.addEventListener("click", function (e) {
            if (!e.target.classList.contains("upload-button")) {
                folderContent.style.display = folderContent.style.display === "none" ? "block" : "none";
            }
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
        folderElement.appendChild(folderContent);
        folderContent.appendChild(uploadButton);
        folderContent.appendChild(fileInput);
        folderContent.appendChild(fileStorage);

        return folderElement;
    }

    function handleFileUpload(fileStorage, files) {
        for (let file of files) {
            const listItem = document.createElement("div");
            listItem.classList.add("file-item");
            listItem.textContent = file.name;
            fileStorage.appendChild(listItem);
        }
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