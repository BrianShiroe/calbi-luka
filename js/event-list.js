document.getElementById("download-btn").addEventListener("click", function () {
    let table = document.getElementById("incident-table");
    let ws = XLSX.utils.table_to_sheet(table);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidents");
    XLSX.writeFile(wb, "Incident_Report.xlsx");
});

function sortTable(colIndex) {
    let table = document.getElementById("incident-table");
    let tbody = table.querySelector("tbody");
    let rows = Array.from(tbody.rows);

    if (rows.length <= 1) return;

    let isAscending = table.dataset.sortOrder !== "asc";
    table.dataset.sortOrder = isAscending ? "asc" : "desc";

    rows = rows.filter(row => row.cells.length > 1); // Ignore "No data available"

    rows.sort((rowA, rowB) => {
        let a = rowA.cells[colIndex].innerText.trim();
        let b = rowB.cells[colIndex].innerText.trim();

        return isAscending ? a.localeCompare(b) : b.localeCompare(a);
    });

    tbody.innerHTML = "";
    rows.forEach(row => tbody.appendChild(row));
}