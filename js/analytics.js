document.addEventListener("DOMContentLoaded", function () {
    const ctxLine = document.getElementById("lineChart").getContext("2d");
    const ctxPie = document.getElementById("pieChart").getContext("2d");
    const incidentCount = document.getElementById("incident-count");
    const timeframeSelect = document.getElementById("timeframe");

    let lineChart, pieChart;

    function fetchData(timeframe) {
        // Simulating fetched data
        const sampleData = {
            daily: { count: 5, history: [1, 3, 2, 5, 6], events: [30, 20, 15, 25, 10] },
            weekly: { count: 40, history: [5, 10, 7, 8, 10], events: [25, 30, 20, 15, 10] },
            monthly: { count: 150, history: [20, 30, 40, 25, 35], events: [20, 25, 30, 15, 10] },
        };

        const data = sampleData[timeframe];
        incidentCount.textContent = data.count;

        updateLineChart(data.history);
        updatePieChart(data.events);
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
                    borderColor: "#5936B4",
                    backgroundColor: "rgba(89, 54, 180, 0.5)",
                    fill: true
                }]
            }
        });
    }

    function updatePieChart(data) {
        if (pieChart) pieChart.destroy();
        pieChart = new Chart(ctxPie, {
            type: "pie",
            data: {
                labels: ["Landslide", "Flood", "Fire", "Car Crash", "Earthquake"],
                datasets: [{
                    data: data,
                    backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]
                }]
            }
        });
    }

    timeframeSelect.addEventListener("change", () => {
        fetchData(timeframeSelect.value);
    });

    fetchData("daily"); // Load initial data
});
