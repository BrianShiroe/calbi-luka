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
    const firstButton = document.getElementById("first-page");
    const lastButton = document.getElementById("last-page");
    const next10Button = document.getElementById("next-10-pages");
    const next100Button = document.getElementById("next-100-pages");
    const prev10Button = document.getElementById("prev-10-pages");  // Previous 10 Pages
    const prev100Button = document.getElementById("prev-100-pages");  // Previous 100 Pages
    const pageInfo = document.getElementById("page-info");
    const activeAnalyticsTab = localStorage.getItem('activeTab') || 'overview'; // Default to 'overview' if no tab is stored
    
    let lineChart, pieChart;
    let eventTypes = [];
    let currentPage = 1;
    const rowsPerPage = 10;
    let incidentData = []; // Stores the table data
    
    function fetchData(timeframe) {
        fetch("/api/incidents")
            .then(response => response.json())
            .then(data => {
                updateEventTypes(data);
                processIncidentData(data, timeframe);
            })
            .catch(error => console.error("Error loading incident data:", error));
    }

    function updateEventTypes(data) {
        const uniqueEvents = new Set(data.map(incident => incident.event_type));
        eventTypes = Array.from(uniqueEvents);
    }

    function setupTabs() {
        const tabs = document.querySelectorAll(".tab-button");
        const contents = document.querySelectorAll(".tab-content");
    
        // Retrieve the active tab from localStorage (if any)
        let activeAnalyticsTab = localStorage.getItem('activeAnalyticsTab') || '';
    
        // Set the active tab from localStorage
        if (activeAnalyticsTab) {
            const activeTabButton = document.querySelector(`.tab-button[data-tab="${activeAnalyticsTab}"]`);
            const targetContent = document.getElementById(activeAnalyticsTab);
    
            if (activeTabButton && targetContent) {
                tabs.forEach(tab => tab.classList.remove("active"));
                activeTabButton.classList.add("active");
                contents.forEach(content => content.classList.remove("active"));
                targetContent.classList.add("active");
            }
        } else {
            // If no tab is saved in localStorage, set the first tab as active by default
            if (tabs.length > 0 && contents.length > 0) {
                tabs[0].classList.add("active");
                contents[0].classList.add("active");
            }
        }
    
        // Event listener for each tab button
        tabs.forEach(tab => {
            tab.addEventListener("click", function () {
                // Remove 'active' class from all tabs
                tabs.forEach(t => t.classList.remove("active"));
                this.classList.add("active");
    
                // Show the corresponding tab content
                const targetContent = document.getElementById(this.dataset.tab);
                contents.forEach(content => content.classList.remove("active"));
                targetContent.classList.add("active");
    
                // Store the active tab in localStorage
                localStorage.setItem('activeAnalyticsTab', this.dataset.tab);
            });
        });
    }
    setupTabs();
    
    function parseCustomDateTime(detected_at) {
        const [datePart, timePart] = detected_at.split("_");
        const [month, day, year] = datePart.split("-").map(num => parseInt(num, 10));
        let [time, meridian] = [timePart.slice(0, -2), timePart.slice(-2)];
        let [hours, minutes] = time.split("-").map(num => parseInt(num, 10));
        
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
        categorizedData[category].table.push([date, time, incident.event_type, incident.camera_title, incident.location]);
    
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

    // Load the persisted timeframe from localStorage when the page loads
    function loadPersistedTimeframe() {
        const savedTimeframe = localStorage.getItem("selectedTimeframe");
        if (savedTimeframe) {
            timeframeSelect.value = savedTimeframe; // Set the dropdown to the saved value
            fetchData(savedTimeframe); // Fetch data based on the saved timeframe
        } else {
            // If no saved timeframe, use a default value, e.g., "weekly"
            timeframeSelect.value = "weekly";
            fetchData("weekly");
        }
    }

    // Call this function when the page loads
    loadPersistedTimeframe();
    
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
    
    function updateUI(categorizedData, timeframe) {
        incidentCount.textContent = categorizedData[timeframe].count;
        updateIncidentThisWeekCount(categorizedData);
        updateLineChart(categorizedData[timeframe].history, timeframe);
    
        // Ensure pie chart data is aligned with eventTypes
        const alignedEventData = eventTypes.map(type => {
            return categorizedData[timeframe].table.filter(row => row[2] === type).length;
        });
    
        updatePieChart(alignedEventData);
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
    
        const hasData = data.some(value => value > 0);
        const chartData = hasData ? data : [1];
        const chartLabels = hasData ? eventTypes : ["No Data"];
        const chartColors = ["#87b6d6", "#8a93a4", "#27405e", "#4BC0C0", "#e2e4da"];
    
        let maxIndex = data.indexOf(Math.max(...data));
        let mostFrequentEvent = hasData ? eventTypes[maxIndex] : "No Data";
    
        const eventImages = {
            "fire": "../img/fire.png",
            "smoke": "../img/smoke.png",
            "collision": "../img/collision.png",
            "landslide": "../img/landslide.png",
            "flood": "flood.png"
        };
    
        let eventImageSrc = eventImages[mostFrequentEvent] || "../img/default-obj-img.png";
        let eventImage = new Image();
        eventImage.src = eventImageSrc;
    
        eventImage.onload = function () {
            drawChart(eventImage);
        };
    
        eventImage.onerror = function () {
            eventImage.src = "../img/default-obj-img.png";
            drawChart(eventImage);
        };
    
        function drawChart(image) {
            pieChart = new Chart(ctxPie, {
                type: "doughnut",
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartData,
                        backgroundColor: chartColors,
                        borderColor: "#fff"
                    }]
                },
                options: {
                    cutout: "90%",
                    responsive: true,
                    plugins: {
                        legend: { position: "bottom" }
                    },
                    animation: { duration: 800, easing: "easeInOutCubic" }
                },
                plugins: [{
                    afterDraw: function (chart) {
                        let ctx = chart.ctx;
                        let width = chart.width;
                        let height = chart.height;
    
                        ctx.restore();
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
    
                        let titleX = width / 2;
                        let titleY = 60;
                        ctx.font = "16px Montserrat";
                        ctx.fillStyle = "#333";
                        ctx.fillText("Most Frequent Event", titleX, titleY);
    
                        let imgSize = 160;
                        let imgX = (width / 2) - (imgSize / 2);
                        let imgY = (height / 3) - (imgSize / 3.5);
    
                        ctx.drawImage(image, imgX, imgY, imgSize, imgSize);
    
                        ctx.font = "bold 14px Montserrat";
                        ctx.fillStyle = "#555";
                        ctx.fillText(mostFrequentEvent, width / 2, imgY + imgSize + 10);
    
                        ctx.save();
                    }
                }]
            });
        }
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
            incidentTable.innerHTML = "<tr><td colspan='5'>No data available</td></tr>";
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
                for (let j = 0; j < 5; j++) { // Now 5 columns
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
        firstButton.disabled = currentPage === 1;
        lastButton.disabled = currentPage === totalPages;
        next10Button.disabled = currentPage + 10 > totalPages;
        next100Button.disabled = currentPage + 100 > totalPages;
        prev10Button.disabled = currentPage <= 10;
        prev100Button.disabled = currentPage <= 100;
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
    
    firstButton.addEventListener("click", () => {
        currentPage = 1;
        renderTable();
    });
    
    lastButton.addEventListener("click", () => {
        currentPage = Math.ceil(incidentData.length / rowsPerPage);
        renderTable();
    });
    
    next10Button.addEventListener("click", () => {
        const totalPages = Math.ceil(incidentData.length / rowsPerPage);
        if (currentPage + 10 <= totalPages) {
            currentPage += 10;
            renderTable();
        }
    });
    
    next100Button.addEventListener("click", () => {
        const totalPages = Math.ceil(incidentData.length / rowsPerPage);
        if (currentPage + 100 <= totalPages) {
            currentPage += 100;
            renderTable();
        }
    });
    
    prev10Button.addEventListener("click", () => {
        if (currentPage > 10) {
            currentPage -= 10;
            renderTable();
        }
    });
    
    prev100Button.addEventListener("click", () => {
        if (currentPage > 100) {
            currentPage -= 100;
            renderTable();
        }
    });
    
    // Persist the selected timeframe when it changes
    timeframeSelect.addEventListener("change", () => {
        const selectedTimeframe = timeframeSelect.value;
        // Save the selected timeframe to localStorage
        localStorage.setItem("selectedTimeframe", selectedTimeframe);
        fetchData(selectedTimeframe);
    });

    document.querySelector('#export-current').addEventListener('click', () => {
        exportTableToExcel(currentPageData(), `page${currentPage}_incident_data.xlsx`);
    });
    
    document.querySelector('#export-whole').addEventListener('click', () => {
        exportTableToExcel(incidentData, 'whole_incident_data.xlsx'); // Export the whole dataset
    });
    
    function exportTableToExcel(dataToExport, filename) {
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // Create an array of table rows, including the header
        const rowData = [];
        
        // Get table headers dynamically from the table
        const headers = [];
        const table = document.getElementById("incident-table-container");
        table.querySelectorAll('th').forEach(header => {
            headers.push(header.textContent.trim());
        });
        rowData.push(headers);
    
        // Use the passed data (for current page or whole table)
        dataToExport.forEach(row => {
            const rowCells = [];
            row.forEach(cell => {
                rowCells.push(cell); // Add each cell's data
            });
            rowData.push(rowCells);
        });
        
        // Convert rowData into a worksheet
        const ws = XLSX.utils.aoa_to_sheet(rowData);
        
        // Set the column widths for columns 1 to 4 to 130 pixels (roughly 17 characters wide each)
        ws['!cols'] = [
            { wch: 13 }, // Column 1
            { wch: 13 }, // Column 2
            { wch: 13 }, // Column 3
            { wch: 13 }, // Column 4
            { wch: 13 }, // Column 5
        ];
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Incident Data');
        
        // Write workbook to Excel file and download
        XLSX.writeFile(wb, filename); // Use dynamic filename
    }
    
    function currentPageData() {
        // Get the rows for the current page from incidentData
        const totalRows = incidentData.length;
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return incidentData.slice(start, end); // Return rows for the current page
    }    

    document.getElementById('searchInput').addEventListener('keyup', function () {
        let filter = this.value.toUpperCase();
        let table = document.getElementById("incident-table");
        let tr = table.getElementsByTagName("tr");
        for (let i = 0; i < tr.length; i++) {
            let tdArray = tr[i].getElementsByTagName("td");
            let found = false;
            for (let j = 0; j < tdArray.length; j++) {
                if (tdArray[j] && tdArray[j].innerHTML.toUpperCase().indexOf(filter) > -1) {
                    found = true;
                    break;
                }
            }
            tr[i].style.display = found ? "" : "none";
        }
    });
    
    document.addEventListener("click", function(event) {
        var dropdown = document.getElementById("exportDropdown");
        var button = document.getElementById("exportButton");
        if (!button.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.style.display = "none";
        }
    });
});