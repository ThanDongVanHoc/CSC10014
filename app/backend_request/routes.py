import os
import requests
from flask import request, jsonify, current_app
from . import backend_request_bp
from app.db.models import User

# --- CẤU HÌNH ---
OCR_SERVICE_URL = os.getenv("OCR_SERVICE_URL", "http://127.0.0.1:8000")


def analyze_medical_documents(file_storage):
    """Gửi file sang FastAPI để OCR và phân tích bằng Gemini"""
    endpoint = f"{OCR_SERVICE_URL}/extract-medical-data"
    
    try:
        # Reset con trỏ file về đầu (đề phòng file đã bị đọc trước đó)
        file_storage.seek(0)
        
        files = {
            'file': (file_storage.filename, file_storage.read(), file_storage.content_type)
        }
        
        # Timeout 60s là hợp lý cho xử lý AI
        response = requests.post(endpoint, files=files, timeout=60)
        
        # Nếu FastAPI trả về lỗi (4xx, 5xx), raise exception
        response.raise_for_status()
        
        return response.json()
        
    except requests.exceptions.RequestException as e:
        # Log lỗi chi tiết ra console của Flask
        print(f"ERROR: Kết nối OCR Service thất bại: {str(e)}")
        # Trả về dict lỗi để route xử lý
        return {"error": "ocr_service_error", "message": "Không thể xử lý ảnh tại thời điểm này.", "detail": str(e)}



def get_user_profile(user_id):
    """Lấy thông tin dị ứng/bảo hiểm của user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return None
        
        return {
            "id": user.id,
            "name": user.username, # Giả sử model có field username
            "allergies": getattr(user, 'allergies', []), # Trả về mảng rỗng nếu không có
            "insurance": getattr(user, 'insurance', None)
        }
    except Exception as e:
        print(f"ERROR: DB Query failed: {e}")
        return None

# --- ROUTES / CONTROLLERS ---

@backend_request_bp.route('/process-prescription', methods=['POST'])
def process_prescription():
    """
    API Endpoint chính cho Frontend gọi.
    1. Nhận file ảnh và user_id.
    2. Gọi FastAPI để lấy thông tin thuốc.
    3. Lấy thông tin dị ứng của User từ DB.
    4. (Tuỳ chọn) So sánh thuốc và dị ứng (Logic này có thể thêm sau).
    """
    
    # 1. Validate File
    if 'file' not in request.files:
        return jsonify({"error": "missing_file", "message": "Vui lòng gửi kèm file ảnh."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "empty_filename", "message": "Tên file không hợp lệ."}), 400

    # 2. Lấy User ID (từ form-data hoặc token, ở đây ví dụ lấy từ form)
    user_id = request.form.get('user_id')
    
    # 3. Gọi Service OCR (FastAPI)
    ocr_result = analyze_medical_documents(file)
    
    # Kiểm tra nếu service OCR trả về lỗi
    if "error" in ocr_result:
        return jsonify(ocr_result), 502 # 502 Bad Gateway

    # 4. Lấy thông tin User (nếu có user_id)
    user_context = None
    warning_message = None
    
    if user_id:
        user_profile = get_user_profile(user_id)
        if user_profile:
            user_context = user_profile
            
            # --- VÍ DỤ LOGIC MỞ RỘNG: CẢNH BÁO DỊ ỨNG ---
            # Giả sử OCR trả về danh sách thuốc và User có danh sách dị ứng
            # Bạn có thể so sánh ở đây. Ví dụ đơn giản:
            if "draft_data" in ocr_result and "medications" in ocr_result["draft_data"]:
                meds = ocr_result["draft_data"]["medications"]
                allergies = user_profile["allergies"] or ""
                
                # Check đơn giản (trong thực tế cần check kỹ hơn)
                # Ví dụ: user dị ứng "Penicillin" và thuốc là "Penicillin V"
                # Logic này nên được xử lý kỹ hơn hoặc nhờ Gemini check ở bước FastAPI
                pass 

    # 5. Trả về kết quả tổng hợp
    response_data = {
        "status": "success",
        "analysis_result": ocr_result, # Kết quả từ Gemini/Paddle
        "user_context": user_context,  # Thông tin bệnh nhân
        "warning": warning_message     # Cảnh báo nếu có
    }

    return jsonify(response_data), 200

@backend_request_bp.route('/health', methods=['GET'])
def health_check():
    """API để check xem Flask có đang sống không"""
    return jsonify({"status": "ok", "service": "Flask Backend"}), 200