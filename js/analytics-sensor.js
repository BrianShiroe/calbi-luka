document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
            
            // Force chart resize when tab becomes visible
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);
        });
    });

    document.querySelectorAll(".sensor-chart-tab-button").forEach(button => {
        button.addEventListener("click", () => {
            const tabId = button.getAttribute("data-tab");
    
            // Toggle active button
            document.querySelectorAll(".sensor-chart-tab-button").forEach(btn => 
                btn.classList.remove("active")
            );
            button.classList.add("active");
    
            // Toggle chart tabs
            document.querySelectorAll(".sensor-chart-tab").forEach(tab => 
                tab.classList.remove("active")
            );
            document.getElementById(tabId).classList.add("active");
        });
    });
    

    // Common chart options
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#333',
                    font: {
                        size: 12
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#666'
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                ticks: {
                    color: '#666'
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            }
        }
    };

    const rainfallChart = new Chart(document.getElementById('rainfallChart'), {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Rainfall (mm)',
                data: Array.from({length: 24}, () => Math.random() * 10),
                borderColor: 'rgba(117, 130, 193, 0.7)',
                backgroundColor: 'rgba(52, 93, 168, 0.17)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Millimeters (mm)',
                        color: '#666'
                    }
                }
            }
        }
    });

    const seismicChart = new Chart(document.getElementById('seismicChart'), {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Seismic Activity (Magnitude)',
                data: Array.from({length: 24}, () => Math.random() * 3),
                backgroundColor: 'rgba(157, 168, 249, 0.7)',
                borderColor: 'rgba(65, 78, 174, 0.7)',
                borderWidth: 3
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Magnitude',
                        color: '#666'
                    }
                }
            }
        }
    });

    // Function to update overview data
    async function updateOverviewData() {
        try {
            // Fetch camera data
            const camerasResponse = await fetch('/get_devices');
            const cameras = await camerasResponse.json();
            document.getElementById('cameras-active').textContent = cameras.length;
            
            // Fetch sensor status
            document.getElementById('iot-sensors').textContent = '3'; // Hardcoded for demo
            
            // Fetch all incidents
            const incidentsResponse = await fetch('/get_alerts');
            const allIncidents = await incidentsResponse.json();
            
            // Filter incidents from this week
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thisWeekIncidents = allIncidents.filter(incident => {
                const incidentDate = new Date(incident.detected_at);
                return incidentDate >= oneWeekAgo;
            });
            
            // Update counts
            document.getElementById('incident-count').textContent = allIncidents.length;
            document.getElementById('incident-this-week-count').textContent = thisWeekIncidents.length;
            
            // Calculate most affected location
            const locationCounts = {};
            allIncidents.forEach(incident => {
                locationCounts[incident.location] = (locationCounts[incident.location] || 0) + 1;
            });
            
            let mostAffectedLocation = '--';
            let maxCount = 0;
            for (const [location, count] of Object.entries(locationCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    mostAffectedLocation = location;
                }
            }
            document.getElementById('most-affected-location-name').textContent = mostAffectedLocation;
            
            // Update line chart (last 7 days)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayCounts = [0, 0, 0, 0, 0, 0, 0];
            
            thisWeekIncidents.forEach(incident => {
                const incidentDate = new Date(incident.detected_at);
                const dayOfWeek = incidentDate.getDay();
                dayCounts[dayOfWeek]++;
            });
            
            // Update pie chart (incident types)
            const typeCounts = {};
            allIncidents.forEach(incident => {
                const types = incident.event_type.split('_');
                types.forEach(type => {
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                });
            });
            
        } catch (error) {
            console.error('Error updating overview data:', error);
        }
    }
    
    // Function to update incident table
    

    // Function to update sensor data
    async function updateSensorData() {
        try {
            const response = await fetch('/sensor/fetch_data');
            const data = await response.json();
            
            if (data && data.length > 0) {
                // Update connection status
                document.getElementById('sensor-connection-status').className = 'status-online';
                document.getElementById('sensor-connection-status').textContent = 'Online';
                
                // Update last updated time
                const now = new Date();
                document.getElementById('last-updated').textContent = `Last updated: ${now.toLocaleTimeString()}`;
                
                // Get latest reading
                const latest = data[0];
                
                // Update current values
                document.getElementById('temperature-value').textContent = `${latest.temperature.toFixed(1)} °C`;
                document.getElementById('humidity-value').textContent = `${latest.humidity.toFixed(1)} %`;
                document.getElementById('rainfall-value').textContent = `${latest.rainfall_mm.toFixed(1)} mm`;
                document.getElementById('seismic-value').textContent = `${latest.earthquake_magnitude.toFixed(1)} M`;
                
                // Update charts
                const timestamps = data.map(row => new Date(row.timestamp * 1000).toLocaleTimeString()).reverse();
                const rainfall = data.map(row => row.rainfall_mm).reverse();
                const seismic = data.map(row => row.earthquake_magnitude).reverse();
                
                rainfallChart.data.labels = timestamps;
                rainfallChart.data.datasets[0].data = rainfall;
                rainfallChart.update();
                
                seismicChart.data.labels = timestamps;
                seismicChart.data.datasets[0].data = seismic;
                seismicChart.update();
                
                // Check for alerts
                checkForAlerts(latest);
            }
            
            // Get stats
            const statsResponse = await fetch('/sensor/stats');
            const stats = await statsResponse.json();
            
            // Update stats
            document.getElementById('temp-max').textContent = `${stats.temperature.max.toFixed(1)}°C`;
            document.getElementById('temp-min').textContent = `${stats.temperature.min.toFixed(1)}°C`;
            document.getElementById('humidity-max').textContent = `${stats.humidity.max.toFixed(1)}%`;
            document.getElementById('humidity-min').textContent = `${stats.humidity.min.toFixed(1)}%`;
            document.getElementById('rainfall-max').textContent = `${stats.rainfall_mm.max.toFixed(1)}mm`;
            document.getElementById('rainfall-min').textContent = `${stats.rainfall_mm.min.toFixed(1)}mm`;
            document.getElementById('seismic-max').textContent = `${stats.earthquake_magnitude.max.toFixed(1)}M`;
            document.getElementById('seismic-min').textContent = `${stats.earthquake_magnitude.min.toFixed(1)}M`;
            
        } catch (error) {
            console.error('Error fetching sensor data:', error);
            document.getElementById('sensor-connection-status').className = 'status-offline';
            document.getElementById('sensor-connection-status').textContent = 'Offline';
        }
    }
    
    // Function to check for alert conditions
    function checkForAlerts(data) {
        const alertList = document.getElementById('sensor-alert-list');
        alertList.innerHTML = '';
        
        // Check for earthquake alert
        if (data.earthquake_magnitude > 3.0) {
            addAlert('Earthquake Alert', `Magnitude ${data.earthquake_magnitude.toFixed(1)} detected`, 'seismic');
        }
        
        // Check for flood alert
        if (data.rainfall_mm > 50.0) {
            addAlert('Flood Alert', `${data.rainfall_mm.toFixed(1)}mm of rainfall`, 'rain');
        }
        
        // Check for extreme temperature
        if (data.temperature > 35.0 || data.temperature < 0.0) {
            const type = data.temperature > 35.0 ? 'High' : 'Low';
            addAlert('Temperature Alert', `${type} temperature: ${data.temperature.toFixed(1)}°C`, 'temp');
        }
        
        if (alertList.children.length === 0) {
            alertList.innerHTML = '<div class="no-alerts">No recent alerts</div>';
        }
    }
    
    function addAlert(title, message, type) {
        const alertList = document.getElementById('sensor-alert-list');
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-item ${type}`;
        alertDiv.innerHTML = `
            <div class="alert-icon">
                <i class='bx ${getAlertIcon(type)}'></i>
            </div>
            <div class="alert-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <span class="alert-time">${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        alertList.prepend(alertDiv);
    }
    
    function getAlertIcon(type) {
        switch(type) {
            case 'seismic': return 'bx-shield-quarter';
            case 'rain': return 'bx-cloud-rain';
            case 'temp': return 'bx-thermometer';
            default: return 'bx-bell';
        }
    }

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#incident-table tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let matches = false;
            
            cells.forEach(cell => {
                if (cell.textContent.toLowerCase().includes(searchTerm)) {
                    matches = true;
                }
            });
            
            row.style.display = matches ? '' : 'none';
        });
    });

    // Initial updates
    updateOverviewData();
    updateSensorData();
    
    // Set up periodic updates
    setInterval(updateOverviewData, 30000); // Every 30 seconds
    setInterval(updateSensorData, 5000); // Every 5 seconds
    
    // Improved resize handling
    function handleResize() {
        rainfallChart.resize();
        seismicChart.resize();
    }

    // Debounce the resize event
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 200);
    });

    // Initial resize
    window.addEventListener('load', function() {
        setTimeout(handleResize, 500);
    });
});