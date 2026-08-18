from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel

from config import settings
from database import get_db, Base, engine, Reel, SessionLocal
from ai_service import analyze_and_recommend, MOCK_REELS_DB

# Create the database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ReelsWise AI API",
    description="Backend API for the ReelWise AI PromptWars hackathon entry.",
    version="0.1.0"
)

# Configure CORS so our React frontend can query the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon/development. Can restrict to specific domains in prod.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Check if database has seeded reels
        if db.query(Reel).count() == 0:
            for r in MOCK_REELS_DB:
                db_reel = Reel(
                    id=r["id"],
                    title=r["title"],
                    description=r["description"],
                    category=r["category"],
                    technology=r["technology"],
                    views=r["views"],
                    likes=r["likes"],
                    shares=r["shares"],
                    saves=r["saves"]
                )
                db.add(db_reel)
            db.commit()
            print("Successfully seeded Reels database.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

# Pydantic Schemas for Validation
class ReelResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    technology: str
    views: int
    likes: int
    shares: int
    saves: int

    class Config:
        from_attributes = True

class InteractionInput(BaseModel):
    id: int
    title: str
    description: str
    category: str
    technology: str
    views: Optional[int] = 0
    likes: Optional[int] = 0
    shares: Optional[int] = 0
    saves: Optional[int] = 0

class QueryRequest(BaseModel):
    interactions: List[InteractionInput]

class AnalyzeResponse(BaseModel):
    interest: str
    why_inferred: str

class RecommendationResponse(BaseModel):
    current_reel: Optional[str] = None
    interest_detected: str
    why: str
    recommended_tech_reel: str
    category: str
    why_this_recommendation: str
    difficulty: str
    confidence: str
    recommended_reel_details: ReelResponse

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "ReelsWise AI API is running successfully!",
        "version": "0.1.0"
    }

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    gemini_configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() != "" and "your_gemini_api_key" not in settings.GEMINI_API_KEY)
    
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        print(f"Database health check failed: {e}")
        
    return {
        "status": "healthy" if db_ok else "unhealthy",
        "database_connected": db_ok,
        "gemini_api_key_configured": gemini_configured,
        "env": "development"
    }

@app.get("/api/reels", response_model=List[ReelResponse])
def get_reels(category: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Reel)
    if category and category.strip() != "" and category.lower() != "all":
        query = query.filter(Reel.category.ilike(category))
    return query.all()

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_interests(payload: QueryRequest):
    if not payload.interactions:
        return {
            "interest": "None",
            "why_inferred": "No interacted reels provided."
        }
    
    reels_dict_list = [item.dict() for item in payload.interactions]
    result = await analyze_and_recommend(reels_dict_list)
    return {
        "interest": result["interest"],
        "why_inferred": result["why_inferred"]
    }

@app.post("/api/recommend", response_model=RecommendationResponse)
async def recommend_reel(payload: QueryRequest):
    reels_dict_list = [item.dict() for item in payload.interactions]
    result = await analyze_and_recommend(reels_dict_list)
    
    # Extract the last interacted reel title as reference
    current_reel_ref = payload.interactions[-1].title if payload.interactions else "None"
    
    rec_reel = result["recommended_reel"]
    
    return {
        "current_reel": current_reel_ref,
        "interest_detected": result["interest"],
        "why": result["why_inferred"],
        "recommended_tech_reel": rec_reel["title"],
        "category": rec_reel["category"],
        "why_this_recommendation": result["why_recommendation"],
        "difficulty": result["difficulty"],
        "confidence": result["confidence"],
        "recommended_reel_details": ReelResponse.from_orm(Reel(**rec_reel)) if isinstance(rec_reel, dict) else rec_reel
    }

