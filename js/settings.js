document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("change", function() {
        document.querySelectorAll(".settings-panel").forEach(panel => panel.style.display = "none");
        if (this.id === "tab1") document.getElementById("general-settings").style.display = "block";
        if (this.id === "tab2") document.getElementById("account-settings").style.display = "block";
        if (this.id === "tab3") document.getElementById("security-settings").style.display = "block";
    });
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
    const plottingMethod = document.getElementById("plotting-method");
    const alertLoggingToggle = document.getElementById("toggle-alert-logging");
    const alertLoggingDelay = document.getElementById("alert-logging-delay");
    const alertLoggingDelayValue = document.getElementById("alert-logging-delay-value");
    const saveBtn = document.querySelector(".save-btn");
    const cancelBtn = document.querySelector(".cancel-btn");
    const resetBtn = document.querySelector(".reset-btn");

    // Default values
    const defaultSettings = {
        detection_mode: false,
        performance_metrics_toggle: false,
        update_metric_interval: 1,
        metric_font_size: 8,
        stream_resolution: "720p",
        stream_frame_skip: 1,
        max_frame_rate: 60,
        show_bounding_box: true,
        show_confidence_value: false,
        confidence_level: 0.7,
        plotting_method: "mark_object",
        alert_and_record_logging: true,
        delay_for_alert_and_record_logging: 10,
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
        
        detectionToggle.checked = settings.detection_mode;
        boundingBoxToggle.checked = settings.show_bounding_box;
        performanceMetricsToggle.checked = settings.performance_metrics_toggle;
        confidenceLevel.value = settings.confidence_level * 100;
        confidenceValue.textContent = `${confidenceLevel.value}%`;
        frameRate.value = settings.max_frame_rate;
        frameRateValue.textContent = `${frameRate.value} FPS`;
        updateMetricInterval.value = settings.update_metric_interval;
        updateMetricIntervalValue.textContent = `${updateMetricInterval.value}s`;
        metricFontSize.value = settings.metric_font_size;
        metricFontSizeValue.textContent = `${metricFontSize.value}px`;
        streamResolution.value = settings.stream_resolution;
        streamFrameSkip.value = settings.stream_frame_skip;
        streamFrameSkipValue.textContent = `${streamFrameSkip.value} frames`;
        showConfidenceValueToggle.checked = settings.show_confidence_value;
        plottingMethod.value = settings.plotting_method;
        alertLoggingToggle.checked = settings.alert_and_record_logging;
        alertLoggingDelay.value = settings.delay_for_alert_and_record_logging;
        alertLoggingDelayValue.textContent = `${alertLoggingDelay.value}s`;
    }

    loadSettings();

    function saveSettings() {
        const confidenceDecimal = confidenceLevel.value / 100;

        const settings = {
            detection_mode: detectionToggle.checked,
            show_bounding_box: boundingBoxToggle.checked,
            performance_metrics_toggle: performanceMetricsToggle.checked,
            confidence_level: confidenceDecimal,
            max_frame_rate: frameRate.value,
            update_metric_interval: updateMetricInterval.value,
            metric_font_size: metricFontSize.value,
            stream_resolution: streamResolution.value,
            stream_frame_skip: streamFrameSkip.value,
            show_confidence_value: showConfidenceValueToggle.checked,
            plotting_method: plottingMethod.value,
            alert_and_record_logging: alertLoggingToggle.checked,
            delay_for_alert_and_record_logging: alertLoggingDelay.value,
        };

        localStorage.setItem("settings", JSON.stringify(settings));

        fetch("/toggle_model", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: settings.detection_mode }) });
        fetch("/toggle_bounding_box", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: settings.show_bounding_box }) });
        fetch("/toggle_performance_metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: settings.performance_metrics_toggle }) });
        fetch("/set_confidence_level", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confidence: settings.confidence_level }) });
        fetch("/set_max_frame_rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ max_frame_rate: settings.max_frame_rate }) });
        fetch("/set_update_metric_interval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interval: settings.update_metric_interval }) });
        fetch("/set_metric_font_size", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size: settings.metric_font_size }) });
        fetch("/set_stream_resolution", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolution: settings.stream_resolution }) });
        fetch("/set_stream_frame_skip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frame_skip: settings.stream_frame_skip }) });
        fetch("/toggle_confidence_value", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: settings.show_confidence_value }) });
        fetch("/set_plotting_method", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: settings.plotting_method }) });
        fetch("/toggle_alert_and_record_logging", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: settings.alert_and_record_logging }) });
        fetch("/set_delay_for_alert_and_record_logging", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delay: settings.delay_for_alert_and_record_logging }) });

        alert("Settings saved successfully!");
    }

    function cancelSettings() {
        loadSettings();
        alert("Changes discarded.");
    }

    function resetSettings() {
        localStorage.setItem("settings", JSON.stringify(defaultSettings));
        loadSettings();
        alert("Settings reset to default.");
    }

    saveBtn.addEventListener("click", saveSettings);
    cancelBtn.addEventListener("click", cancelSettings);
    resetBtn.addEventListener("click", resetSettings);
});
