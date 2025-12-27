from . import api_bp
from flask import jsonify, request, redirect, url_for, render_template, session
from app.services.med_service import HospitalService
from app.services.user_service import UserService
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
