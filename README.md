# AirView AQI Prediction Dashboard

AirView is a small air-quality dashboard backed by a FastAPI service. It uses a
pre-trained Random Forest model to predict AQI from pollutant measurements,
stores predictions in PostgreSQL, and serves dataset/model analytics to the
dashboard.

## Project layout

- `backend/main.py` — prediction and analytics API
- `backend/database.py`, `backend/models.py` — PostgreSQL connection and prediction table
- `backend/create_tables.py` — creates the prediction table
- `backend/aqi_random_forest.pkl` — trained model loaded by the API
- `backend/city_day.csv`, `backend/cleaned_city_day.csv` — historical and cleaned data
- `backend/train_model.ipynb`, `backend/explore_clean.ipynb` — model training and data exploration
- `frontend/` — static HTML, CSS, and JavaScript dashboard

The model and CSV files are required at their current paths; keep them in
`backend/`.

## Requirements

- Python 3.10 or later
- PostgreSQL, with a database created for the application
- A modern browser and an internet connection to load the dashboard's Google
  Fonts and Chart.js CDN assets

## Setup

From the project root, create and activate a virtual environment and install
the Python dependencies:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Configure the PostgreSQL connection URL in `backend/database.py` for your local
database. The database must exist before starting the API. Then create the
prediction table:

```powershell
cd backend
python create_tables.py
```

Start the API from the `backend` directory:

```powershell
python -m uvicorn main:app --reload
```

The API is available at <http://127.0.0.1:8000>; interactive API documentation
is at <http://127.0.0.1:8000/docs>.

In a second terminal, start the static frontend:

```powershell
cd frontend
python -m http.server 5500
```

Open <http://127.0.0.1:5500>. The frontend calls the API at
`http://127.0.0.1:8000` (configured in `frontend/script.js`).

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | API health message |
| `POST` | `/predict` | Predict AQI and save the prediction |
| `GET` | `/predictions` | List saved predictions |
| `GET` | `/feature-importance` | Return Random Forest feature importances |
| `GET` | `/evaluation` | Return test-set regression metrics and chart points |
| `GET` | `/correlation` | Return pollutant/AQI correlations |
| `GET` | `/historical-trends` | Return daily historical AQI averages |

`POST /predict` accepts JSON with `state`, `city`, `pm25`, `pm10`, `no2`, `co`,
`o3`, and `so2`. Pollutant values must be non-negative numbers. For example:

```json
{
  "state": "Karnataka",
  "city": "Bengaluru",
  "pm25": 25.91,
  "pm10": 57.27,
  "no2": 8,
  "co": 0.38,
  "o3": 41.7,
  "so2": 6.29
}
```

The API uses the six pollutant measurements as model features; state and city
are saved as prediction metadata. The frontend's optional NH3 field is not
currently sent to the model.

## Notebooks

With the dependencies installed, start Jupyter from `backend` to explore the
data or train the model:

```powershell
jupyter notebook
```

Historical dataset-based analytics are not live sensor readings. Predictions
depend on the checked-in model and the pollutant values entered by the user.
