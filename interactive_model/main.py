from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

load_dotenv()

app = FastAPI(title="Interactive Model API")

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

# Schema for information collection
class InformationSchema(BaseModel):
    current_address: Optional[str] = None  # 0 = missing, 1 = collected
    num_people: Optional[int] = None
    nationality: Optional[str] = None
    problem: Optional[str] = None
    full_name: Optional[str] = None
    birth_year: Optional[int] = None

class Query1Request(BaseModel):
    query: str
    collected_info: Optional[Dict[str, Any]] = None

class Query1Response(BaseModel):
    questions: List[str]
    collected_info: Dict[str, Any]
    is_complete: bool
    info_status: Dict[str, int]  # 0 = missing, 1 = collected, 0.5 = partial

class Query2Request(BaseModel):
    original_query: str
    top_k_results: List[Dict[str, Any]]
    collected_info: Dict[str, Any]

class Query2Response(BaseModel):
    guide: Dict[str, Any]
    top_result: Dict[str, Any]

def analyze_query_for_info(query: str, collected_info: Dict[str, Any]) -> Dict[str, int]:
    """
    Analyze query and existing collected info to determine what information is available.
    Returns a dict with keys as info fields and values as 0 (missing), 1 (collected), or 0.5 (partial)
    """
    required_fields = ["current_address", "num_people", "nationality", "problem", "full_name", "birth_year"]
    status = {}
    
    # First, check collected_info directly for existing values
    for field in required_fields:
        if field in collected_info and collected_info[field] is not None and collected_info[field] != "":
            status[field] = 1
        else:
            status[field] = 0
    
    # If any field is still missing, ask Gemini to analyze the current query for new info
    if any(s == 0 for s in status.values()):
        prompt = f"""
Analyze this query and determine if it contains information for any of these fields:

Query: "{query}"

Fields to check (only mark as 1 if CLEARLY present in the query):
- current_address: Current residential address
- num_people: Number of people affected by the problem
- nationality: Country/nationality of the person
- problem: What problem they are facing
- full_name: Full name of the person
- birth_year: Year of birth

Current status based on existing data:
{json.dumps(status, ensure_ascii=False)}

Return ONLY a JSON object with field names as keys and status (0, 0.5, or 1) as values.
- 1: Information is clearly available in the query
- 0: Information is not mentioned in the query
- 0.5: Information is partially mentioned or unclear

Keep existing status=1 fields as 1. Only update fields that are 0 if found in the query.
"""
        
        try:
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            new_status = json.loads(response_text.strip())
            # Merge: keep 1s, update 0s with new findings
            for field in required_fields:
                if status[field] == 0 and field in new_status:
                    status[field] = new_status[field]
        except Exception as e:
            print(f"Error analyzing query: {e}")
            print(f"Response text: {response.text if 'response' in locals() else 'N/A'}")
    
    return status

