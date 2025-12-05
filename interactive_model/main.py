"""
Refactored main.py using OOP principles
Clean, maintainable, and easy to extend
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
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


# ============= Validation Functions =============

def validate_query1_request(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate Query1 request data"""
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object")
    
    if "query" not in data:
        raise HTTPException(status_code=400, detail="Missing required field: query")
    
    if not isinstance(data["query"], str):
        raise HTTPException(status_code=400, detail="Field 'query' must be a string")
    
    if "collected_info" in data and data["collected_info"] is not None:
        if not isinstance(data["collected_info"], dict):
            raise HTTPException(status_code=400, detail="Field 'collected_info' must be a dict or null")
    
    return {
        "query": data["query"],
        "collected_info": data.get("collected_info")
    }


def validate_query2_request(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate Query2 request data"""
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object")
    
    required_fields = ["original_query", "top_k_results", "collected_info"]
    for field in required_fields:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    if not isinstance(data["original_query"], str):
        raise HTTPException(status_code=400, detail="Field 'original_query' must be a string")
    
    if not isinstance(data["top_k_results"], list):
        raise HTTPException(status_code=400, detail="Field 'top_k_results' must be a list")
    
    if not isinstance(data["collected_info"], dict):
        raise HTTPException(status_code=400, detail="Field 'collected_info' must be a dict")
    
    return {
        "original_query": data["original_query"],
        "top_k_results": data["top_k_results"],
        "collected_info": data["collected_info"]
    }


# ============= Endpoints =============

@app.post("/query1")
async def query_type_1(request: Request) -> JSONResponse:
    """
    Query Type 1: Interactive information collection
    
    Flow:
    1. Extract info from query
    2. Analyze status of each field
    3. Filter partial info (0.5)
    4. Check if complete
    5. Generate questions (AI auto-detects user's language)
    """
    # Parse and validate request
    data = await request.json()
    validated_data = validate_query1_request(data)
    
    # Initialize
    collected_info = validated_data["collected_info"] or {}
    query = validated_data["query"]
    
    # Extract information
    collected_info = collector.extract_from_query(query, collected_info)
    
    # Filter relevant fields based on query (NEW FEATURE)
    relevant_fields = collector.filter_relevant_fields(query, collected_info)
    
    # Analyze status (only for relevant fields)
    info_status = collector.analyze_status(query, collected_info, relevant_fields)
    
    # Filter out partial info (0.5)
    clean_status = {k: v for k, v in info_status.items() if v != 0.5}
    clean_collected_info = {
        k: v for k, v in collected_info.items() 
        if info_status.get(k, 0) != 0.5
    }
    
    # Check completion (only check relevant fields)
    is_complete = all(status == 1 for status in clean_status.values())
    
    # Generate questions (max 5 important questions)
    questions = [] if is_complete else question_gen.generate(clean_status, clean_collected_info, query)
    
    return JSONResponse(content={
        "questions": questions,
        "collected_info": clean_collected_info,
        "is_complete": is_complete,
        "info_status": clean_status
    })


@app.post("/query2")
async def query_type_2(request: Request) -> JSONResponse:
    """
    Query Type 2: Generate guidance from Model A results
    
    Flow:
    1. Get top result
    2. Generate comprehensive guide (AI auto-detects user's language from query)
    3. Return structured guide
    """
    # Parse and validate request
    data = await request.json()
    validated_data = validate_query2_request(data)
    
    # Validate input
    if not validated_data["top_k_results"]:
        raise HTTPException(status_code=400, detail="No results provided from Model A")
    
    top_result = validated_data["top_k_results"][0]
    
    # Generate guide (AI will detect language from original_query)
    guide = guide_gen.generate(
        top_result=top_result,
        original_query=validated_data["original_query"],
        user_info=validated_data["collected_info"]
    )
    
    return JSONResponse(content={
        "guide": guide,
        "top_result": top_result
    })


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
