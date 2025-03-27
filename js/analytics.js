document.addEventListener("DOMContentLoaded", function () {
    const ctxLine = document.getElementById("lineChart").getContext("2d");
    const ctxPie = document.getElementById("pieChart").getContext("2d");
    const incidentCount = document.getElementById("incident-count");
    const timeframeSelect = document.getElementById("timeframe");
    const incidentThisWeekCount = document.getElementById("incident-this-week-count");
    const camerasActiveElement = document.getElementById("cameras-active");
    const mostAffectedLocationName = document.getElementById("most-affected-location-name");
    const incidentTable = document.getElementById("incident-table");
    const prevButton = document.getElementById("prev-page");
    const nextButton = document.getElementById("next-page");
    const pageInfo = document.getElementById("page-info");
    
    let lineChart, pieChart;
    const eventTypes = ["landslide", "flood", "fire", "smoke", "collision", "earthquake"];
    let currentPage = 1;
    const rowsPerPage = 10;
    let incidentData = []; // Stores the table data
    
    function fetchData(timeframe) {
        fetch("/api/incidents") // Fetch from Flask API instead of JSON file
            .then(response => response.json())
            .then(data => processIncidentData(data, timeframe))
            .catch(error => console.error("Error loading incident data:", error));
    }
    
    function parseCustomDateTime(detected_at) {
        const [datePart, timePart] = detected_at.split("_");
        const [month, day, year] = datePart.split("-").map(num => parseInt(num, 10));
        let [time, meridian] = [timePart.slice(0, -2), timePart.slice(-2)];
        let [hours, minutes] = time.split(".").map(num => parseInt(num, 10));
        
        if (meridian === "PM" && hours !== 12) hours += 12;
        if (meridian === "AM" && hours === 12) hours = 0;
        
        return {
            date: `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}-20${year}`,
            time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${meridian}`
        };
    }
    
    function processIncidentData(data, timeframe) {
        const categorizedData = initializeCategorizedData();
        const today = new Date();
        const currentYear = today.getFullYear();
    
        data.forEach(incident => {
            const { date, time } = parseCustomDateTime(incident.detected_at);
            const incidentDate = new Date(date);
            const incidentYear = incidentDate.getFullYear();
    
            if (incidentYear === currentYear) {
                updateCategorizedData(categorizedData, "monthly", incident, date, time, today);
            }
    
            const daysDifference = (today - incidentDate) / (1000 * 60 * 60 * 24);
            if (daysDifference <= 7) {
                updateCategorizedData(categorizedData, "weekly", incident, date, time, today);
            }
        });
    
        updateUI(categorizedData, timeframe);
    }   
    
    function initializeCategorizedData() {
        return {
            weekly: { count: 0, history: [0, 0, 0, 0, 0], events: [0, 0, 0, 0, 0], table: [] },
            monthly: { count: 0, history: [0, 0, 0, 0, 0], events: [0, 0, 0, 0, 0], table: [] }
        };
    }
    
    function determineCategory(incidentDate, today) {
        const daysDifference = (today - incidentDate) / (1000 * 60 * 60 * 24);
        if (daysDifference > 7) return "monthly";
        if (daysDifference > 1) return "weekly";
        return "weekly";
    }
    
    function updateCategorizedData(categorizedData, category, incident, date, time, today) {
        categorizedData[category].count++;
        categorizedData[category].table.push([date, time, incident.event_type, incident.location]);
    
        const eventIndex = eventTypes.indexOf(incident.event_type);
        if (eventIndex !== -1) {
            categorizedData[category].events[eventIndex]++;
        }
    
        const incidentDate = new Date(date);
    
        if (category === "weekly") {
            const dayDifference = Math.floor((today - incidentDate) / (1000 * 60 * 60 * 24));
            const weekIndex = Math.floor(dayDifference / 7); // Get correct week index
            if (weekIndex < 5) {
                categorizedData[category].history[4 - weekIndex]++; // Reverse indexing (most recent week last)
            }
        } else if (category === "monthly") {
            const monthIndex = incidentDate.getMonth();
            categorizedData[category].history[monthIndex]++;
        }
    }
    

    function updateIncidentThisWeekCount(categorizedData) {
        incidentThisWeekCount.textContent = categorizedData.weekly.count;
    }
    
    function updateUI(categorizedData, timeframe) {
        incidentCount.textContent = categorizedData[timeframe].count;
        updateLineChart(categorizedData[timeframe].history, timeframe);
        updatePieChart(categorizedData[timeframe].events);
        updateIncidentTable(categorizedData[timeframe].table);
        updateMostAffectedLocation(categorizedData[timeframe].table);
        updateIncidentThisWeekCount(categorizedData);
    }
    
    function updateLineChart(data, timeframe) {
        let labels = [];
    
        if (timeframe === "weekly") {
            const today = new Date();
            labels = [...Array(5)].map((_, i) => {
                const pastDate = new Date(today);
                pastDate.setDate(today.getDate() - (4 - i) * 7);
                return `Week of ${pastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
            });
        } else {
            labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        }
    
        if (lineChart) {
            lineChart.data.labels = labels;
            lineChart.data.datasets[0].data = data;
            lineChart.update();
        } else {
            lineChart = new Chart(ctxLine, {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        label: "Detected Incidents",
                        data,
                        borderColor: "#fff",
                        backgroundColor: "#383197",
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }
    
    function updatePieChart(data) {
        if (pieChart) pieChart.destroy();
        pieChart = new Chart(ctxPie, {
            type: "doughnut",
            data: { labels: eventTypes, datasets: [{ data, backgroundColor: ["#a9a4a4", "#027fff", "#b7d2e4", "#392e96", "#bdfffe", "#ff5733", "#33ff57"], borderColor: ["#fff"] }] },
            options: { cutout: "80%", responsive: true, plugins: { legend: { position: "bottom" } } },
            animation: { duration: 0 }
        });
    }
    
    function updateIncidentTable(data) {
        incidentData = data; // Store new data
        currentPage = 1; // Reset to first page
        renderTable();
    }
    
    function renderTable() {
        incidentTable.innerHTML = "";
    
        const totalRows = incidentData.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage);
        
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const visibleRows = incidentData.slice(start, end);
    
        if (visibleRows.length === 0) {
            incidentTable.innerHTML = "<tr><td colspan='4'>No data available</td></tr>";
        } else {
            visibleRows.forEach(row => {
                let tr = document.createElement("tr");
                row.forEach(cell => {
                    let td = document.createElement("td");
                    td.textContent = cell;
                    tr.appendChild(td);
                });
                incidentTable.appendChild(tr);
            });
    
            // Fill remaining rows with empty placeholders to ensure 10 rows
            for (let i = visibleRows.length; i < rowsPerPage; i++) {
                let tr = document.createElement("tr");
                for (let j = 0; j < 4; j++) {
                    let td = document.createElement("td");
                    td.textContent = "-"; // Placeholder
                    td.style.color = "#ccc"; // Gray out empty rows
                    tr.appendChild(td);
                }
                incidentTable.appendChild(tr);
            }
        }
    
        // Update pagination controls
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === totalPages || totalRows === 0;
    }
    
    // Pagination controls
    prevButton.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    
    nextButton.addEventListener("click", () => {
        const totalPages = Math.ceil(incidentData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
    
    timeframeSelect.addEventListener("change", () => fetchData(timeframeSelect.value));
    fetchData("weekly");

    // Function to update the Cameras Active count
    function updateCamerasActive() {
        const activeDeviceCount = localStorage.getItem("activeDeviceCount") || 0;
        camerasActiveElement.textContent = activeDeviceCount;
    }
    // Update the Cameras Active count on page load
    updateCamerasActive();
    // Listen for storage changes (in case another tab updates the device count)
    window.addEventListener("storage", updateCamerasActive);

    function updateMostAffectedLocation(data) {
        const locationCounts = {};
    
        data.forEach(([date, time, eventType, location]) => {
            if (location in locationCounts) {
                locationCounts[location]++;
            } else {
                locationCounts[location] = 1;
            }
        });
    
        // Determine the most affected location
        let mostAffectedLocation = "N/A";
        let maxCount = 0;
    
        for (const [location, count] of Object.entries(locationCounts)) {
            if (count > maxCount) {
                mostAffectedLocation = location;
                maxCount = count;
            }
        }
    
        mostAffectedLocationName.textContent = mostAffectedLocation;
    }

    function setupTabs() {
        const tabs = document.querySelectorAll(".tab-button");
        const contents = document.querySelectorAll(".tab-content");
        let activeTab = document.querySelector(".tab-content.active");
    
        tabs.forEach(tab => {
            tab.addEventListener("click", function () {
                tabs.forEach(t => t.classList.remove("active"));
                this.classList.add("active");
                
                const targetContent = document.getElementById(this.dataset.tab);
                if (activeTab && activeTab !== targetContent) activeTab.classList.remove("active");
                targetContent.classList.add("active");
                activeTab = targetContent;
            });
        });
    }
    setupTabs();
});
