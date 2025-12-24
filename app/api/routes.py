from . import api_bp
from flask import jsonify, request, redirect, url_for, render_template
import random
from flask import session
from app.services.med_service import HospitalService
from app.services.user_service import UserService


@api_bp.route('/patient-history', methods=['GET'])
def get_patient_history():
    print("Fetching patient history data...")

    data_from_db = [
        { "name": "Acute Bronchitis", "date": "Oct 2024", "status": "Recovered" },
        { "name": "Allergic Rhinitis", "date": "Ongoing", "status": "Ongoing" },
        { "name": "Dengue Fever", "date": "Aug 2023", "status": "Recovered" }
    ]

    return jsonify(data_from_db)

@api_bp.route('/get-all-patient-data', methods=['GET'])
def get_all_patient_data():
    # Try to read JSON sent by the frontend. If none provided, fall back to a local mock.
    data = UserService.get_patient_data(user_id=session.get('user_id', None))

    # Lấy lớp identity ra, nếu không có thì mặc định là dict trống {}
    identity = data.get('identity', {})
    # Kiểm tra nationality trong lớp identity đó
    if identity.get('nationality') is None:
        data = None


    if not data:
        import json, os
        mock_path = os.path.normpath(
            os.path.join(os.path.dirname(__file__), '..', 'chat', 'static', 'mock_responses', 'patientData.json')
        )
        try:
            with open(mock_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            data = {}

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