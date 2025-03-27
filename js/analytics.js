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
            if (daysDifference <= 30) {
                updateCategorizedData(categorizedData, "weekly", incident, date, time, today);
            }
        });
    
        updateUI(categorizedData, timeframe);
    }   
    
    function initializeCategorizedData() {
        return {
            weekly: { count: 0, history: Array(5).fill(0), events: Array(6).fill(0), table: [] },
            monthly: { count: 0, history: Array(12).fill(0), events: Array(6).fill(0), table: [] }
        };
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
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const weekIndex = Math.floor((incidentDate - monthStart) / (1000 * 60 * 60 * 24 * 7));
            if (weekIndex < 5) {
                categorizedData[category].history[weekIndex]++;
            }
        } else if (category === "monthly") {
            const monthIndex = incidentDate.getMonth();
            categorizedData[category].history[monthIndex]++;
        }
    }

    function updateIncidentThisWeekCount(categorizedData) {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Set to Sunday of the current week
        startOfWeek.setHours(0, 0, 0, 0);
    
        let thisWeekCount = 0;
    
        categorizedData.monthly.table.forEach(([date]) => {
            const incidentDate = new Date(date);
    
            if (incidentDate >= startOfWeek && incidentDate <= today) {
                thisWeekCount++;
            }
        });
    
        incidentThisWeekCount.textContent = thisWeekCount;
    }
    
    function updateUI(categorizedData, timeframe) {
        incidentCount.textContent = categorizedData[timeframe].count;
        updateIncidentThisWeekCount(categorizedData);
        updateLineChart(categorizedData[timeframe].history, timeframe);
        updatePieChart(categorizedData[timeframe].events);
        updateIncidentTable(categorizedData[timeframe].table);
        updateMostAffectedLocation(categorizedData[timeframe].table);
    }
    
    function updateLineChart(data, timeframe) {
        const labels = timeframe === "weekly" 
            ? ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"] 
            : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
        if (lineChart) {
            lineChart.destroy();
        }
    
        lineChart = new Chart(ctxLine, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Incident Count",
                    data: data,
                    borderColor: "rgba(75, 192, 192, 1)",
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
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
