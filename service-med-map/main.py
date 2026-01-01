import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import time

# Import service core của bạn
from medical_map_service import MedicalMapService

# --- 1. ĐỊNH NGHĨA DATA MODELS (Pydantic) ---
# Giúp validate dữ liệu đầu vào tự động (sai format là báo lỗi ngay)

class UserContext(BaseModel):
    age: int
    gender: str = "All"
    chronic_conditions: List[str] = []

class Location(BaseModel):
    lat: float
    lng: float

class RequestData(BaseModel):
    location: Location
    symptoms: str

class SearchPayload(BaseModel):
    user_context: UserContext
    request: RequestData

# --- 2. KHỞI TẠO APP & SERVICE ---
app = FastAPI(
    title="Medical Map AI Service",
    description="API tìm kiếm bệnh viện thông minh dựa trên AI & Real-time Load",
    version="1.0.0"
)

# Khởi tạo Service 1 lần duy nhất (Singleton) khi server start
# Điều này giúp load dữ liệu vào RAM chỉ 1 lần, không load lại mỗi request
med_service = MedicalMapService()

# --- 3. API ENDPOINTS ---

@app.get("/")
def health_check():
    """Kiểm tra server còn sống không"""
    return {"status": "ok", "service": "Medical Map AI"}

@app.post("/api/v1/find-hospitals")
async def find_hospitals(payload: SearchPayload):
    """
    API Chính: Tìm Top K bệnh viện
    Input: JSON Payload (Tuổi, Triệu chứng, Vị trí...)
    Output: Danh sách bệnh viện gợi ý
    """
    start_time = time.time()
    
    try:
        # Chuyển đổi Pydantic model thành Dict để đưa vào Service cũ
        payload_dict = payload.dict()
        
        # Gọi "Bộ não" xử lý
        # Lưu ý: Hàm trong service của bạn là async (await), nên ở đây cũng phải await
        results = await med_service.search_top_k_hospitals(payload_dict, k=5)
        
        process_time = time.time() - start_time
        
        return {
            "status": "success",
            "metadata": {
                "processing_time_ms": round(process_time * 1000, 2),
                "total_found": len(results)
            },
            "data": results
        }

    except Exception as e:
        print(f"❌ Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 4. HÀM CHẠY SERVER (Dùng cho Debug) ---
if __name__ == "__main__":
    # Chạy server tại localhost port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)