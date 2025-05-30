from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routes import router  # import router dari routes.py

app = FastAPI()

# Mount folder images sebagai static files
app.mount("/images", StaticFiles(directory="images"), name="images")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Include router yang berisi semua route
app.include_router(router)
