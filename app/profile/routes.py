from flask import request, jsonify, session, render_template
from datetime import datetime
import json
from . import profile_bp
from app.db import db
from app.db.models import MedicalRecord


@profile_bp.route('/api/save-medical-record', methods=['POST'])
def save_medical_record():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "Vui lòng đăng nhập"}), 401

    raw_data = request.json
    # Lấy ID bản ghi nếu có (dành cho trường hợp Update)
    record_id = raw_data.get('record_id') 
    data = raw_data.get('draft_data', {})
    
    try:
        # Xử lý ngày tháng
        visit_date = None
        if data.get('visitDate'):
            visit_date = datetime.strptime(data['visitDate'], '%Y-%m-%d').date()

        if record_id:
            # --- TRƯỜNG HỢP 1: CẬP NHẬT BẢN GHI CŨ ---
            record = MedicalRecord.query.filter_by(id=record_id, user_id=user_id).first()
            if not record:
                return jsonify({"status": "error", "message": "Không tìm thấy bản ghi"}), 404
            
            record.hospital_name = data.get('hospitalName')
            record.visit_date = visit_date
            record.diagnosis = data.get('diagnosis')
            record.doctor_name = data.get('doctorName')
            record.medications = json.dumps(data.get('medications', []))
            record.symptoms = data.get('symptoms')
            record.notes = data.get('notes')
            
            msg = "Đã cập nhật bản ghi thành công!"
        else:
            # --- TRƯỜNG HỢP 2: TẠO MỚI (SAU KHI OCR) ---
            new_record = MedicalRecord(
                user_id=user_id,
                hospital_name=data.get('hospitalName'),
                visit_date=visit_date,
                diagnosis=data.get('diagnosis'),
                doctor_name=data.get('doctorName'),
                medications=json.dumps(data.get('medications', [])),
                symptoms = data.get('symptoms'),
                notes=data.get('notes')
            )
            db.session.add(new_record)
            msg = "Đã lưu bản ghi mới thành công!"

        db.session.commit()
        return jsonify({"status": "success", "message": msg}), 200

    except Exception as e:
        db.session.rollback()
        print(f">>> [DB ERROR] {str(e)}")
        return jsonify({"status": "error", "message": "Lỗi xử lý dữ liệu"}), 500
    
    
@profile_bp.route('/api/get-medical-history', methods=['GET'])
def get_medical_history():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    try:
        # Lấy tất cả bản ghi của user, sắp xếp ngày giảm dần (mới nhất lên đầu)
        records = MedicalRecord.query.filter_by(user_id=user_id).order_by(MedicalRecord.visit_date.desc()).all()
        
        history_data = []
        for rec in records:
            history_data.append({
                "id": rec.id,
                "hospitalName": rec.hospital_name,
                "visitDate": rec.visit_date.strftime('%Y-%m-%d') if rec.visit_date else "N/A",
                "diagnosis": rec.diagnosis,
                "doctorName": rec.doctor_name,
                "symptoms": rec.symptoms,
                "notes": rec.notes if hasattr(rec, 'notes') else "",
                "medications": json.loads(rec.medications) if rec.medications else []
            })
            print (history_data[len(history_data) - 1])
            
        return jsonify({"status": "success", "data": history_data}), 200
    except Exception as e:
        print(f">>> [GET DB ERROR] {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500
    
    
@profile_bp.route('/api/delete-medical-record/<int:record_id>', methods=['DELETE'])
def delete_medical_record(record_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    try:
        # Đảm bảo chỉ xóa bản ghi thuộc sở hữu của user này
        record = MedicalRecord.query.filter_by(id=record_id, user_id=user_id).first()
        if not record:
            return jsonify({"status": "error", "message": "Record not found"}), 404

        db.session.delete(record)
        db.session.commit()
        return jsonify({"status": "success", "message": "Đã xóa bản ghi"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

import json
from flask import request, jsonify, session
from app.db import db
from app.db.models import EmergencyCard, User

# --- ROUTE LẤY DỮ LIỆU ---
@profile_bp.route('/api/get-emergency-card', methods=['GET'])
def get_emergency_card():
    user_id = session.get('user_id')
    # ... kiểm tra login ...
    try:
        card = EmergencyCard.query.filter_by(user_id=user_id).first()
        if not card:
            return jsonify({"status": "success", "data": None}), 200

        # Giải mã JSON từ DB
        allergies_list = json.loads(card.allergies) if card.allergies else []
        history_list = json.loads(card.medical_history) if card.medical_history else []

        return jsonify({
            "status": "success",
            "data": {
                "blood_group": card.blood_group or "N/A",
                # Dồn hết mảng thành 1 string, ngăn cách bởi dấu phẩy
                "allergies_str": ", ".join(allergies_list),
                "history_str": ", ".join(history_list),
                # Giữ nguyên bản gốc để đổ vào Modal khi sửa
                "allergies_raw": allergies_list,
                "history_raw": history_list
            }
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- ROUTE CẬP NHẬT DỮ LIỆU ---
@profile_bp.route('/api/update-emergency-card', methods=['POST'])
def update_emergency_card():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "Vui lòng đăng nhập"}), 401

    data = request.json
    try:
        # Kiểm tra xem đã có bản ghi chưa
        card = EmergencyCard.query.filter_by(user_id=user_id).first()

        if not card:
            # Nếu chưa có thì tạo mới
            card = EmergencyCard(user_id=user_id)
            db.session.add(card)

        # Cập nhật thông tin
        card.blood_group = data.get('blood_group')
        # Chuyển mảng từ JS thành chuỗi JSON để lưu vào cột TEXT
        card.allergies = json.dumps(data.get('allergies', []))
        card.medical_history = json.dumps(data.get('medical_history', []))

        db.session.commit()
        return jsonify({"status": "success", "message": "Cập nhật thành công!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@profile_bp.route('/')
def profile():
    return render_template('profile.html')
