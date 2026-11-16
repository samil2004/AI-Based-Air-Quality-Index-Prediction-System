
/* =====================================================
   AIRVIEW - COMPLETE SCRIPT.JS
   Random Forest AQI Prediction Dashboard
   Six pollutant features - NH3 excluded
===================================================== */


/* =====================================================
   1. API CONFIGURATION
===================================================== */

const API_BASE_URL = "http://127.0.0.1:8000";

const API = {
    home: `${API_BASE_URL}/`,
    predict: `${API_BASE_URL}/predict`,
    predictions: `${API_BASE_URL}/predictions`,
    evaluation: `${API_BASE_URL}/evaluation`,
    importance: `${API_BASE_URL}/feature-importance`,
    correlation: `${API_BASE_URL}/correlation`,
    historical: `${API_BASE_URL}/historical-trends`
};


/* =====================================================
   2. MODEL FEATURES
===================================================== */

const FEATURES = [
    {
        name: "PM2.5",
        key: "pm25",
        unit: "µg/m³"
    },
    {
        name: "PM10",
        key: "pm10",
        unit: "µg/m³"
    },
    {
        name: "NO₂",
        key: "no2",
        unit: "µg/m³"
    },
    {
        name: "CO",
        key: "co",
        unit: "mg/m³"
    },
    {
        name: "O₃",
        key: "o3",
        unit: "µg/m³"
    },
    {
        name: "SO₂",
        key: "so2",
        unit: "µg/m³"
    }
];


/* =====================================================
   3. INDIAN STATES AND UNION TERRITORIES
===================================================== */

const INDIAN_STATES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry"
];


/* =====================================================
   4. GLOBAL VARIABLES
===================================================== */

let historyChart = null;
let pollutantChart = null;
let comparisonChart = null;
let importanceChart = null;
let historicalChart = null;

let predictionRecords = [];

let selectedLocation = {
    state: "",
    city: ""
};


/* =====================================================
   5. DOM HELPER FUNCTIONS
===================================================== */

function getElement(id) {
    return document.getElementById(id);
}


function getInputValue(name) {
    const input = document.querySelector(`[name="${name}"]`);

    return input ? input.value.trim() : "";
}


function formatNumber(value, decimals = 2) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "--";
    }

    return number.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}


