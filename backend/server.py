from fastapi import FastAPI, APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False
)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Socket.IO app - mounted at /api/socket.io to work with Kubernetes ingress
socket_app = socketio.ASGIApp(sio, app, socketio_path='/api/socket.io')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    session_token: str
    user_id: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Passenger(BaseModel):
    passenger_id: str = Field(default_factory=lambda: f"pass_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PassengerCreate(BaseModel):
    name: str
    date: datetime

# ============= AUTH HELPERS =============

async def get_current_user(authorization: Optional[str] = None) -> Optional[User]:
    """Get current user from authorization header"""
    if not authorization:
        return None
    
    if not authorization.startswith('Bearer '):
        return None
    
    token = authorization.split('Bearer ')[1]
    
    # Check if session exists and is valid
    session = await db.user_sessions.find_one(
        {"session_token": token},
        {"_id": 0}
    )
    
    if not session:
        return None
    
    # Check expiration
    expires_at = session['expires_at']
    if not expires_at.tzinfo:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        # Session expired, delete it
        await db.user_sessions.delete_one({"session_token": token})
        return None
    
    # Get user
    user = await db.users.find_one(
        {"user_id": session['user_id']},
        {"_id": 0}
    )
    
    if not user:
        return None
    
    return User(**user)

# ============= AUTH ROUTES =============

@api_router.post("/auth/session")
async def create_session(session_data: dict):
    """Create a session from Emergent OAuth"""
    try:
        session_token = session_data.get('session_token')
        
        if not session_token:
            raise HTTPException(status_code=400, detail="Missing session_token")
        
        # Verify session with Emergent
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_token}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = response.json()
        
        # Check if user exists by email
        existing_user = await db.users.find_one(
            {"email": data['email']},
            {"_id": 0}
        )
        
        if existing_user:
            user_id = existing_user['user_id']
            # Update user info
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": data['name'],
                    "picture": data.get('picture')
                }}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = User(
                user_id=user_id,
                email=data['email'],
                name=data['name'],
                picture=data.get('picture')
            )
            await db.users.insert_one(user.dict())
        
        # Create session
        session = UserSession(
            session_token=session_token,
            user_id=user_id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        # Delete any existing sessions for this user
        await db.user_sessions.delete_many({"user_id": user_id})
        
        # Insert new session
        await db.user_sessions.insert_one(session.dict())
        
        # Get user data
        user_data = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        return {
            "session_token": session_token,
            "user": user_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None)):
    """Get current user info"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return user

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout user"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split('Bearer ')[1]
    
    # Delete session
    await db.user_sessions.delete_one({"session_token": token})
    
    return {"message": "Logged out successfully"}

# ============= PASSENGER ROUTES =============

@api_router.get("/passengers", response_model=List[Passenger])
async def get_passengers(authorization: Optional[str] = Header(None)):
    """Get all passengers for current user"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    passengers = await db.passengers.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return passengers

@api_router.post("/passengers", response_model=Passenger)
async def create_passenger(
    passenger_data: PassengerCreate,
    authorization: Optional[str] = Header(None)
):
    """Create a new passenger"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    passenger = Passenger(
        user_id=user.user_id,
        name=passenger_data.name,
        date=passenger_data.date
    )
    
    await db.passengers.insert_one(passenger.dict())
    
    return passenger

@api_router.delete("/passengers/{passenger_id}")
async def delete_passenger(
    passenger_id: str,
    authorization: Optional[str] = Header(None)
):
    """Delete a passenger"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.passengers.delete_one({
        "passenger_id": passenger_id,
        "user_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Passenger not found")
    
    return {"message": "Passenger deleted successfully"}

# ============= SOCKET.IO EVENTS =============

