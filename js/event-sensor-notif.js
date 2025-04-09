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