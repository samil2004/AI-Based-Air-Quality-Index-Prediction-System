
from pathlib import Path
from database import SessionLocal
from models import AQIPrediction
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np

# Project paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "aqi_random_forest.pkl"
CLEANED_PATH = BASE_DIR / "cleaned_city_day.csv"
ORIGINAL_PATH = BASE_DIR / "city_day.csv"

# Create FastAPI application
app = FastAPI(title="AQI Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load trained Random Forest model
model = joblib.load(MODEL_PATH)

FEATURES = ["PM2.5", "PM10", "NO2", "CO", "O3", "SO2"]
TARGET = "AQI"


# Input data
class AQIInput(BaseModel):
    state: str
    city: str
    pm25: float = Field(ge=0)
    pm10: float = Field(ge=0)
    no2: float = Field(ge=0)
    co: float = Field(ge=0)
    o3: float = Field(ge=0)
    so2: float = Field(ge=0)


# Load cleaned dataset
def load_cleaned_data():
    if not CLEANED_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="cleaned_city_day.csv was not found in the backend folder."
        )

    df = pd.read_csv(CLEANED_PATH)

    required = FEATURES + [TARGET]
    missing = [col for col in required if col not in df.columns]

    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing columns in cleaned dataset: {missing}"
        )

    return df.dropna(subset=required)


# Home
@app.get("/")
def home():
    return {"message": "AQI Prediction API is running"}


# AQI prediction
@app.post("/predict")
def predict_aqi(data: AQIInput):

    # Prepare input for ML model
    input_data = pd.DataFrame(
        [[
            data.pm25,
            data.pm10,
            data.no2,
            data.co,
            data.o3,
            data.so2
        ]],
        columns=FEATURES
    )

    # Predict AQI
    prediction = float(model.predict(input_data)[0])

    # Connect to database
    db = SessionLocal()

    try:
        # Save prediction
        new_prediction = AQIPrediction(
            state=data.state,
            city=data.city,
            pm25=data.pm25,
            pm10=data.pm10,
            no2=data.no2,
            co=data.co,
            o3=data.o3,
            so2=data.so2,
            predicted_aqi=round(prediction, 2)
        )

        db.add(new_prediction)
        db.commit()
        db.refresh(new_prediction)

        return {
            "id": new_prediction.id,
            "state": data.state,
            "city": data.city,
            "predicted_aqi": round(prediction, 2),
            "message": "Prediction saved successfully!"
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
@app.get("/predictions")
def get_predictions():

    db = SessionLocal()

    try:
        records = (
            db.query(AQIPrediction)
            .order_by(AQIPrediction.id.desc())
            .all()
        )

        return [
            {
                "id": record.id,
                "state": record.state,
                "city": record.city,
                "predicted_aqi": record.predicted_aqi,
                "created_at": record.created_at
            }
            for record in records
        ]

    finally:
        db.close()


# 1. Random Forest feature importance
@app.get("/feature-importance")
def feature_importance():
    values = model.feature_importances_

    return {
        "features": [
            {"name": name, "importance": round(float(value), 5)}
            for name, value in zip(FEATURES, values)
        ]
    }


# 2. Actual vs. predicted AQI on the test dataset
@app.get("/evaluation")
def evaluation():
    df = load_cleaned_data()

    X = df[FEATURES]
    y = df[TARGET]

    # IMPORTANT: These settings must match train_model.py
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42
    )

    predictions = model.predict(X_test)

    # Return up to 150 points for chart display
    results = pd.DataFrame({
        "actual": y_test.to_numpy(),
        "predicted": predictions
    }).reset_index(drop=True)

    if len(results) > 150:
        results = results.iloc[
            np.linspace(0, len(results) - 1, 150, dtype=int)
        ]

    mse = mean_squared_error(y_test, predictions)

    return {
        "mae": round(float(mean_absolute_error(y_test, predictions)), 2),
        "mse": round(float(mse), 2),
        "rmse": round(float(np.sqrt(mse)), 2),
        "r2_score": round(float(r2_score(y_test, predictions)), 4),
        "points": results.to_dict(orient="records")
    }


# 3. Pollutant correlation
@app.get("/correlation")
def pollutant_correlation():
    df = load_cleaned_data()

    correlation = df[FEATURES + [TARGET]].corr()

    return {
        "labels": correlation.columns.tolist(),
        "matrix": correlation.round(3).values.tolist()
    }


# 4. Historical AQI trends
@app.get("/historical-trends")
def historical_trends():
    if not ORIGINAL_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="city_day.csv was not found in the backend folder."
        )

    df = pd.read_csv(ORIGINAL_PATH)

    if "Date" not in df.columns or TARGET not in df.columns:
        raise HTTPException(
            status_code=500,
            detail="Original dataset must contain Date and AQI columns."
        )

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")
    df = df.dropna(subset=["Date", TARGET])

    # Average AQI across cities for each date
    daily = (
        df.groupby("Date")[TARGET]
        .mean()
        .reset_index()
        .sort_values("Date")
    )

    return {
        "points": [
            {
                "date": row["Date"].strftime("%Y-%m-%d"),
                "aqi": round(float(row[TARGET]), 2)
            }
            for _, row in daily.iterrows()
        ]
    }
