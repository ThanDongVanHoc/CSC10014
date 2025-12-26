from . import api_bp
from flask import jsonify, request, redirect, url_for, render_template
import random
from flask import session
from app.services.med_service import HospitalService
from app.services.user_service import UserService
import requests
from app.profile.routes import get_medical_history 



@api_bp.route('/patient-history', methods=['GET'])
def get_patient_history():
    user_id = session.get('user_id')
    if not user_id: 
        return jsonify({"error": "Unauthorized"}), 401

    # 1. Gọi hàm và nhận về Response object
    response_data = get_medical_history() 
    
    # 2. Kiểm tra nếu nó là tuple (Response, Status Code)
    if isinstance(response_data, tuple):
        actual_response = response_data[0] # Lấy phần Response object
    else:
        actual_response = response_data

    # 3. Dùng .get_json() để biến Response thành Dictionary
    source_data = actual_response.get_json()
    
    if not source_data or "data" not in source_data:
        return jsonify({"error": "Data not found"}), 404

    # 4. Truy cập vào history_summary (Lưu ý: source_data["data"] lúc này là list history_data)
    # Tùy thuộc vào format JSON bạn trả về ở hàm get_medical_history
    history_list = source_data.get("data", [])
    
    formatted_data = []
    for item in history_list:
        formatted_data.append({
            "name": item.get("diagnosis"),
            "date": item.get("visitDate"), # Phải khớp với key 'visitDate' ở hàm cũ của bạn
            "status": "Recovered",
            "location": item.get("hospitalName") # Khớp với 'hospitalName'
        })

    return jsonify(formatted_data)


@api_bp.route('/get-all-patient-data', methods=['GET'])
def get_all_patient_data():
    # Try to read JSON sent by the frontend. If none provided, fall back to a local mock.
    data = UserService.get_patient_data(user_id=session.get('user_id', None))

    return data



@api_bp.route('/find-hospitals', methods=['POST'])
def find_hospital_action():
    # 1. Lấy dữ liệu JSON từ Fetch gửi lên
    data = request.json 

    print("user from medical form data:", data)


    location = data.get('location')
    
    # 2. Giả lập xử lý AI & Tìm kiếm bệnh viện
    found_hospitals = []

    found_hospitals = HospitalService.find_best_hospitals(
                     user_id=session.get('user_id', None), 
                     frontend_data = data)
    
    


    # 3. Lưu vào Session để trang Map có thể lấy ra dùng
    session['ai_hospitals_results'] = found_hospitals
    session['user_location'] = location

    # 4. Trả về URL để JS thực hiện điều hướng
    return jsonify({
        "status": "success",
        "redirect_url": url_for('map.map') # Tên blueprint.tên_hàm
    })


@api_bp.route('/get-hospital-prices', methods=['GET'])
def get_hospital_prices():
    hospital_name = request.args.get('hospital_name', default=None, type=str)
    
    if not hospital_name:
        return jsonify({"error": "Thiếu tham số 'name'"}), 400

    CORE_DATA_API = "http://127.0.0.1:8000/services"

    # --- 1. DANH SÁCH TỪ KHÓA PHỔ BIẾN (Hardcoded) ---
    # Chỉ những dịch vụ chứa các từ này mới được hiển thị
    POPULAR_KEYWORDS = [
        "khám", "cấp cứu",      # Nhóm khám
        "siêu âm", "x-quang", "x quang", "chụp", "mri", "ct scanner", "nội soi", # Hình ảnh
        "xét nghiệm", "máu",    # Xét nghiệm
        "giường"                # Giá phòng
    ]

    try:
        # --- 2. GỌI SANG BACKEND DATA ---
        # Mẹo: Lấy limit lớn (vd: 500) để lấy về "cả rổ" dữ liệu thô trước
        payload = {
            "hospital_name": hospital_name,
            "limit": 100 
        }
        
        response = requests.get(CORE_DATA_API, json=payload, timeout=20)
        response.raise_for_status()
        external_data = response.json() 

        print(response)

        # --- 3. XỬ LÝ & LỌC (FILTERING LOGIC) ---
        raw_list = external_data.get("data", [])
        h_id = raw_list[0]['hospital_id'] if raw_list else None
        
        formatted_items = []
        
        for item in raw_list:
            s_name = item['service_name']
            s_price = item['price']
            
            if item.get('hospital_name') != hospital_name:
                continue

            # --- LOGIC LỌC TẠI ĐÂY ---
            # Chuyển tên về chữ thường để so sánh cho chuẩn
            name_lower = s_name.lower()
            
            # Kiểm tra: Nếu tên dịch vụ chứa BẤT KỲ từ khóa nào trong danh sách
            if any(keyword in name_lower for keyword in POPULAR_KEYWORDS):
                
                if s_price < 20000: 
                    continue

                formatted_items.append({
                    "service": s_name,
                    "price": s_price
                })
                
                # Giới hạn hiển thị khoảng 10-15 dịch vụ tiêu biểu thôi cho đẹp giao diện
                if len(formatted_items) >= 15:
                    break

        # Nếu lọc xong mà không có gì (do danh sách keyword quá chặt), 
        # có thể fallback lấy 5 cái đầu tiên của danh sách gốc.
        if not formatted_items and raw_list:
             for item in raw_list[:5]:
                formatted_items.append({
                    "service": item['service_name'],
                    "price": item['price']
                })

        return jsonify({
            "hospitalId": h_id,
            "currency": "VND",
            "items": formatted_items
        })

    except requests.exceptions.RequestException as e:
        print(f"Lỗi kết nối Backend Data: {e}")
        return jsonify({"items": [], "error": "Lỗi server dữ liệu"}), 500