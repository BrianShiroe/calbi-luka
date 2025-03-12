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
            weekly: { count: 0, history: [0, 0, 0, 0, 0], events: [0, 0, 0, 0, 0], table: [] },
            monthly: { count: 0, history: [0, 0, 0, 0, 0], events: [0, 0, 0, 0, 0], table: [] }
        };
    
        const eventTypes = ["Landslide", "Flood", "Fire", "Car Crash", "Earthquake"];
        const today = new Date();
        
        data.forEach(incident => {
            const incidentDate = new Date(incident.date);
            let category = "weekly";
    
            // Categorize into weekly or monthly
            if ((today - incidentDate) / (1000 * 60 * 60 * 24) > 7) {
                category = "monthly";
            } else if ((today - incidentDate) / (1000 * 60 * 60 * 24) > 1) {
                category = "weekly";
            }
    
            categorizedData[category].count++;
            categorizedData[category].table.push([incident.date, incident.type, incident.location, incident.time]);
    
            const eventIndex = eventTypes.indexOf(incident.type);
            if (eventIndex !== -1) {
                categorizedData[category].events[eventIndex]++;
            }
    
            // Populate history for line chart
            if (category === timeframe) {
                let timeIndex = Math.min(Math.floor((today - incidentDate) / (1000 * 60 * 60 * 24)), 4);
                categorizedData[category].history[timeIndex] = (categorizedData[category].history[timeIndex] || 0) + 1;
            }
        });
    
        incidentCount.textContent = categorizedData[timeframe].count;
        updateLineChart(categorizedData[timeframe].history, timeframe);
        updatePieChart(categorizedData[timeframe].events);
        updateIncidentTable(categorizedData[timeframe].table);
    }
    
    function updateLineChart(data, timeframe) {
        if (!ctxLine) {
            console.error("Canvas context is missing for line chart.");
            return;
        }
    
        const labels = 
            timeframe === "weekly"
            ? ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]
            : ["January", "February", "March", "April", "June"];
    
        if (lineChart) {
            lineChart.data.labels = labels;
            lineChart.data.datasets[0].data = data;
            lineChart.update();
        } else {
            lineChart = new Chart(ctxLine, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: `Detected Incidents`,
                        data: data,
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
                },
                animation: {
                    duration: 0
                }
            });
        }
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
            },
            animation: {
                duration:0
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

    fetchData("weekly");

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
});