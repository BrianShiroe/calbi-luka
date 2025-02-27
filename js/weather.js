async function fetchWeather() {
    const currentWeatherContainer = document.querySelector(".current-weather-card");
    const weatherCardsContainer = document.querySelector(".weather-cards");

    try {
        const indexResponse = await fetch("../json/data-list.json");
        if (!indexResponse.ok) throw new Error(`HTTP error! Status: ${indexResponse.status}`);
        const indexData = await indexResponse.json();

        weatherCardsContainer.innerHTML = ""; 
        currentWeatherContainer.innerHTML = ""; 

        let latestData = null;

        // Reverse files so the last added file is treated as the latest
        const reversedFiles = [...indexData.files].reverse();

        for (let i = 0; i < reversedFiles.length; i++) {
            const file = reversedFiles[i];
            const response = await fetch(`../json/${file}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            if (!data.city || !data.temperature) continue;

            if (i === 0) {
                // Store the latest data (last added file)
                latestData = data;
            } else {
                // Append previous data to weather cards
                const card = document.createElement("div");
                card.classList.add("weather-card");
                card.innerHTML = `
                    <h2 class="city">${data.city}</h2>
                    <p class="time">${data.time || "--"}</p>
                    <p class="condition">${data.condition || "--"}</p>
                    <div class="weather-icon">${data.icon || "🌥️"}</div>
                    <h1 class="temperature">${data.temperature ? data.temperature + "°" : "--°"}</h1>
                    <div class="details">
                        <p>PM2.5: <span>${data.pm25 || "--"}</span></p>
                        <p>Sunrise: <span>${data.sunrise || "--"}</span></p>
                        <p>Wind: <span>${data.wind_speed || "--"}</span></p>
                    </div>
                `;
                weatherCardsContainer.appendChild(card);
            }
        }

        if (latestData) {
            // Update the current weather card dynamically
            currentWeatherContainer.innerHTML = `
                <svg fill="none" viewBox="0 0 342 175" height="170" width="342" class="background">
                    <path fill="url(#paint0_linear_103_640)" d="M0 66.4396C0 31.6455 0 14.2484 11.326 5.24044C22.6519 -3.76754 39.6026 0.147978 73.5041 7.97901L307.903 62.1238C324.259 65.9018 332.436 67.7909 337.218 73.8031C342 79.8154 342 88.2086 342 104.995V131C342 151.742 342 162.113 335.556 168.556C329.113 175 318.742 175 298 175H44C23.2582 175 12.8873 175 6.44365 168.556C0 162.113 0 151.742 0 131V66.4396Z"></path>
                    <defs>
                        <linearGradient gradientUnits="userSpaceOnUse" y2="128" x2="354.142" y1="128" x1="0" id="paint0_linear_103_640">
                        <stop stop-color="#453cc6"></stop>
                        <stop stop-color="#362A84" offset="1"></stop>
                        </linearGradient>
                    </defs>
                </svg>
                <h1 class="main-text">${latestData.temperature}°</h1>
                <div class="info-left" style="font-size:18px;">
                    <p>${latestData.city}</p>
                    <p class="text-gray">PM2.5 : ${latestData.pm25 || "--"}  Wind : ${latestData.wind_speed || "--"}°</p>
                </div>
                <div class="info-right">${latestData.condition || "--"}</div>
            `;
        }
    } catch (error) {
        console.error("Error in fetchWeather:", error);
    }
}

// Ensure script runs after DOM is fully loaded
window.onload = fetchWeather;