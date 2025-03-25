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
    const streamResolution = document.getElementById("stream-resolution");
    const streamFrameSkip = document.getElementById("stream-frame-skip");
    const streamFrameSkipValue = document.getElementById("stream-frame-skip-value");
    const showConfidenceValueToggle = document.getElementById("toggle-confidence-value");
    const modelVersion = document.getElementById("model-version");
    // alert
    const enableAlertToggle = document.getElementById("enable-alert-toggle");
    const enableRecordLoggingToggle = document.getElementById("enable-record-logging-toggle");
    const alertLoggingDelay = document.getElementById("alert-logging-delay");
    const alertLoggingDelayValue = document.getElementById("alert-logging-delay-value");
    const alertSoundToggle = document.getElementById("alert-sound-toggle");
    const alertDuration = document.getElementById("alert-duration");
    const alertDurationValue = document.getElementById("alert-duration-value");
    const alertVolume = document.getElementById("alert-volume");
    const alertVolumeValue = document.getElementById("alert-volume-value");
    const alertSoundName = document.getElementById("alert-sound-name");
    // btn
    const saveBtn = document.querySelector(".save-btn");
    const cancelBtn = document.querySelector(".cancel-btn");
    const resetBtn = document.querySelector(".reset-btn");

    // Default values
    const defaultSettings = {
        //general
        performance_metrics_toggle: false,
        update_metric_interval: 1,
        metric_font_size: 8,
        stream_resolution: "720p",
        stream_frame_skip: 0,
        max_frame_rate: 30,
        
        //model
        detection_mode: false,
        model_version: "car-fire-5.1.11n",
        show_bounding_box: false,
        show_confidence_value: false,
        confidence_level: 0.7,
        enable_alert: true,
        enable_record_logging: true,
        delay_for_alert_and_record_logging: 20,

        // alerts sound
        alert_sound: true,
        alert_duration: 2.5,  // in seconds
        alert_volume: 30,  // percentage (0-100)
        alert_sound_name: "red_alert"  // default alert sound
    };

    function updateRangeValue(input, output, suffix) {
        input.addEventListener("input", () => {
            output.textContent = `${input.value}${suffix}`;
        });
    }

    updateRangeValue(confidenceLevel, confidenceValue, "%");
    updateRangeValue(frameRate, frameRateValue, " FPS");
    updateRangeValue(updateMetricInterval, updateMetricIntervalValue, "s");
    updateRangeValue(metricFontSize, metricFontSizeValue, "px");
    updateRangeValue(streamFrameSkip, streamFrameSkipValue, " frames");
    updateRangeValue(alertLoggingDelay, alertLoggingDelayValue, "s");

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem("settings")) || defaultSettings;
        //general
        boundingBoxToggle.checked = settings.show_bounding_box;
        performanceMetricsToggle.checked = settings.performance_metrics_toggle;
        frameRate.value = settings.max_frame_rate;
        frameRateValue.textContent = `${frameRate.value} FPS`;
        updateMetricInterval.value = settings.update_metric_interval;
        updateMetricIntervalValue.textContent = `${updateMetricInterval.value}s`;
        metricFontSize.value = settings.metric_font_size;
        metricFontSizeValue.textContent = `${metricFontSize.value}px`;
        streamResolution.value = settings.stream_resolution;
        streamFrameSkip.value = settings.stream_frame_skip;
        streamFrameSkipValue.textContent = `${streamFrameSkip.value} frames`;
        //model
        detectionToggle.checked = settings.detection_mode;
        confidenceLevel.value = settings.confidence_level * 100;
        confidenceValue.textContent = `${confidenceLevel.value}%`;
        showConfidenceValueToggle.checked = settings.show_confidence_value;
        enableAlertToggle.checked = settings.enable_alert;
        enableRecordLoggingToggle.checked = settings.enable_record_logging;
        alertLoggingDelay.value = settings.delay_for_alert_and_record_logging;
        alertLoggingDelayValue.textContent = `${alertLoggingDelay.value}s`;
        modelVersion.value = settings.model_version;
        // alert sound
        alertSoundToggle.checked = settings.alert_sound;
        alertDuration.value = settings.alert_duration;
        alertDurationValue.textContent = `${settings.alert_duration}s`;
        alertVolume.value = settings.alert_volume;
        alertVolumeValue.textContent = `${settings.alert_volume}%`;
        alertSoundName.value = settings.alert_sound_name;
    }

    loadSettings();

    function saveSettings() {
        const confidenceDecimal = confidenceLevel.value / 100;
    
        const settings = {
            //general
            performance_metrics_toggle: performanceMetricsToggle.checked,
            confidence_level: confidenceDecimal,
            max_frame_rate: parseInt(frameRate.value, 10),
            update_metric_interval: parseFloat(updateMetricInterval.value),
            metric_font_size: parseInt(metricFontSize.value, 10),
            stream_resolution: streamResolution.value,
            stream_frame_skip: parseInt(streamFrameSkip.value, 10),
            //model
            detection_mode: detectionToggle.checked,
            show_bounding_box: boundingBoxToggle.checked,
            show_confidence_value: showConfidenceValueToggle.checked,
            enable_alert: enableAlertToggle.checked,
            enable_record_logging: enableRecordLoggingToggle.checked,
            delay_for_alert_and_record_logging: parseInt(alertLoggingDelay.value, 10),
            model_version: modelVersion.value,
            //alert sound
            alert_sound: alertSoundToggle.checked,
            alert_duration: parseFloat(alertDuration.value),
            alert_volume: parseInt(alertVolume.value, 10),
            alert_sound_name: alertSoundName.value,
        };
    
        // Save settings locally
        localStorage.setItem("settings", JSON.stringify(settings));
    
        // Send all settings in a single request
        fetch("/update_settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings)
        })
        .then(response => response.json())
        .then(data => alert("Settings saved successfully!"))
        .catch(error => console.error("Error updating settings:", error));
    }   
    
    function resetSettings() {
        localStorage.setItem("settings", JSON.stringify(defaultSettings));
        loadSettings();
    
        // Ensure reset is applied on the server
        fetch("/update_settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(defaultSettings)
        })
        .then(response => response.json())
        .then(data => alert("Settings reset to default and saved!"))
        .catch(error => console.error("Error resetting settings:", error));
    }    

    function cancelSettings() {
        loadSettings();
        alert("Changes discarded.");
    }

    saveBtn.addEventListener("click", saveSettings);
    cancelBtn.addEventListener("click", cancelSettings);
    resetBtn.addEventListener("click", resetSettings);
});

document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab");
    const title = document.querySelector(".settings-title");
    
    const tabData = {
        tab1: { title: "General Settings", icon: "bx bx-cog" },
        tab2: { title: "Account Settings", icon: "bx bx-user" },
        tab3: { title: "Security Settings", icon: "bx bx-lock" }
    };

    tabs.forEach(tab => {
        tab.addEventListener("change", function () {
            if (this.checked) {
                const data = tabData[this.id];
                title.innerHTML = `<i class='${data.icon}' style="background-color: #453cc622; padding: 10px; border-radius: 20px;"></i> ${data.title}`;
            }
        });
    });
});
