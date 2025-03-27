document.addEventListener("DOMContentLoaded", function () {
    const ctxLine = document.getElementById("lineChart").getContext("2d");
    const ctxPie = document.getElementById("pieChart").getContext("2d");
    const incidentCount = document.getElementById("incident-count");
    const timeframeSelect = document.getElementById("timeframe");
    const incidentTable = document.getElementById("incident-table");
    
    let lineChart, pieChart;
    const eventTypes = ["landslide", "flood", "fire", "smoke", "collision", "earthquake"];
    
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
    
        data.forEach(incident => {
            const { date, time } = parseCustomDateTime(incident.detected_at);
            const category = determineCategory(new Date(date), today);
            updateCategorizedData(categorizedData, category, incident, date, time, today);
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
        if (eventIndex !== -1) categorizedData[category].events[eventIndex]++;
    
        // Track history data
        const incidentDate = new Date(date);
        if (category === "weekly") {
            let weekNum = Math.floor((today - incidentDate) / (1000 * 60 * 60 * 24 * 7));
            weekNum = Math.max(0, Math.min(4, weekNum)); // Limit to 5 weeks
            categorizedData[category].history[weekNum]++;
        } else if (category === "monthly") {
            let monthNum = incidentDate.getMonth();
            categorizedData[category].history[monthNum]++;
        }
    }
    
    function updateUI(categorizedData, timeframe) {
        incidentCount.textContent = categorizedData[timeframe].count;
        updateLineChart(categorizedData[timeframe].history, timeframe);
        updatePieChart(categorizedData[timeframe].events);
        updateIncidentTable(categorizedData[timeframe].table);
    }
    
    function updateLineChart(data, timeframe) {
        const labels = timeframe === "weekly" 
            ? ["Last 5 Weeks", "Week 4", "Week 3", "Week 2", "This Week"] 
            : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
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
    
    timeframeSelect.addEventListener("change", () => fetchData(timeframeSelect.value));
    fetchData("weekly");

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
