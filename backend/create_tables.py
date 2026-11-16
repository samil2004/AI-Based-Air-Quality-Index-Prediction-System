from database import engine, Base
from models import AQIPrediction

Base.metadata.create_all(bind=engine)

print("AQI prediction table created successfully!")