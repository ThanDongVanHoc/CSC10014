"""
Refactored main.py using OOP principles
Clean, maintainable, and easy to extend
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Import our modular components
from config import REQUIRED_FIELDS, GEMINI_MODEL_NAME, API_HOST, API_PORT
from collector import InformationCollector
from question_generator import QuestionGenerator
from guide_generator import GuideGenerator

load_dotenv()

app = FastAPI(title="Interactive Model API")

# Initialize Gemini model
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel(GEMINI_MODEL_NAME)

# Initialize components
collector = InformationCollector(model)
question_gen = QuestionGenerator(model)
guide_gen = GuideGenerator(model)


# ============= Request/Response Models =============

class Query1Request(BaseModel):
    query: str
    collected_info: Optional[Dict[str, Any]] = None

class Query1Response(BaseModel):
    questions: List[str]
    collected_info: Dict[str, Any]
    is_complete: bool
    info_status: Dict[str, int]

class Query2Request(BaseModel):
    original_query: str
    top_k_results: List[Dict[str, Any]]
    collected_info: Dict[str, Any]

class Query2Response(BaseModel):
    guide: Dict[str, Any]
    top_result: Dict[str, Any]


# ============= Endpoints =============

@app.post("/query1", response_model=Query1Response)
async def query_type_1(request: Query1Request):
    """
    Query Type 1: Interactive information collection
    
    Flow:
    1. Extract info from query
    2. Analyze status of each field
    3. Filter partial info (0.5)
    4. Check if complete
    5. Generate questions (AI auto-detects user's language)
    """
    # Initialize
    collected_info = request.collected_info or {}
    
    # Extract information
    collected_info = collector.extract_from_query(request.query, collected_info)
    
    # Analyze status
    info_status = collector.analyze_status(request.query, collected_info)
    
    # Filter out partial info (0.5)
    clean_status = {k: v for k, v in info_status.items() if v != 0.5}
    clean_collected_info = {
        k: v for k, v in collected_info.items() 
        if info_status.get(k, 0) != 0.5
    }
    
    # Check completion
    is_complete = all(status == 1 for status in clean_status.values())
    
    # Generate questions (pass user query for language context)
    questions = [] if is_complete else question_gen.generate(clean_status, clean_collected_info, request.query)
    
    return Query1Response(
        questions=questions,
        collected_info=clean_collected_info,
        is_complete=is_complete,
        info_status=clean_status
    )


@app.post("/query2", response_model=Query2Response)
async def query_type_2(request: Query2Request):
    """
    Query Type 2: Generate guidance from Model A results
    
    Flow:
    1. Get top result
    2. Generate comprehensive guide (AI auto-detects user's language from query)
    3. Return structured guide
    """
    # Validate input
    if not request.top_k_results:
        raise HTTPException(status_code=400, detail="No results provided from Model A")
    
    top_result = request.top_k_results[0]
    
    # Generate guide (AI will detect language from original_query)
    guide = guide_gen.generate(
        top_result=top_result,
        original_query=request.original_query,
        user_info=request.collected_info
    )
    
    return Query2Response(
        guide=guide,
        top_result=top_result
    )


@app.get("/")
async def root():
    """API information"""
    return {
        "message": "Interactive Model API",
        "version": "2.0 (OOP Refactored)",
        "endpoints": {
            "/query1": "Interactive information collection (Query Type 1)",
            "/query2": "Generate guidance from Model A results (Query Type 2)",
            "/fields": "Get required fields configuration"
        }
    }


@app.get("/fields")
async def get_fields():
    """Get current required fields configuration"""
    return {
        "required_fields": REQUIRED_FIELDS,
        "count": len(REQUIRED_FIELDS)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
