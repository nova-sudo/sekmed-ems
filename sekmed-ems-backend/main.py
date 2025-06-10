from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import string
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
from datetime import datetime
import json
from typing import List

# Load environment variables
load_dotenv()

app = FastAPI()

# Enable CORS to allow communication with the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Updated to match frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Atlas connection
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set")
client = MongoClient(MONGO_URI)
db = client["sekmed"]
hospitals_collection = db["hospitals"]
alerts_collection = db["alerts"]


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)


manager = ConnectionManager()


# Pydantic model for registration
class HospitalRegistration(BaseModel):
    hospital_name: str
    email: str


# Pydantic model for login
class HospitalLogin(BaseModel):
    hospital_id: str


# Pydantic model for adding an alert
class Alert(BaseModel):
    Location: dict
    premature_diagnoses: str


def generate_hospital_id() -> str:
    """Generate a unique 4-character alphanumeric ID."""
    while True:
        hospital_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        if not hospitals_collection.find_one({"hospital_id": hospital_id}):
            return hospital_id


@app.post("/api/register")
async def register_hospital(hospital: HospitalRegistration):
    """Register a new hospital and return a unique ID."""
    if hospitals_collection.find_one({"email": hospital.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    hospital_id = generate_hospital_id()
    hospital_data = {
        "hospital_id": hospital_id,
        "hospital_name": hospital.hospital_name,
        "email": hospital.email
    }
    hospitals_collection.insert_one(hospital_data)
    return {"hospital_id": hospital_id, "hospital_name": hospital.hospital_name}


@app.post("/api/login")
async def login_hospital(login: HospitalLogin):
    """Authenticate a hospital using hospital ID."""
    hospital = hospitals_collection.find_one({"hospital_id": login.hospital_id})
    if not hospital:
        raise HTTPException(status_code=401, detail="Invalid hospital ID")
    return {"hospital_id": hospital["hospital_id"], "hospital_name": hospital["hospital_name"]}


@app.post("/api/add-alert")
async def add_alert(alert: Alert):
    """Add a new alert to the alerts collection and broadcast to WebSocket clients."""
    alert_data = {
        "Location": alert.Location,
        "premature_diagnoses": alert.premature_diagnoses,
        "timestamp": datetime.utcnow().isoformat()
    }
    result = alerts_collection.insert_one(alert_data)
    alert_response = {
        "id": str(result.inserted_id),
        "Location": alert.Location,
        "premature_diagnoses": alert.premature_diagnoses,
        "timestamp": alert_data["timestamp"]
    }
    # Broadcast the new alert to all connected WebSocket clients
    await manager.broadcast(alert_response)
    return alert_response


@app.get("/api/alerts")
async def get_alerts():
    """Retrieve all alerts from the alerts collection."""
    alerts = []
    for alert in alerts_collection.find():
        # Provide a fallback for missing or malformed Location field
        location = alert.get("Location", {"lat": None, "lng": None})

        # Handle legacy data with latitude/longitude fields
        if "latitude" in alert and "longitude" in alert and "Location" not in alert:
            location = {"lat": alert["latitude"], "lng": alert["longitude"]}

        alerts.append({
            "id": str(alert["_id"]),
            "Location": location,
            "premature_diagnoses": alert.get("premature_diagnoses", ""),
            "timestamp": alert.get("timestamp", "")
        })
    return alerts


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint to push new alerts to connected clients."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; actual updates are sent via broadcast
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.on_event("shutdown")
def close_mongo_connection():
    """Close MongoDB connection on app shutdown."""
    client.close()