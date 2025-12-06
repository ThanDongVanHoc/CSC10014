# api.py
import uvicorn
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.responses import HTMLResponse

# --- 1. IMPORT LOGIC TỪ FILE CỦA BẠN ---
# Đảm bảo bạn đã đổi tên file "inference2.py" thành "inference_logic.py"
try:
    import inference_logic
except ImportError:
    print("LỖI: Không tìm thấy file 'inference_logic.py'.")
    print("Vui lòng đổi tên file 'inference2.py' thành 'inference_logic.py'")
    exit(1)

# --- 2. KHỞI TẠO APP VÀ SỰ KIỆN STARTUP ---
app = FastAPI(
    title="Location Recommendation API",
    description="API gợi ý địa điểm dựa trên query và GPS."
)

@app.on_event("startup")
async def startup_event():
    """
    Hàm này CHẠY MỘT LẦN DUY NHẤT khi server khởi động.
    Chúng ta tải corpus và model tại đây để tiết kiệm thời gian.
    """
    print("[API Startup] Đang khởi động server...")
    
    # 1. Tải corpus
    # (Hàm này sẽ điền dữ liệu vào biến toàn cục inference_logic.CORPUS_DATA)
    print("[API Startup] Đang tải corpus...")
    inference_logic.load_corpus()
    
    # 2. Kiểm tra các model (đã được tải tự động khi import)
    if not inference_logic.classifier:
        print("[API Startup] LỖI: Classifier model (transformers) chưa được tải!")
    else:
        print("[API Startup] Classifier model đã sẵn sàng.")
        
    if not inference_logic.gemini_model:
        print("[API Startup] LƯU Ý: Gemini model chưa được tải (có thể do thiếu API key).")
    else:
        print("[API Startup] Gemini model đã sẵn sàng.")
        
    print("[API Startup] Server đã sẵn sàng nhận request tại http://0.0.0.0:8000")

# --- 3. ĐỊNH NGHĨA MODEL DỮ LIỆU (PYDANTIC) ---
class QueryRequest(BaseModel):
    """
    Định nghĩa cấu trúc JSON mà backend (hoặc UI) sẽ gửi lên.
    """
    query: str = Field(..., description="Yêu cầu (prompt) của người dùng", example="Tìm lãnh sự quán Indonesia")
    lat: float = Field(..., description="Vĩ độ của người dùng", example=10.7803)
    lng: float = Field(..., description="Kinh độ của người dùng", example=106.6925)

# --- 4. ENDPOINT CHÍNH CHO BACKEND (/recommend) ---
@app.post("/recommend")
async def get_recommendations(request: QueryRequest):
    """
    Endpoint chính để xử lý yêu cầu.
    Phần logic này được sao chép TỪNG BƯỚC từ file logic của bạn.
    """
    print(f"\n[Request] Nhận request: query='{request.query}', lat={request.lat}, lng={request.lng}")
    start_time = time.time()
    
    try:
        # 1. Dự đoán Category
        prediction = inference_logic.get_prediction(request.query)
        category_label = prediction.get('label')
        
        if not category_label:
            raise HTTPException(status_code=500, detail=f"Lỗi khi dự đoán category: {prediction.get('error')}")

        # 2. Lọc địa điểm theo Category
        filtered_locations = inference_logic.FilterByCate(category_label)
        if not filtered_locations:
            return {
                "message": "Không tìm thấy địa điểm phù hợp với category dự đoán.", 
                "predicted_category": category_label,
                "results": []
            }

        # 3. Chấm điểm khoảng cách (Dis_i)
        dist_scored_locations = inference_logic.Evaluate_Distance(request.lat, request.lng, filtered_locations)

        # 4. Chấm điểm Specific (Spec_i) (Sử dụng Gemini API)
        # Đây là bước tốn thời gian nhất
        final_locations = inference_logic.Evaluate_Specific(request.query, category_label, dist_scored_locations)

        # 5. Tính điểm tổng hợp (Total Score)
        for loc in final_locations:
            spec_score = loc.get('spec_score', 0.5)
            dist_score = loc.get('distance_score', 0)
            
            total_score = (inference_logic.ALPHA * spec_score) + (inference_logic.BETA * dist_score)
            loc['total_score'] = total_score
        
        # 6. Sắp xếp theo Total Score
        sorted_final_list = sorted(final_locations, key=lambda x: x.get('total_score', 0), reverse=True)

        # 7. Trả về kết quả (chỉ lấy Top 10)
        top_10_results = sorted_final_list[:10]
        end_time = time.time()
        
        print(f"[Response] Hoàn thành. Tổng thời gian: {int((end_time - start_time) * 1000)}ms.")
        
        return {
            "predicted_category": category_label,
            "total_processing_time_ms": int((end_time - start_time) * 1000),
            "results_count": len(top_10_results),
            "results": top_10_results
        }
    
    except Exception as e:
        print(f"[Error] Lỗi máy chủ nội bộ: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi máy chủ nội bộ: {str(e)}")

# --- 5. ENDPOINT PHỤC VỤ UI TEST (/) ---
@app.get("/", response_class=HTMLResponse)
async def get_test_ui():
    """
    Phục vụ file index.html khi người dùng truy cập vào trang chủ.
    """
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Lỗi: Không tìm thấy file index.html</h1>")

# --- 6. CHẠY SERVER ---
if __name__ == "__main__":
    print("[!] CẢNH BÁO BẢO MẬT NGHIÊM TRỌNG!")
    print("File inference_logic.py của bạn đang hardcode API Key (AIzaSyCpnW...5ykU0s).")
    print("Key này sẽ bị LỘ ra nếu code bị rò rỉ. Vui lòng THU HỒI KEY này và dùng file .env.")
    
    # host="0.0.0.0" nghĩa là "cho phép BẤT KỲ AI có IP của máy này gọi vào"
    print("\nKhởi chạy server. Truy cập UI Test tại: http://127.0.0.1:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)