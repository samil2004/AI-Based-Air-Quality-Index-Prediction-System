from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func

from database import Base


class AQIPrediction(Base):

    __tablename__ = "aqi_predictions"

    id = Column(Integer, primary_key=True, index=True)

    state = Column(String(100))
    city = Column(String(100))

    pm25 = Column(Float)
    pm10 = Column(Float)
    no2 = Column(Float)
    co = Column(Float)
    o3 = Column(Float)
    so2 = Column(Float)

    predicted_aqi = Column(Float)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )