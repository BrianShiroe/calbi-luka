document.addEventListener("DOMContentLoaded", function () {
    const ctxLine = document.getElementById("lineChart").getContext("2d");
    const ctxPie = document.getElementById("pieChart").getContext("2d");
    const incidentCount = document.getElementById("incident-count");
    const timeframeSelect = document.getElementById("timeframe");
    const incidentTable = document.getElementById("incident-table");
    const activityList = document.getElementById("activity-list");

    let lineChart, pieChart;

    function fetchData(timeframe) {
        fetch("../json/incident-report/table-report.json")
            .then(response => response.json())
            .then(data => processIncidentData(data, timeframe))
            .catch(error => console.error("Error loading incident data:", error));
    }

    function processIncidentData(data, timeframe) {
        const categorizedData = {
            daily: { count: 0, history: [], events: [0, 0, 0, 0, 0], table: [] },
            weekly: { count: 0, history: [], events: [0, 0, 0, 0, 0], table: [] },
            monthly: { count: 0, history: [], events: [0, 0, 0, 0, 0], table: [] }
        };

        data.forEach(incident => {
            let category = "daily";

            if (incident.date.startsWith("2025-03-02")) category = "weekly";
            if (incident.date.startsWith("2025-03-03")) category = "monthly";

            categorizedData[category].count++;
            categorizedData[category].table.push([incident.date, incident.type, incident.location, incident.status]);

            const eventTypes = ["Landslide", "Flood", "Fire", "Car Crash", "Earthquake"];
            const index = eventTypes.indexOf(incident.type);
            if (index !== -1) {
                categorizedData[category].events[index]++;
            }
        });

        incidentCount.textContent = categorizedData[timeframe].count;
        updateLineChart(categorizedData[timeframe].history);
        updatePieChart(categorizedData[timeframe].events);
        updateIncidentTable(categorizedData[timeframe].table);
    }

    function updateLineChart(data) {
        if (lineChart) lineChart.destroy();
        lineChart = new Chart(ctxLine, {
            type: "line",
            data: {
                labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
                datasets: [{
                    label: "Incidents Over Time",
                    data: data,
                    borderColor: "#fff",
                    backgroundColor: "#383197",
                    fill: true
                }]
            }
        });
    }

    function updatePieChart(data) {
        if (pieChart) pieChart.destroy();
        pieChart = new Chart(ctxPie, {
            type: "doughnut",
            data: {
                labels: ["Landslide", "Flood", "Fire", "Car Crash", "Earthquake"],
                datasets: [{
                    data: data,
                    backgroundColor: ["#a9a4a4", "#027fff", "#b7d2e4", "#392e96", "#bdfffe"],
                    borderColor: ["#fff"],
                }]
            },
            options: {
                cutout: "80%",
                responsive: true,
                plugins: {
                    legend: {
                        position: "bottom"
                    }                 
                }
            }
        });
    }    

    function updateIncidentTable(data) {
        incidentTable.innerHTML = "";
        data.forEach(row => {
            let tr = document.createElement("tr");
            row.forEach(cell => {
                let td = document.createElement("td");
                td.textContent = cell;
                tr.appendChild(td);
            });
            incidentTable.appendChild(tr);
        });
    }

    timeframeSelect.addEventListener("change", () => {
        fetchData(timeframeSelect.value);
    });

    fetchData("daily");

    // Tab Switching
    const tabs = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".tab-content");

    // Store currently active tab
    let activeTab = document.querySelector(".tab-content.active");

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            tabs.forEach(t => t.classList.remove("active"));
            this.classList.add("active");

            const targetContent = document.getElementById(this.dataset.tab);

            // Only hide the previously active tab if it's different
            if (activeTab && activeTab !== targetContent) {
                activeTab.classList.remove("active");
            }

            // Show new active tab
            targetContent.classList.add("active");

            // Update activeTab reference
            activeTab = targetContent;
        });
    });   

    // Sample Data with timestamps
    const activities = [
        { event: "Fire reported in Zone 3", time: "12:45 PM" },
        { event: "Flood alert in Barangay Santa Rita", time: "11:30 AM" },
        { event: "Landslide detected in Highway 2", time: "10:15 AM" },
        { event: "Car crash near City Center", time: "9:50 AM" },
        { event: "Earthquake tremors recorded at 3.2 magnitude", time: "8:20 AM" }
    ];

    // Function to populate Recent Activity UI
    function loadRecentActivities() {
        const activityList = document.getElementById("activity-list");
        activityList.innerHTML = ""; // Clear existing content

        activities.forEach(activity => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <div class="activity-item">
                    <p>${activity.event}</p>
                    <span class="activity-time" style="font-size:10px;">${activity.time}</span>
                </div>
            `;
            activityList.appendChild(listItem);
        });
    }
    // Load Activities on Page Load
    window.onload = loadRecentActivities;

});