def extract_info_from_query(query: str, collected_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract information from the query and merge with existing collected_info
    """
    prompt = f"""
You are extracting structured information from a Vietnamese user query.

Query: "{query}"

Existing information:
{json.dumps(collected_info, ensure_ascii=False, indent=2)}

Extract these fields ONLY if clearly present in the query:
- current_address: Current residential address (e.g., "quận 1", "123 đường ABC")
- num_people: Number of people (must be a number)
- nationality: Country/nationality (e.g., "Indonesia", "Việt Nam", "người Indonesia")
- problem: What problem they're facing (e.g., "gia hạn visa", "làm hộ chiếu")
- full_name: Person's full name (e.g., "Budi Santoso", "Nguyễn Văn A")
- birth_year: Year of birth (e.g., 1990, 1985)

IMPORTANT:
- Only extract information that is EXPLICITLY mentioned in the query
- Merge with existing information (keep old values if not updated)
- Return valid JSON only
- Use null for missing fields

Return format:
{{"nationality": "Indonesia", "problem": "gia hạn visa", "current_address": "quận 1"}}
"""
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        print(f"\n[DEBUG] Raw Gemini response for extraction:")
        print(response_text)
        print(f"[DEBUG] End of response\n")
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()
        
        extracted = json.loads(response_text.strip())
        print(f"[DEBUG] Extracted data: {extracted}")
        
        # Merge with existing collected_info
        updated_info = {**collected_info, **{k: v for k, v in extracted.items() if v is not None and v != ""}}
        print(f"[DEBUG] Updated info: {updated_info}")
        
        return updated_info
    except Exception as e:
        print(f"[ERROR] Error extracting info: {e}")
        print(f"[ERROR] Response text: {response.text if 'response' in locals() else 'N/A'}")
        return collected_info

def generate_questions(info_status: Dict[str, int]) -> List[str]:
    """
    Generate questions for missing information fields (status = 0)
    """
    missing_fields = [field for field, status in info_status.items() if status == 0]
    
    if not missing_fields:
        return []
    
    # Map field names to Vietnamese questions
    field_to_question = {
        "current_address": "Bạn đang ở địa chỉ nào?",
        "num_people": "Có bao nhiêu người gặp vấn đề này?",
        "nationality": "Quốc tịch của bạn là gì?",
        "problem": "Vấn đề bạn đang gặp phải là gì?",
        "full_name": "Tên đầy đủ của bạn là gì?",
        "birth_year": "Bạn sinh năm nào?"
    }
    
    # Generate questions for missing fields
    questions = [field_to_question.get(field, f"Vui lòng cung cấp {field}") for field in missing_fields[:3]]
    
    return questions

@app.post("/query1", response_model=Query1Response)
async def query_type_1(request: Query1Request):
    """
    Query Type 1: Interactive information collection
    Collects user information until complete, then signals backend to call Model A
    """
    # Initialize collected_info if not provided
    collected_info = request.collected_info if request.collected_info else {}
    
    # Extract information from the current query
    collected_info = extract_info_from_query(request.query, collected_info)
    
    # Analyze what information we have
    info_status = analyze_query_for_info(request.query, collected_info)
    
    # Filter out partial information (0.5) - don't send to backend
    clean_status = {k: v for k, v in info_status.items() if v != 0.5}
    clean_collected_info = {k: v for k, v in collected_info.items() if info_status.get(k, 0) != 0.5}
    
    # Check if all required information is collected
    is_complete = all(status == 1 for status in clean_status.values())
    
    # Generate questions for missing information
    questions = generate_questions(clean_status) if not is_complete else []
    
    return Query1Response(
        questions=questions,
        collected_info=clean_collected_info,
        is_complete=is_complete,
        info_status=clean_status
    )

@app.post("/query2", response_model=Query2Response)
async def query_type_2(request: Query2Request):
    """
    Query Type 2: Generate guidance based on top-k results from Model A
    Uses RAG to prioritize government sources, then lower-tier sources, then reasoning
    """
    # Get the top result
    top_result = request.top_k_results[0] if request.top_k_results else None
    
    if not top_result:
        raise HTTPException(status_code=400, detail="No results provided from Model A")
    
    # Generate comprehensive guide using Gemini with RAG approach
    prompt = f"""
You are creating a comprehensive guide for a user who needs to visit/contact the following location:

Location Information:
{json.dumps(top_result, ensure_ascii=False, indent=2)}

Original User Query: "{request.original_query}"

User Information:
{json.dumps(request.collected_info, ensure_ascii=False, indent=2)}

Create a detailed, structured guide in Vietnamese with the following sections:

1. **Chuẩn bị** (Preparation):
   - What to prepare before going
   - Documents needed
   - Things to note

2. **Giấy tờ cần thiết** (Required Documents):
   - List all necessary documents
   - Copies or originals
   - Validity requirements

3. **Địa điểm và thời gian** (Location and Time):
   - Exact address and how to get there
   - Operating hours
   - Contact information

4. **Thủ tục** (Procedures):
   - Step-by-step process
   - Expected waiting time
   - Fees (if any)

5. **Lưu ý quan trọng** (Important Notes):
   - Special requirements based on nationality
   - Common mistakes to avoid
   - Tips for faster processing

When providing information:
- Prioritize official government sources and regulations
- If specific details are not available, provide general guidance based on the location type
- Be clear and concise
- Use bullet points for better readability

Return the guide as a JSON object with these section names as keys and content as values.
"""
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        guide = json.loads(response_text.strip())
    except Exception as e:
        print(f"Error generating guide: {e}")
        # Fallback guide structure
        guide = {
            "Chuẩn bị": f"Chuẩn bị đầy đủ giấy tờ tùy thân và tài liệu liên quan đến vấn đề: {request.collected_info.get('problem', 'N/A')}",
            "Giấy tờ cần thiết": "CMND/CCCD, Hộ chiếu (nếu là người nước ngoài), Các giấy tờ liên quan đến vấn đề",
            "Địa điểm và thời gian": f"Địa chỉ: {top_result.get('DiaChi', 'N/A')}\nĐiện thoại: {top_result.get('SDT', 'N/A')}\nWebsite: {top_result.get('Website', 'N/A')}",
            "Thủ tục": "Liên hệ trước để hỏi thủ tục cụ thể. Mang theo đầy đủ giấy tờ và đến địa điểm trong giờ hành chính.",
            "Lưu ý quan trọng": f"Đối với quốc tịch {request.collected_info.get('nationality', 'N/A')}, vui lòng kiểm tra các yêu cầu đặc biệt."
        }
    
    return Query2Response(
        guide=guide,
        top_result=top_result
    )

@app.get("/")
async def root():
    return {
        "message": "Interactive Model API",
        "endpoints": {
            "/query1": "Interactive information collection (Query Type 1)",
            "/query2": "Generate guidance from Model A results (Query Type 2)"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
