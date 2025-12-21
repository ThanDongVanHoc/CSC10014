"""
Medical Translation Card - FastAPI Application
API service để tạo thẻ dịch thuật y khoa cấp cứu
"""

from typing import Optional
from datetime import datetime
from contextlib import asynccontextmanager
from dataclasses import asdict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from models import (
    MedicalCardInput, Identity, MedicalCritical
)
from services import MedicalCardGenerator, MedicalTerminologyService
from medical_terminology import TRIAGE_LEVELS, SYMPTOM_DICTIONARY


# ==================== LIFESPAN ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    print("🏥 Medical Translation Card Service starting...")
    print(f"📋 Loaded {len(SYMPTOM_DICTIONARY)} symptom terms")
    print(f"🤖 AI Service: {'available' if settings.is_ai_available else 'not configured'}")
    print("✅ Service ready!")
    yield
    print("👋 Medical Translation Card Service shutting down...")


# ==================== APP INITIALIZATION ====================

app = FastAPI(
    title=settings.app.app_name,
    description="""
## 🏥 Thẻ Dịch Thuật Y Khoa Cấp Cứu

API service để tự động tạo **Medical Translation Card** - Thẻ tóm tắt bệnh lý song ngữ Anh-Việt 
dành cho bệnh nhân nước ngoài tại Việt Nam.

### 🎯 Tính năng chính:
- **Chuẩn hóa thuật ngữ y khoa**: Chuyển đổi triệu chứng thành thuật ngữ chuyên ngành
- **Phân loại cấp cứu (Triage)**: Tự động phân loại mức độ ưu tiên theo Bộ Y tế VN
- **Song ngữ Anh-Việt**: Thuật ngữ được hiển thị cả 2 ngôn ngữ
- **Cảnh báo dị ứng**: Nhận diện và cảnh báo dị ứng nghiêm trọng
- **AI Enhancement**: Sử dụng Gemini AI để chuẩn hóa thuật ngữ không có trong database
""",
    version=settings.app.version,
    lifespan=lifespan
)


# ==================== MIDDLEWARE ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== GLOBAL INSTANCES ====================

# Singleton instances - chỉ khởi tạo một lần
_generator: Optional[MedicalCardGenerator] = None


def get_generator() -> MedicalCardGenerator:
    """Get or create MedicalCardGenerator singleton"""
    global _generator
    if _generator is None:
        _generator = MedicalCardGenerator()
    return _generator


# ==================== EXCEPTION HANDLERS ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "code": f"HTTP_{exc.status_code}"
        }
    )


# ==================== HEALTH ENDPOINTS ====================

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "service": settings.app.app_name,
        "status": "healthy",
        "version": settings.app.version,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "components": {
            "api": "ok",
            "terminology_db": "ok",
            "ai_service": "available" if settings.is_ai_available else "not_configured"
        },
        "timestamp": datetime.now().isoformat()
    }


# ==================== MEDICAL CARD ENDPOINTS ====================

@app.post(
    "/api/v1/medical-card/generate",
    tags=["Medical Card"],
    summary="Tạo Medical Translation Card",
    description="Tạo thẻ dịch thuật y khoa đầy đủ từ thông tin bệnh nhân."
)
async def generate_medical_card(input_data: dict):
    """Endpoint chính để tạo Medical Translation Card"""
    try:
        identity_data = input_data.get("identity", {})
        medical_data = input_data.get("medical_critical", {})
        
        card_input = MedicalCardInput(
            identity=Identity(**identity_data),
            medical_critical=MedicalCritical(**medical_data)
        )
        
        card = get_generator().generate_card(card_input)
        return asdict(card)
    
    except TypeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid input data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating medical card: {str(e)}")


