"""
Refactored main_v2.py - Version 2 with enhanced Query2
Query1: Same as original (interactive information collection)
Query2: Generate guides for ALL k locations (not just top 1)
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
from guide_generator_v2 import GuideGeneratorV2

load_dotenv()

app = FastAPI(title="Interactive Model API V2")

# Initialize Gemini model
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel(GEMINI_MODEL_NAME)

# Initialize components
collector = InformationCollector(model)
question_gen = QuestionGenerator(model)
guide_gen_v2 = GuideGeneratorV2(model)


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
    Query Type 1: Interactive information collection (OPTIMIZED - SINGLE API CALL)
    
    Flow:
    1. Single API call to: extract info, filter fields, analyze status, generate questions
    2. Filter partial info (0.5)
    3. Return result
    """
    # Parse and validate request
    data = await request.json()
    validated_data = validate_query1_request(data)
    
    # Initialize
    collected_info = validated_data["collected_info"] or {}
    query = validated_data["query"]
    
    # OPTIMIZED: Single API call for all operations
    result = collector.process_query_optimized(query, collected_info)
    
    # Filter out partial info (0.5)
    info_status = result.get("info_status", {})
    extracted_info = result.get("collected_info", collected_info)
    
    clean_status = {k: v for k, v in info_status.items() if v != 0.5}
    clean_collected_info = {
        k: v for k, v in extracted_info.items() 
        if info_status.get(k, 0) != 0.5
    }
    
    # Check completion (only check relevant fields)
    is_complete = all(status == 1 for status in clean_status.values()) if clean_status else False
    
    # Get questions from result (already generated in single call)
    questions = [] if is_complete else result.get("questions", [])
    
    return JSONResponse(content={
        "questions": questions,
        "collected_info": clean_collected_info,
        "is_complete": is_complete,
        "info_status": clean_status
    })


@app.post("/query2")
async def query_type_2(request: Request) -> JSONResponse:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY2"))

    """
    Query Type 2 V2: Generate guidance for ALL k locations (NOT just top 1)
    
    Flow:
    1. Get all k results
    2. Generate comprehensive guide for EACH location (AI auto-detects user's language from query)
    3. Return structured guides for all locations
    """
    # Parse and validate request
    data = await request.json()
    validated_data = validate_query2_request(data)
    
    # Validate input
    if not validated_data["top_k_results"]:
        raise HTTPException(status_code=400, detail="No results provided from Model A")
    
    # Generate guides for ALL k locations (AI will detect language from original_query)
    guides = guide_gen_v2.generate_for_all_locations(
        top_k_results=validated_data["top_k_results"],
        original_query=validated_data["original_query"],
        user_info=validated_data["collected_info"]
    )
    
    return JSONResponse(content={
        "total_locations": len(guides),
        "guides": guides
    })


@app.get("/")
async def root():
    """API information"""
    return {
        "message": "Interactive Model API V2",
        "version": "2.0 (Enhanced Query2 - Returns guides for ALL k locations)",
        "changes": {
            "query1": "Same as V1 - Interactive information collection",
            "query2": "NEW - Returns guides for ALL k locations instead of just top 1"
        },
        "endpoints": {
            "/query1": "Interactive information collection (Query Type 1)",
            "/query2": "Generate guidance for ALL locations from Model A results (Query Type 2 V2)",
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
