from . import api_bp
from flask import jsonify, request, redirect, url_for, render_template
import random
from flask import session

@api_bp.route('/patient-history', methods=['GET'])
def get_patient_history():

    print("Fetching patient history data...")

    data_from_db = [
        { "name": "Acute Bronchitis", "date": "Oct 2024", "status": "Recovered" },
        { "name": "Allergic Rhinitis", "date": "Ongoing", "status": "Ongoing" },
        { "name": "Dengue Fever", "date": "Aug 2023", "status": "Recovered" }
    ]


    return jsonify(data_from_db)

@api_bp.route('/find-hospitals', methods=['POST'])
def find_hospital_action():
    # 1. Lấy dữ liệu JSON từ Fetch gửi lên
    data = request.json 

    print("user from medical form data:", data)


    location = data.get('location')
    symptoms = data.get('symptoms')
    pain_level = data.get('painLevel')
    duration = data.get('duration')

    lat = data.get('lat')
    lng = data.get('lng')


    # 2. Giả lập xử lý AI & Tìm kiếm bệnh viện
    found_hospitals = []
    base_lat, base_lng = 10.7626, 106.6601 # Tọa độ trung tâm HCMC
    
    for i in range(1, 6):
        found_hospitals.append({
            "id": f"hosp_{i}",
            "name": f"Hospital {location} - Rank {i}",
            "lat": base_lat + random.uniform(-0.02, 0.02),
            "lng": base_lng + random.uniform(-0.02, 0.02),
            "distanceKm": round(random.uniform(1.0, 5.0), 1),
            "match": "95%"
        })

    # 3. Lưu vào Session để trang Map có thể lấy ra dùng
    session['ai_results'] = found_hospitals
    session['user_location'] = location


    # 4. Trả về URL để JS thực hiện điều hướng
    return jsonify({
        "status": "success",
        "redirect_url": url_for('map.map') # Tên blueprint.tên_hàm
    })