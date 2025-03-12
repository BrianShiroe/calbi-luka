document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("change", function() {
        document.querySelectorAll(".settings-panel").forEach(panel => panel.style.display = "none");
        if (this.id === "tab1") document.getElementById("general-settings").style.display = "block";
        if (this.id === "tab2") document.getElementById("account-settings").style.display = "block";
        if (this.id === "tab3") document.getElementById("security-settings").style.display = "block";
    });
});

// General Settings
document.addEventListener("DOMContentLoaded", function () {
    // Get elements
    const detectionToggle = document.getElementById("toggle-detection");
    const boundingBoxToggle = document.getElementById("toggle-bounding-box");
    const performanceMetricsToggle = document.getElementById("toggle-performance-metrics");
    const confidenceLevel = document.getElementById("confidence-level");
    const confidenceValue = document.getElementById("confidence-level-value");
    const frameRate = document.getElementById("frame-rate");
    const frameRateValue = document.getElementById("frame-rate-value");
    const updateMetricInterval = document.getElementById("update-metric-interval");
    const updateMetricIntervalValue = document.getElementById("update-metric-interval-value");
    const metricFontSize = document.getElementById("metric-font-size");
    const metricFontSizeValue = document.getElementById("metric-font-size-value");
    const targetObject = document.getElementById("target-object");
    const saveBtn = document.querySelector(".save-btn");
    const cancelBtn = document.querySelector(".cancel-btn");
    const resetBtn = document.querySelector(".reset-btn");

    // Default values (matching Python defaults)
    const defaultSettings = {
        detection_mode: true,
        show_bounding_box: true,
        performance_metrics_toggle: true,
        confidence_level: 70, // 0.7 * 100
        frame_rate: 60, // max_frame_rate default
        update_metric_interval: 1,
        metric_font_size: 8,
        target_object: "car"
    };

    // Function to update range values dynamically
    function updateRangeValue(input, output, suffix) {
        input.addEventListener("input", () => {
            output.textContent = `${input.value}${suffix}`;
        });
    }

    updateRangeValue(confidenceLevel, confidenceValue, "%");
    updateRangeValue(frameRate, frameRateValue, " FPS");
    updateRangeValue(updateMetricInterval, updateMetricIntervalValue, "s");
    updateRangeValue(metricFontSize, metricFontSizeValue, "px");

    // Load settings from localStorage or use defaults
    function loadSettings() {
        detectionToggle.checked = JSON.parse(localStorage.getItem("detection_mode")) ?? defaultSettings.detection_mode;
        boundingBoxToggle.checked = JSON.parse(localStorage.getItem("show_bounding_box")) ?? defaultSettings.show_bounding_box;
        performanceMetricsToggle.checked = JSON.parse(localStorage.getItem("performance_metrics_toggle")) ?? defaultSettings.performance_metrics_toggle;
        confidenceLevel.value = localStorage.getItem("confidence_level") ?? defaultSettings.confidence_level;
        confidenceValue.textContent = `${confidenceLevel.value}%`;
        frameRate.value = localStorage.getItem("frame_rate") ?? defaultSettings.frame_rate;
        frameRateValue.textContent = `${frameRate.value} FPS`;
        updateMetricInterval.value = localStorage.getItem("update_metric_interval") ?? defaultSettings.update_metric_interval;
        updateMetricIntervalValue.textContent = `${updateMetricInterval.value}s`;
        metricFontSize.value = localStorage.getItem("metric_font_size") ?? defaultSettings.metric_font_size;
        metricFontSizeValue.textContent = `${metricFontSize.value}px`;
        targetObject.value = localStorage.getItem("target_object") ?? defaultSettings.target_object;
    }

    loadSettings();

    // Save settings function
    function saveSettings() {
        const confidenceDecimal = confidenceLevel.value / 100; // Convert to decimal for backend

        localStorage.setItem("detection_mode", detectionToggle.checked);
        localStorage.setItem("show_bounding_box", boundingBoxToggle.checked);
        localStorage.setItem("performance_metrics_toggle", performanceMetricsToggle.checked);
        localStorage.setItem("confidence_level", confidenceLevel.value);
        localStorage.setItem("frame_rate", frameRate.value);
        localStorage.setItem("update_metric_interval", updateMetricInterval.value);
        localStorage.setItem("metric_font_size", metricFontSize.value);
        localStorage.setItem("target_object", targetObject.value);

        fetch("/toggle_model", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: detectionToggle.checked }),
        });

        fetch("/toggle_bounding_box", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: boundingBoxToggle.checked }),
        });

        fetch("/toggle_performance_metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: performanceMetricsToggle.checked }),
        });

        fetch("/set_confidence_level", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confidence: confidenceDecimal }),
        });

        fetch("/set_max_frame_rate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ max_frame_rate: frameRate.value }),
        });

        fetch("/set_update_metric_interval", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interval: updateMetricInterval.value }),
        });

        fetch("/set_metric_font_size", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ size: metricFontSize.value }),
        });

        fetch("/set_target_object", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: targetObject.value }),
        });

        alert("Settings saved successfully!");
    }

    // Cancel function (restore previous values)
    function cancelSettings() {
        loadSettings();
        alert("Changes discarded.");
    }

    // Reset function (restore default values)
    function resetSettings() {
        // Reset to default values
        detectionToggle.checked = defaultSettings.detection_mode;
        boundingBoxToggle.checked = defaultSettings.show_bounding_box;
        performanceMetricsToggle.checked = defaultSettings.performance_metrics_toggle;
        confidenceLevel.value = defaultSettings.confidence_level;
        confidenceValue.textContent = `${defaultSettings.confidence_level}%`;
        frameRate.value = defaultSettings.frame_rate;
        frameRateValue.textContent = `${defaultSettings.frame_rate} FPS`;
        updateMetricInterval.value = defaultSettings.update_metric_interval;
        updateMetricIntervalValue.textContent = `${defaultSettings.update_metric_interval}s`;
        metricFontSize.value = defaultSettings.metric_font_size;
        metricFontSizeValue.textContent = `${defaultSettings.metric_font_size}px`;
        targetObject.value = defaultSettings.target_object;

        // Update localStorage with default values
        localStorage.setItem("detection_mode", defaultSettings.detection_mode);
        localStorage.setItem("show_bounding_box", defaultSettings.show_bounding_box);
        localStorage.setItem("performance_metrics_toggle", defaultSettings.performance_metrics_toggle);
        localStorage.setItem("confidence_level", defaultSettings.confidence_level);
        localStorage.setItem("frame_rate", defaultSettings.frame_rate);
        localStorage.setItem("update_metric_interval", defaultSettings.update_metric_interval);
        localStorage.setItem("metric_font_size", defaultSettings.metric_font_size);
        localStorage.setItem("target_object", defaultSettings.target_object);

        alert("Settings reset to default.");
    }

    // Event listeners
    saveBtn.addEventListener("click", saveSettings);
    cancelBtn.addEventListener("click", cancelSettings);
    resetBtn.addEventListener("click", resetSettings);
});

document.addEventListener("DOMContentLoaded", () => {
    const deviceSizeSelect = document.getElementById("deviceSize");

    // Load saved preference
    const savedSize = localStorage.getItem("deviceCardSize") || "regular";
    deviceSizeSelect.value = savedSize;

    // Save preference when changed
    deviceSizeSelect.addEventListener("change", (event) => {
        localStorage.setItem("deviceCardSize", event.target.value);
    });
});