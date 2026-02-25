from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper function to serialize MongoDB objects
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ============ MODELS ============

class Task(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    title: str
    description: Optional[str] = None
    time: str  # ISO format datetime string
    category: str  # Work, Health, Food, Personal
    status: str = "pending"  # pending, completed, snoozed
    reminderEnabled: bool = True
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completedAt: Optional[str] = None
    snoozedUntil: Optional[str] = None
    notificationId: Optional[str] = None
    
    class Config:
        populate_by_name = True

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    time: str
    category: str
    reminderEnabled: bool = True

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    time: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    reminderEnabled: Optional[bool] = None
    completedAt: Optional[str] = None
    snoozedUntil: Optional[str] = None
    notificationId: Optional[str] = None

class FoodPlan(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    date: str  # YYYY-MM-DD format
    mealType: str  # breakfast, lunch, dinner
    items: List[str]
    eaten: bool = False
    skipped: bool = False
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    class Config:
        populate_by_name = True

class FoodPlanCreate(BaseModel):
    date: str
    mealType: str
    items: List[str]

class FoodPlanUpdate(BaseModel):
    items: Optional[List[str]] = None
    eaten: Optional[bool] = None
    skipped: Optional[bool] = None

class UserPreferences(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    darkMode: bool = True
    notificationFrequency: int = 5  # minutes
    lastActivity: Optional[str] = None
    
    class Config:
        populate_by_name = True

class UserStats(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    currentStreak: int = 0
    longestStreak: int = 0
    totalTasksCompleted: int = 0
    completionRates: dict = {}  # {"2025-01-15": 0.75}
    lastUpdated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    class Config:
        populate_by_name = True

class SyncData(BaseModel):
    tasks: List[Task]
    foodPlans: List[FoodPlan]
    preferences: Optional[UserPreferences] = None
    stats: Optional[UserStats] = None

# ============ TASK ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "LifeTracker API", "status": "running"}

@api_router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    task_dict = task.model_dump()
    task_dict["createdAt"] = datetime.utcnow().isoformat()
    task_dict["status"] = "pending"
    
    result = await db.tasks.insert_one(task_dict)
    created_task = await db.tasks.find_one({"_id": result.inserted_id})
    return Task(**serialize_doc(created_task))

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(status: Optional[str] = None, date: Optional[str] = None, limit: int = 100):
    query = {}
    if status:
        query["status"] = status
    if date:
        # Get tasks for a specific date
        query["time"] = {"$regex": f"^{date}"}
    
    tasks = await db.tasks.find(query).sort("time", 1).limit(limit).to_list(limit)
    return [Task(**serialize_doc(task)) for task in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    try:
        task = await db.tasks.find_one({"_id": ObjectId(task_id)})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return Task(**serialize_doc(task))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    try:
        update_data = {k: v for k, v in task_update.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = await db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        
        updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
        return Task(**serialize_doc(updated_task))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    try:
        result = await db.tasks.delete_one({"_id": ObjectId(task_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ FOOD PLAN ENDPOINTS ============

@api_router.post("/food-plans", response_model=FoodPlan)
async def create_food_plan(food_plan: FoodPlanCreate):
    food_plan_dict = food_plan.model_dump()
    food_plan_dict["createdAt"] = datetime.utcnow().isoformat()
    food_plan_dict["eaten"] = False
    food_plan_dict["skipped"] = False
    
    result = await db.food_plans.insert_one(food_plan_dict)
    created_food_plan = await db.food_plans.find_one({"_id": result.inserted_id})
    return FoodPlan(**serialize_doc(created_food_plan))

@api_router.get("/food-plans", response_model=List[FoodPlan])
async def get_food_plans(date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, limit: int = 100):
    query = {}
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    food_plans = await db.food_plans.find(query).sort("date", -1).limit(limit).to_list(limit)
    return [FoodPlan(**serialize_doc(fp)) for fp in food_plans]

@api_router.get("/food-plans/{food_plan_id}", response_model=FoodPlan)
async def get_food_plan(food_plan_id: str):
    try:
        food_plan = await db.food_plans.find_one({"_id": ObjectId(food_plan_id)})
        if not food_plan:
            raise HTTPException(status_code=404, detail="Food plan not found")
        return FoodPlan(**serialize_doc(food_plan))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/food-plans/{food_plan_id}", response_model=FoodPlan)
async def update_food_plan(food_plan_id: str, food_plan_update: FoodPlanUpdate):
    try:
        update_data = {k: v for k, v in food_plan_update.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = await db.food_plans.update_one(
            {"_id": ObjectId(food_plan_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Food plan not found")
        
        updated_food_plan = await db.food_plans.find_one({"_id": ObjectId(food_plan_id)})
        return FoodPlan(**serialize_doc(updated_food_plan))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/food-plans/{food_plan_id}")
async def delete_food_plan(food_plan_id: str):
    try:
        result = await db.food_plans.delete_one({"_id": ObjectId(food_plan_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Food plan not found")
        return {"message": "Food plan deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ USER PREFERENCES ENDPOINTS ============

@api_router.get("/preferences", response_model=UserPreferences)
async def get_preferences():
    prefs = await db.preferences.find_one({})
    if not prefs:
        # Create default preferences
        default_prefs = {
            "darkMode": True,
            "notificationFrequency": 5,
            "lastActivity": datetime.utcnow().isoformat()
        }
        result = await db.preferences.insert_one(default_prefs)
        prefs = await db.preferences.find_one({"_id": result.inserted_id})
    return UserPreferences(**serialize_doc(prefs))

@api_router.put("/preferences", response_model=UserPreferences)
async def update_preferences(preferences: UserPreferences):
    prefs = await db.preferences.find_one({})
    update_data = preferences.model_dump(exclude={"id"})
    
    if prefs:
        await db.preferences.update_one(
            {"_id": prefs["_id"]},
            {"$set": update_data}
        )
        updated_prefs = await db.preferences.find_one({"_id": prefs["_id"]})
    else:
        result = await db.preferences.insert_one(update_data)
        updated_prefs = await db.preferences.find_one({"_id": result.inserted_id})
    
    return UserPreferences(**serialize_doc(updated_prefs))

# ============ USER STATS ENDPOINTS ============

@api_router.get("/stats", response_model=UserStats)
async def get_stats():
    stats = await db.stats.find_one({})
    if not stats:
        # Create default stats
        default_stats = {
            "currentStreak": 0,
            "longestStreak": 0,
            "totalTasksCompleted": 0,
            "completionRates": {},
            "lastUpdated": datetime.utcnow().isoformat()
        }
        result = await db.stats.insert_one(default_stats)
        stats = await db.stats.find_one({"_id": result.inserted_id})
    return UserStats(**serialize_doc(stats))

@api_router.put("/stats", response_model=UserStats)
async def update_stats(stats_update: UserStats):
    stats = await db.stats.find_one({})
    update_data = stats_update.model_dump(exclude={"id"})
    update_data["lastUpdated"] = datetime.utcnow().isoformat()
    
    if stats:
        await db.stats.update_one(
            {"_id": stats["_id"]},
            {"$set": update_data}
        )
        updated_stats = await db.stats.find_one({"_id": stats["_id"]})
    else:
        result = await db.stats.insert_one(update_data)
        updated_stats = await db.stats.find_one({"_id": result.inserted_id})
    
    return UserStats(**serialize_doc(updated_stats))

# ============ SYNC ENDPOINTS ============

@api_router.post("/sync")
async def sync_data(sync_data: SyncData):
    """Sync local data to cloud"""
    synced_count = 0
    
    # Sync tasks
    for task in sync_data.tasks:
        task_dict = task.model_dump(exclude={"id"})
        if task.id:
            # Update existing
            await db.tasks.update_one(
                {"_id": ObjectId(task.id)},
                {"$set": task_dict},
                upsert=True
            )
        else:
            # Insert new
            await db.tasks.insert_one(task_dict)
        synced_count += 1
    
    # Sync food plans
    for food_plan in sync_data.foodPlans:
        fp_dict = food_plan.model_dump(exclude={"id"})
        if food_plan.id:
            await db.food_plans.update_one(
                {"_id": ObjectId(food_plan.id)},
                {"$set": fp_dict},
                upsert=True
            )
        else:
            await db.food_plans.insert_one(fp_dict)
        synced_count += 1
    
    # Sync preferences
    if sync_data.preferences:
        prefs_dict = sync_data.preferences.model_dump(exclude={"id"})
        await db.preferences.update_one({}, {"$set": prefs_dict}, upsert=True)
        synced_count += 1
    
    # Sync stats
    if sync_data.stats:
        stats_dict = sync_data.stats.model_dump(exclude={"id"})
        await db.stats.update_one({}, {"$set": stats_dict}, upsert=True)
        synced_count += 1
    
    return {
        "message": "Data synced successfully",
        "synced_count": synced_count
    }

@api_router.get("/sync")
async def get_sync_data():
    """Get all data from cloud for sync"""
    tasks = await db.tasks.find().to_list(1000)
    food_plans = await db.food_plans.find().to_list(1000)
    preferences = await db.preferences.find_one({})
    stats = await db.stats.find_one({})
    
    return {
        "tasks": [Task(**serialize_doc(task)) for task in tasks],
        "foodPlans": [FoodPlan(**serialize_doc(fp)) for fp in food_plans],
        "preferences": UserPreferences(**serialize_doc(preferences)) if preferences else None,
        "stats": UserStats(**serialize_doc(stats)) if stats else None
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