# Store connected users and their locations
connected_users: Dict[str, Dict[str, Any]] = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connected', {'sid': sid}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    
    # Remove user from connected users
    user_id = None
    for uid, data in connected_users.items():
        if data.get('sid') == sid:
            user_id = uid
            break
    
    if user_id:
        del connected_users[user_id]
        # Notify others that user disconnected
        await sio.emit('user_disconnected', {'user_id': user_id})

@sio.event
async def join_group(sid, data):
    """User joins the group"""
    try:
        user_id = data.get('user_id')
        user_name = data.get('user_name')
        user_picture = data.get('user_picture')
        
        connected_users[user_id] = {
            'sid': sid,
            'user_id': user_id,
            'user_name': user_name,
            'user_picture': user_picture,
            'location': None
        }
        
        # Notify others
        await sio.emit('user_joined', {
            'user_id': user_id,
            'user_name': user_name,
            'user_picture': user_picture
        }, skip_sid=sid)
        
        # Send list of connected users to the new user
        users_list = [
            {
                'user_id': u['user_id'],
                'user_name': u['user_name'],
                'user_picture': u['user_picture'],
                'location': u['location']
            }
            for u in connected_users.values()
            if u['user_id'] != user_id
        ]
        
        await sio.emit('users_list', {'users': users_list}, room=sid)
        
        logger.info(f"User {user_name} joined the group")
    except Exception as e:
        logger.error(f"Error in join_group: {e}")

@sio.event
async def send_message(sid, data):
    """Send text message to all users"""
    try:
        message = {
            'message_id': str(uuid.uuid4()),
            'user_id': data.get('user_id'),
            'user_name': data.get('user_name'),
            'user_picture': data.get('user_picture'),
            'text': data.get('text'),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Broadcast to all connected clients including sender
        await sio.emit('new_message', message)
        
        logger.info(f"Message from {data.get('user_name')}: {data.get('text')}")
    except Exception as e:
        logger.error(f"Error in send_message: {e}")

@sio.event
async def update_location(sid, data):
    """Update user location"""
    try:
        user_id = data.get('user_id')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if user_id in connected_users:
            connected_users[user_id]['location'] = {
                'latitude': latitude,
                'longitude': longitude
            }
            
            # Broadcast location update to all users
            await sio.emit('location_update', {
                'user_id': user_id,
                'latitude': latitude,
                'longitude': longitude
            })
    except Exception as e:
        logger.error(f"Error in update_location: {e}")

@sio.event
async def start_talking(sid, data):
    """User started talking (walkie-talkie)"""
    try:
        user_id = data.get('user_id')
        user_name = data.get('user_name')
        
        # Notify all users that someone is talking
        await sio.emit('user_talking', {
            'user_id': user_id,
            'user_name': user_name,
            'talking': True
        })
        
        logger.info(f"{user_name} started talking")
    except Exception as e:
        logger.error(f"Error in start_talking: {e}")

@sio.event
async def stop_talking(sid, data):
    """User stopped talking"""
    try:
        user_id = data.get('user_id')
        
        # Notify all users that person stopped talking
        await sio.emit('user_talking', {
            'user_id': user_id,
            'talking': False
        })
    except Exception as e:
        logger.error(f"Error in stop_talking: {e}")

@sio.event
async def voice_data(sid, data):
    """Stream voice data to all users"""
    try:
        # Broadcast audio data to all clients except sender
        await sio.emit('voice_stream', {
            'user_id': data.get('user_id'),
            'audio_data': data.get('audio_data')
        }, skip_sid=sid)
    except Exception as e:
        logger.error(f"Error in voice_data: {e}")

# ============= STARTUP & MIDDLEWARE =============

@app.on_event("startup")
async def startup_event():
    """Create indexes on startup"""
    try:
        # Users indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        
        # Sessions indexes
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index(
            "expires_at",
            expireAfterSeconds=0
        )
        
        # Passengers indexes
        await db.passengers.create_index("passenger_id", unique=True)
        await db.passengers.create_index("user_id")
        await db.passengers.create_index("date")
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
app.mount("/", socket_app)
