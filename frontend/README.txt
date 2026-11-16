AIRVIEW AQI DASHBOARD

This dashboard recreates the uploaded reference style:
- Dark charcoal background and rounded grey panels
- AQI number and semicircle colour gauge
- Location selection panel with Indian state/UT and city/district fields (no map)
- AQI history line chart
- Pollutant concentration cards
- Input form for state/city and pollutant measurements

FILES
index.html - page structure
style.css - styling and responsive layout
script.js - map, chart, AQI gauge, state selection and FastAPI request

RUN IN VS CODE
1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. Start your FastAPI backend at http://127.0.0.1:8000.
4. Install/use VS Code Live Server and open index.html.
   Alternatively run: python -m http.server 5500
   Then open http://127.0.0.1:5500

FASTAPI REQUEST
POST http://127.0.0.1:8000/predict
Example JSON body:
{
  "pm25": 25.91,
  "pm10": 57.27,
  "no2": 8,
  "co": 0.38,
  "o3": 41.7,
  "so2": 6.29,
  "nh3": 16.8,
  "state": "Karnataka",
  "city": "Bengaluru"
}
Expected response:
{ "aqi": 54, "category": "Moderate" }
You may return predicted_aqi instead of aqi.

IMPORTANT INTEGRATION NOTES
- Ensure the FastAPI request model accepts the field names sent by this page.
- Send only the exact pollutant features used to train your Random Forest pipeline to model.predict().
- State and city are location metadata unless your model was trained with location features.
- If NH3 was not used to train your model, remove it from the request or ignore it in the backend.
- Enable CORS for your frontend origin.
- No map service or map API is used.
- AQI category labels shown in this template are example India CPCB bands. Confirm your project's selected AQI standard and units before final use.
- History chart is in browser memory for the current page session; database persistence is not included.
- The location marker shows the selected state's approximate center, not a verified monitoring station or live location.
- Historical Kaggle data is not live sensor data.

LOCATION SELECTOR UPDATE
The map panel is replaced with a state/city selection card. Choose a state/UT and enter a city or district, then click Apply Location before predicting.


ADDITIONAL DASHBOARD ANALYTICS
The dashboard now has sections for:
- Predicted AQI value and category (from POST /predict response)
- Actual vs Predicted AQI graph
- Pollutant values/cards
- Correlation heatmap
- Random Forest feature-importance chart
- Historical AQI trend chart
- Prediction history

To populate the advanced charts, your FastAPI /predict response may include:
{
  "aqi": 85,
  "category": "Satisfactory",
  "actual_values": [80, 90, 100],
  "predicted_values": [82, 88, 97],
  "feature_importance": {
    "PM2.5": 0.35,
    "PM10": 0.25,
    "NO2": 0.15,
    "CO": 0.10,
    "SO2": 0.08,
    "O3": 0.07
  },
  "correlation_matrix": {
    "PM2.5": {"PM2.5": 1.0, "PM10": 0.7},
    "PM10": {"PM2.5": 0.7, "PM10": 1.0}
  },
  "historical_aqi": [{"date": "2025-04-01", "aqi": 85}]
}
These arrays/values are examples of the response format only, not real model results. Do not hardcode example values as project findings. Actual vs predicted graph needs test-set actual/predicted values from evaluation; correlation heatmap needs dataset correlations; feature importance must come from the fitted Random Forest model; historical trends need dated AQI observations. The single prediction endpoint should not return unrelated large arrays on every request in a production system; separate analytics endpoints are better for a full implementation.