@app.post(
    "/api/v1/medical-card/generate-compact",
    tags=["Medical Card"],
    summary="Tạo Compact Medical Card",
    description="Tạo thẻ dịch thuật y khoa phiên bản tối ưu - chỉ chứa thông tin cần thiết nhất."
)
async def generate_compact_medical_card(input_data: dict):
    """Endpoint tạo Compact Medical Translation Card"""
    try:
        identity_data = input_data.get("identity", {})
        medical_data = input_data.get("medical_critical", {})
        
        card_input = MedicalCardInput(
            identity=Identity(**identity_data),
            medical_critical=MedicalCritical(**medical_data)
        )
        
        card = get_generator().generate_compact_card(card_input)
        return asdict(card)
    
    except TypeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid input data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating compact card: {str(e)}")


# ==================== TERMINOLOGY ENDPOINTS ====================

@app.post(
    "/api/v1/symptoms/standardize",
    tags=["Terminology"],
    summary="Chuẩn hóa triệu chứng",
    description="Chuẩn hóa triệu chứng thành thuật ngữ y khoa. Tự động sử dụng AI nếu không có trong database."
)
async def standardize_symptom(symptom: str):
    """Chuẩn hóa triệu chứng thành thuật ngữ y khoa"""
    result = get_generator().terminology_service.standardize_symptom(symptom)
    
    return {
        "original": symptom,
        "standardized": {
            "en": result.get("en"),
            "vi": result.get("vi")
        },
        "category": result.get("category"),
        "triage_hint": result.get("triage_hint"),
        "clinical_note": result.get("clinical_note"),
        "found_in_database": result.get("found_in_db", False),
        "source": result.get("source", "unknown")
    }


# ==================== REFERENCE ENDPOINTS ====================

@app.get(
    "/api/v1/triage/levels",
    tags=["Reference"],
    summary="Danh sách cấp độ Triage"
)
async def get_triage_levels():
    """Lấy thông tin các cấp độ triage"""
    levels = []
    for level, data in TRIAGE_LEVELS.items():
        levels.append({
            "level": level.value,
            "color": data["color"],
            "color_hex": data["color_hex"],
            "name": {"en": data["name_en"], "vi": data["name_vi"]},
            "response_time": data["response_time"],
            "examples": data["examples"][:3]
        })
    return {"triage_levels": levels}


@app.get(
    "/api/v1/terminology/search",
    tags=["Terminology"],
    summary="Tìm kiếm thuật ngữ"
)
async def search_terminology(query: str, limit: int = 10):
    """Tìm kiếm thuật ngữ y khoa trong database"""
    results = []
    query_lower = query.lower()
    
    for key, data in SYMPTOM_DICTIONARY.items():
        if query_lower in key or query_lower in str(data.get("vi", "")).lower():
            results.append({
                "term": key,
                "en": data.get("en", key),
                "vi": data.get("vi", key),
                "category": data.get("category"),
                "clinical_note": data.get("clinical_note")
            })
            
            if len(results) >= limit:
                break
    
    return {"query": query, "count": len(results), "results": results}


@app.get(
    "/api/v1/example",
    tags=["Reference"],
    summary="Ví dụ input/output"
)
async def get_example():
    """Trả về ví dụ input/output"""
    return {
        "description": "Ví dụ input để tạo Medical Translation Card",
        "example_input": {
            "identity": {
                "userId": "user_123",
                "full_name": "Alex Mueller",
                "nationality": "Germany",
                "age": 24,
                "gender": "Male",
                "date_of_birth": "15/03/2001",
                "emergency_contact": "Maria Mueller",
                "emergency_contact_phone": "+49 170 1234567"
            },
            "medical_critical": {
                "blood_type": "A+",
                "allergies": ["Aspirin", "Penicillin"],
                "current_symptoms": "Đau ngực, khó thở",
                "Medications": ["Metoprolol", "Atorvastatin"],
                "Medical_history": ["Hypertension", "Coronary Stent"],
                "surgical_history": ["Appendectomy"]
            }
        },
        "endpoints": [
            "POST /api/v1/medical-card/generate",
            "POST /api/v1/medical-card/generate-compact"
        ]
    }


# ==================== RUN SERVER ====================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.app.host,
        port=settings.app.port,
        reload=settings.app.debug,
        log_level="info"
    )