function formatDate(value) {
    if (!value) {
        return "Date unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function setMessage(message, type = "") {
    const element = getElement("formMessage");

    if (!element) return;

    element.textContent = message;

    element.classList.remove("error", "success");

    if (type) {
        element.classList.add(type);
    }
}


/* =====================================================
   6. API REQUEST HELPER
===================================================== */

async function fetchAPI(url, options = {}) {

    const response = await fetch(url, options);

    if (!response.ok) {

        let message = `Server error: ${response.status}`;

        try {
            const errorData = await response.json();

            if (errorData.detail) {
                message = errorData.detail;
            }

        } catch (error) {
            console.error("Error reading API response:", error);
        }

        throw new Error(message);
    }

    return await response.json();
}


/* =====================================================
   7. API STATUS
===================================================== */

async function checkAPIStatus() {

    const status = getElement("apiStatus");

    if (!status) return;

    try {

        await fetchAPI(API.home);

        status.className = "api-status online";

        status.innerHTML = "<i></i> API Connected";

    } catch (error) {

        status.className = "api-status offline";

        status.innerHTML = "<i></i> API Offline";

        console.error("API connection failed:", error);
    }
}


/* =====================================================
   8. LIVE CLOCK
===================================================== */

function updateClock() {

    const clock = getElement("clock");

    if (!clock) return;

    const now = new Date();

    clock.textContent = "Time: " +
        now.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
}


/* =====================================================
   9. AQI CATEGORY
===================================================== */

function getAQICategory(aqi) {

    const value = Number(aqi);

    if (!Number.isFinite(value)) {
        return {
            category: "Unknown",
            color: "#94a3b8",
            className: ""
        };
    }

    if (value <= 50) {
        return {
            category: "Good",
            color: "#22c55e",
            className: "history-good"
        };
    }

    if (value <= 100) {
        return {
            category: "Satisfactory",
            color: "#84cc16",
            className: "history-satisfactory"
        };
    }

    if (value <= 200) {
        return {
            category: "Moderate",
            color: "#eab308",
            className: "history-moderate"
        };
    }

    if (value <= 300) {
        return {
            category: "Poor",
            color: "#f97316",
            className: "history-poor"
        };
    }

    if (value <= 400) {
        return {
            category: "Very Poor",
            color: "#ef4444",
            className: "history-very-poor"
        };
    }

    return {
        category: "Severe",
        color: "#991b1b",
        className: "history-severe"
    };
}


/* =====================================================
   10. AQI GAUGE
===================================================== */

function updateAQIGauge(aqi) {

    const value = Number(aqi);

    if (!Number.isFinite(value)) return;

    const numberElement = getElement("aqiNumber");
    const categoryElement = getElement("aqiCategory");
    const needle = getElement("needle");

    const result = getAQICategory(value);

    if (numberElement) {

        numberElement.textContent = formatNumber(value, 2);

        numberElement.style.color = result.color;
    }

    if (categoryElement) {

        categoryElement.textContent = result.category;

        categoryElement.style.color = result.color;
    }

    if (needle) {

        // Gauge maximum is 500.
        // Values above 500 are displayed as raw predictions,
        // but the needle is capped at the maximum.

        const safeValue = Math.max(0, Math.min(500, value));

        const angle = -90 + (safeValue / 500) * 180;

        needle.style.transformOrigin = "160px 155px";

        needle.style.transform = `rotate(${angle}deg)`;
    }
}


/* =====================================================
   11. LOCATION SELECTOR
===================================================== */

function setupLocation() {

    const stateSelect = getElement("stateSelect");

    const cityInput = getElement("cityInput");

    const applyButton = getElement("applyLocation");

    if (!stateSelect || !cityInput || !applyButton) {
        return;
    }

    // Add states only once.

    if (stateSelect.options.length <= 1) {

        INDIAN_STATES.forEach(state => {

            const option = document.createElement("option");

            option.value = state;

            option.textContent = state;

            stateSelect.appendChild(option);
        });
    }

    if (applyButton.dataset.bound === "true") {
        return;
    }

    applyButton.dataset.bound = "true";

    applyButton.addEventListener("click", () => {

        const state = stateSelect.value.trim();

        const city = cityInput.value.trim();

        if (!state) {

            alert("Please select a state or union territory.");

            return;
        }

        if (!city) {

            alert("Please enter your city or district.");

            cityInput.focus();

            return;
        }

        updateLocationLabels(city, state);
    });
}


function updateLocationLabels(city, state) {

    selectedLocation = {
        city: city,
        state: state
    };

    const locationText = getElement("locationText");

    const selectedLocationElement = getElement("selectedLocation");

    const location = `${city}, ${state}`;

    if (locationText) {

        locationText.textContent = `Location: ${location}`;
    }

    if (selectedLocationElement) {

        selectedLocationElement.textContent = location;
    }
}


/* =====================================================
   12. CHART DEFAULT SETTINGS
===================================================== */

function chartDefaults() {

    return {
        responsive: true,

        maintainAspectRatio: false,

        animation: {
            duration: 700
        },

        plugins: {

            legend: {
                labels: {
                    color: "#d7dee8",
                    font: {
                        size: 10
                    }
                }
            },

            tooltip: {
                backgroundColor: "#202631",
                titleColor: "#ffffff",
                bodyColor: "#d7dee8",
                borderColor: "#4a5664",
                borderWidth: 1
            }
        },

        scales: {

            x: {
                ticks: {
                    color: "#aeb8c5",
                    font: {
                        size: 9
                    }
                },

                grid: {
                    color: "rgba(174,184,197,0.08)"
                }
            },

            y: {
                beginAtZero: true,

                ticks: {
                    color: "#aeb8c5",
                    font: {
                        size: 9
                    }
                },

                grid: {
                    color: "rgba(174,184,197,0.12)"
                }
            }
        }
    };
}


/* =====================================================
   13. CHART REPLACEMENT
===================================================== */

function replaceChart(oldChart, canvasId, config) {

    const canvas = getElement(canvasId);

    if (!canvas) {
        console.warn(`Canvas not found: ${canvasId}`);
        return oldChart;
    }

    if (typeof Chart === "undefined") {
        console.error("Chart.js is not loaded.");
        return oldChart;
    }

    if (oldChart) {
        oldChart.destroy();
    }

    return new Chart(canvas, config);
}


/* =====================================================
   14. POLLUTANT DISPLAY
===================================================== */

function updatePollutantDisplay(data) {

    const grid = getElement("pollutantGrid");

    if (!grid) return;

    grid.replaceChildren();

    FEATURES.forEach(feature => {

        const card = document.createElement("div");

        card.className = "pollutant";

        const name = document.createElement("b");

        name.textContent = feature.name;

        const value = document.createElement("strong");

        value.textContent = formatNumber(data[feature.key]);

        const unit = document.createElement("small");

        unit.textContent = feature.unit;

        card.append(name, value, unit);

        grid.appendChild(card);
    });

    updatePollutantChart(data);
}


/* =====================================================
   15. POLLUTANT DISTRIBUTION CHART
===================================================== */

function updatePollutantChart(data) {

    const values = FEATURES.map(feature =>
        Number(data[feature.key])
    );

    pollutantChart = replaceChart(
        pollutantChart,
        "pollutantChart",
        {
            type: "bar",

            data: {

                labels: FEATURES.map(feature => feature.name),

                datasets: [{
                    label: "Concentration",

                    data: values,

                    backgroundColor: [
                        "#18c9a9",
                        "#249fda",
                        "#eab308",
                        "#f97316",
                        "#a78bfa",
                        "#ef647c"
                    ],

                    borderRadius: 6,

                    borderSkipped: false
                }]
            },

            options: {

                ...chartDefaults(),

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}


/* =====================================================
   16. MODEL PERFORMANCE CARDS
===================================================== */

function updatePerformanceCards(result) {

    const metrics = [
        {
            id: "maeValue",
            value: result.mae,
            decimals: 2
        },
        {
            id: "mseValue",
            value: result.mse,
            decimals: 2
        },
        {
            id: "rmseValue",
            value: result.rmse,
            decimals: 2
        },
        {
            id: "r2Value",
            value: result.r2_score,
            decimals: 4
        }
    ];

    metrics.forEach(metric => {

        const element = getElement(metric.id);

        if (!element) return;

        if (metric.value === undefined || metric.value === null) {
            element.textContent = "--";
            return;
        }

        element.textContent = formatNumber(
            metric.value,
            metric.decimals
        );
    });

    const note = getElement("performanceNote");

    if (note) {

        note.textContent =
            "Metrics are calculated from the held-out test dataset using the same 80:20 split and random_state=42 as model training.";
    }
}


/* =====================================================
   17. ACTUAL VS PREDICTED SCATTER PLOT
===================================================== */

function updateComparisonChart(points) {

    if (!Array.isArray(points) || points.length === 0) {

        console.warn("No actual vs predicted points returned.");

        return;
    }

    const validPoints = points
        .map(point => ({
            x: Number(point.actual),
            y: Number(point.predicted)
        }))
        .filter(point =>
            Number.isFinite(point.x) &&
            Number.isFinite(point.y)
        );

    if (!validPoints.length) return;

    const minimum = Math.min(
        0,
        ...validPoints.map(point =>
            Math.min(point.x, point.y)
        )
    );

    const maximum = Math.max(
        ...validPoints.map(point =>
            Math.max(point.x, point.y)
        )
    );

    comparisonChart = replaceChart(
        comparisonChart,
        "comparisonChart",
        {
            type: "scatter",

            data: {

                datasets: [

                    {
                        label: "Predicted AQI",

                        data: validPoints,

                        backgroundColor: "rgba(18,201,170,0.7)",

                        borderColor: "#12c9aa",

                        pointRadius: 3,

                        pointHoverRadius: 6
                    },

                    {
                        type: "line",

                        label: "Perfect prediction",

                        data: [
                            {
                                x: minimum,
                                y: minimum
                            },
                            {
                                x: maximum,
                                y: maximum
                            }
                        ],

                        borderColor: "#f5b942",

                        borderDash: [7, 5],

                        borderWidth: 2,

                        pointRadius: 0,

                        fill: false
                    }
                ]
            },

            options: {

                ...chartDefaults(),

                scales: {

                    x: {
                        type: "linear",

                        title: {
                            display: true,
                            text: "Actual AQI",
                            color: "#d7dee8"
                        },

                        ticks: {
                            color: "#aeb8c5"
                        },

                        grid: {
                            color: "rgba(174,184,197,0.08)"
                        }
                    },

                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Predicted AQI",
                            color: "#d7dee8"
                        },

                        ticks: {
                            color: "#aeb8c5"
                        },

                        grid: {
                            color: "rgba(174,184,197,0.12)"
                        }
                    }
                }
            }
        }
    );
}


/* =====================================================
   18. LOAD MODEL EVALUATION
===================================================== */

async function loadModelEvaluation() {

    try {

        const result = await fetchAPI(API.evaluation);

        updatePerformanceCards(result);

        updateComparisonChart(result.points);

        const note = getElement("comparisonNote");

        if (note) {

            note.textContent =
                "Each dot represents a test observation. Dots closer to the diagonal line indicate closer agreement between actual and predicted AQI.";
        }

    } catch (error) {

        console.error("Evaluation loading error:", error);

        const note = getElement("performanceNote");

        if (note) {

            note.textContent =
                "Could not load model evaluation. Check the FastAPI /evaluation endpoint.";
        }

        const comparisonNote = getElement("comparisonNote");

        if (comparisonNote) {

            comparisonNote.textContent =
                "Unable to load actual and predicted values.";
        }
    }
}


/* =====================================================
   19. FEATURE IMPORTANCE
===================================================== */

async function loadFeatureImportance() {

    try {

        const result = await fetchAPI(API.importance);

        const features = result.features || [];

        importanceChart = replaceChart(
            importanceChart,
            "importanceChart",
            {
                type: "bar",

                data: {

                    labels: features.map(item => item.name),

                    datasets: [{
                        label: "Feature importance",

                        data: features.map(item =>
                            Number(item.importance)
                        ),

                        backgroundColor: "#18c9aa",

                        borderRadius: 5,

                        borderSkipped: false
                    }]
                },

                options: {

                    ...chartDefaults(),

                    indexAxis: "y",

                    scales: {

                        x: {
                            beginAtZero: true,

                            ticks: {
                                color: "#aeb8c5"
                            },

                            grid: {
                                color: "rgba(174,184,197,0.1)"
                            }
                        },

                        y: {
                            ticks: {
                                color: "#d7dee8"
                            },

                            grid: {
                                display: false
                            }
                        }
                    }
                }
            }
        );

        const note = getElement("importanceNote");

        if (note) {

            note.textContent =
                "Relative Random Forest feature importance. Importance indicates model contribution, not cause and effect.";
        }

    } catch (error) {

        console.error("Feature importance error:", error);

        const note = getElement("importanceNote");

        if (note) {
            note.textContent =
                "Unable to load feature importance.";
        }
    }
}


/* =====================================================
   20. CORRELATION HEATMAP
===================================================== */

async function loadCorrelation() {

    try {

        const result = await fetchAPI(API.correlation);

        const container = getElement("correlationHeatmap");

        if (!container) return;

        const labels = result.labels || [];

        const matrix = result.matrix || [];

        container.replaceChildren();

        if (!labels.length || !matrix.length) {

            container.textContent = "No correlation data available.";

            return;
        }

        const table = document.createElement("table");

        table.className = "correlation-table";

        // Table header.

        const headerRow = document.createElement("tr");

        const emptyHeader = document.createElement("th");

        headerRow.appendChild(emptyHeader);

        labels.forEach(label => {

            const th = document.createElement("th");

            th.textContent = label;

            headerRow.appendChild(th);
        });

        table.appendChild(headerRow);


        // Table body.

        matrix.forEach((row, rowIndex) => {

            const tr = document.createElement("tr");

            const heading = document.createElement("th");

            heading.textContent = labels[rowIndex] || "";

            tr.appendChild(heading);

            row.forEach(value => {

                const number = Number(value);

                const td = document.createElement("td");

                td.textContent = number.toFixed(2);

                const alpha = Math.min(
                    0.85,
                    Math.abs(number) * 0.85
                );

                if (number >= 0) {

                    td.style.backgroundColor =
                        `rgba(34,197,94,${alpha})`;

                } else {

                    td.style.backgroundColor =
                        `rgba(239,68,68,${alpha})`;
                }

                td.title = `Correlation: ${number.toFixed(3)}`;

                tr.appendChild(td);
            });

            table.appendChild(tr);
        });

        container.appendChild(table);

        const note = getElement("correlationNote");

        if (note) {

            note.textContent =
                "Correlation ranges from -1 to +1. Positive values indicate positive association; negative values indicate negative association. Correlation does not prove causation.";
        }

    } catch (error) {

        console.error("Correlation error:", error);

        const container = getElement("correlationHeatmap");

        if (container) {
            container.textContent =
                "Unable to load correlation matrix.";
        }
    }
}


/* =====================================================
   21. HISTORICAL AQI TRENDS
===================================================== */

async function loadHistoricalTrends() {

    try {

        const result = await fetchAPI(API.historical);

        const points = result.points || [];

        const validPoints = points.filter(point =>
            point.date &&
            Number.isFinite(Number(point.aqi))
        );

        historicalChart = replaceChart(
            historicalChart,
            "historicalChart",
            {
                type: "line",

                data: {

                    labels: validPoints.map(item => item.date),

                    datasets: [{
                        label: "Average historical AQI",

                        data: validPoints.map(item =>
                            Number(item.aqi)
                        ),

                        borderColor: "#a78bfa",

                        backgroundColor: "rgba(167,139,250,0.13)",

                        pointRadius: 0,

                        pointHoverRadius: 4,

                        borderWidth: 2,

                        tension: 0.25,

                        fill: true
                    }]
                },

                options: {

                    ...chartDefaults(),

                    interaction: {
                        intersect: false,
                        mode: "index"
                    },

                    plugins: {
                        legend: {
                            labels: {
                                color: "#d7dee8",
                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            }
        );

        const note = getElement("historicalNote");

        if (note) {

            note.textContent =
                "Daily average AQI across cities in the historical dataset. These are historical records, not live monitoring.";
        }

    } catch (error) {

        console.error("Historical trends error:", error);

        const note = getElement("historicalNote");

        if (note) {

            note.textContent =
                "Unable to load historical AQI data.";
        }
    }
}


/* =====================================================
   22. HISTORY FILTER
===================================================== */

function getFilteredHistory() {

    const range = getElement("historyRange");

    const limit = range ? Number(range.value) : 7;

    return predictionRecords.slice(0, limit);
}


function setupHistoryFilter() {

    const range = getElement("historyRange");

    if (!range) return;

    range.addEventListener("change", () => {

        const records = getFilteredHistory();

        renderPredictionHistory(records);

        updateHistoryChart(records);
    });
}


/* =====================================================
   23. RENDER PREDICTION HISTORY
===================================================== */

function renderPredictionHistory(records) {

    const container = getElement("predictionHistory");

    if (!container) return;

    container.replaceChildren();

    if (!records || records.length === 0) {

        const empty = document.createElement("div");

        empty.className = "history-empty";

        empty.textContent = "No predictions saved yet.";

        container.appendChild(empty);

        return;
    }

    records.forEach(record => {

        const aqi = Number(record.predicted_aqi);

        if (!Number.isFinite(aqi)) return;

        const category = getAQICategory(aqi);

        const card = document.createElement("article");

        card.className = "history-item";


        const icon = document.createElement("div");

        icon.className = "history-icon";

        icon.textContent = "⌖";


        const details = document.createElement("div");


        const location = document.createElement("div");

        location.className = "history-location";

        location.textContent =
            `${record.city || "Unknown city"}, ${record.state || "Unknown state"}`;


        const date = document.createElement("div");

        date.className = "history-date";

        date.textContent = formatDate(record.created_at);


        details.append(location, date);


        const result = document.createElement("div");

        result.className = "history-result";


        const value = document.createElement("div");

        value.className = "history-aqi";

        value.style.color = category.color;

        value.textContent = formatNumber(aqi, 2);


        const badge = document.createElement("span");

        badge.className = `history-category ${category.className}`;

        badge.textContent = category.category;


        result.append(value, badge);

        card.append(icon, details, result);

        container.appendChild(card);
    });
}


/* =====================================================
   24. AQI HISTORY CHART
===================================================== */

function updateHistoryChart(records) {

    const sortedRecords = [...records].reverse();

    historyChart = replaceChart(
        historyChart,
        "historyChart",
        {
            type: "line",

            data: {

                labels: sortedRecords.map(
                    (_, index) => `Prediction ${index + 1}`
                ),

                datasets: [{
                    label: "Predicted AQI",

                    data: sortedRecords.map(item =>
                        Number(item.predicted_aqi)
                    ),

                    borderColor: "#18c9aa",

                    backgroundColor: "rgba(18,201,170,0.12)",

                    pointBackgroundColor: "#18c9aa",

                    pointRadius: 3,

                    pointHoverRadius: 5,

                    borderWidth: 2,

                    tension: 0.35,

                    fill: true
                }]
            },

            options: chartDefaults()
        }
    );
}


/* =====================================================
   25. LOAD DATABASE PREDICTION HISTORY
===================================================== */

async function loadPredictionHistory() {

    try {

        const records = await fetchAPI(API.predictions);

        if (!Array.isArray(records)) {

            throw new Error(
                "Prediction history endpoint did not return a list."
            );
        }

        predictionRecords = records;

        const filtered = getFilteredHistory();

        renderPredictionHistory(filtered);

        updateHistoryChart(filtered);

    } catch (error) {

        console.error("Prediction history error:", error);

        const container = getElement("predictionHistory");

        if (container) {

            container.textContent =
                "Unable to load history. Check FastAPI and PostgreSQL.";
        }
    }
}


/* =====================================================
   26. PREDICTION FORM
===================================================== */

function setupPredictionForm() {

    const form = getElement("predictionForm");

    if (!form || form.dataset.bound === "true") {
        return;
    }

    form.dataset.bound = "true";

    form.addEventListener("submit", async event => {

        event.preventDefault();

        const button = getElement("predictBtn");

        // Location must be applied before prediction.

        if (!selectedLocation.state || !selectedLocation.city) {

            setMessage(
                "Select a state and city, then click Apply Location.",
                "error"
            );

            return;
        }


        // Collect the six trained model features only.

        const inputData = {
            state: selectedLocation.state,
            city: selectedLocation.city
        };


        for (const feature of FEATURES) {

            const rawValue = getInputValue(feature.key);

            const value = rawValue === ""
                ? NaN
                : Number(rawValue);

            if (!Number.isFinite(value) || value < 0) {

                setMessage(
                    `Please enter a valid non-negative value for ${feature.name}.`,
                    "error"
                );

                const input = document.querySelector(
                    `[name="${feature.key}"]`
                );

                if (input) input.focus();

                return;
            }

            inputData[feature.key] = value;
        }


        try {

            if (button) {

                button.disabled = true;

                button.textContent = "Predicting...";
            }

            setMessage("Sending pollutant values to the Random Forest model...");


            // Send prediction request to FastAPI.

            const result = await fetchAPI(API.predict, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(inputData)
            });


            const predictedAQI = Number(result.predicted_aqi);

            if (!Number.isFinite(predictedAQI)) {

                throw new Error(
                    "FastAPI did not return a valid predicted_aqi value."
                );
            }


            // Update gauge.

            updateAQIGauge(predictedAQI);


            // Update pollutant cards.

            updatePollutantDisplay(inputData);


            // Update last prediction time.

            const lastUpdated = getElement("lastUpdated");

            if (lastUpdated) {

                lastUpdated.textContent =
                    "Updated " +
                    new Date().toLocaleTimeString("en-IN");
            }


            // Update location labels.

            updateLocationLabels(
                result.city || selectedLocation.city,
                result.state || selectedLocation.state
            );


            // Show success.

            setMessage(
                `Prediction completed! AQI: ${formatNumber(predictedAQI, 2)}. Saved to PostgreSQL.`,
                "success"
            );


            // Refresh saved prediction history.

            await loadPredictionHistory();

        } catch (error) {

            console.error("Prediction error:", error);

            setMessage(
                `Prediction failed: ${error.message}`,
                "error"
            );

        } finally {

            if (button) {

                button.disabled = false;

                button.innerHTML = 'Predict AQI <span>↗</span>';
            }
        }
    });


    // Clear form message when form is reset.

    form.addEventListener("reset", () => {

        setTimeout(() => {

            setMessage(
                "Enter six pollutant values to predict AQI."
            );

        }, 0);
    });
}


/* =====================================================
   27. LOAD ALL ANALYTICS
===================================================== */

async function loadAnalytics() {

    await Promise.allSettled([

        loadModelEvaluation(),

        loadFeatureImportance(),

        loadCorrelation(),

        loadHistoricalTrends()

    ]);
}


/* =====================================================
   28. INITIALIZE DASHBOARD
===================================================== */

async function initializeDashboard() {

    console.log("AirView dashboard initializing...");


    // Clock.

    updateClock();

    window.setInterval(updateClock, 1000);


    // Location.

    setupLocation();


    // Form.

    setupPredictionForm();


    // History filter.

    setupHistoryFilter();


    // API status.

    await checkAPIStatus();


    // Load database and analytics.

    await Promise.allSettled([

        loadPredictionHistory(),

        loadAnalytics()

    ]);


    console.log("AirView dashboard initialized.");
}


/* =====================================================
   29. START DASHBOARD
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);
