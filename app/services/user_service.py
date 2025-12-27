from flask import session, jsonify
import json
from sqlalchemy import select
from app.db import db
from app.db.models import User
from app.gateways.card_gateway import CardGateway
from datetime import datetime
from app.profile.routes import get_medical_history 

def _parse_json_field(value):
    """Helper để parse JSON string hoặc list/dict từ DB User."""
    if not value:
        return []
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return [v.strip() for v in str(value).split(',') if v.strip()]

class UserService:
    @staticmethod
    def get_patient_data(user_id: str = None):
        """Lấy dữ liệu bệnh nhân và tổng hợp lịch sử khám từ MedicalRecord."""

        identifier = user_id
        user = None

        # --- 1. Tìm kiếm User trong DB ---
        if not identifier:
            identifier = session.get('user_email') or session.get('user_id')

        try:
            if identifier:
                try:
                    uid = int(identifier)
                    stmt = select(User).where(User.id == uid)
                except ValueError:
                    stmt = select(User).where(User.email == identifier)
                user = db.session.scalar(stmt)
        except Exception as e:
            print(f"Error fetching user: {e}")
            user = None

        # --- 2. Xử lý Medical History (Gọi API nội bộ) ---
        history_list = []
        try:
            # Gọi hàm lấy lịch sử (lưu ý: hàm này cần trả về list các dict từ .to_dict())
            response_data = get_medical_history()
            
            # Xử lý response object của Flask nếu cần
            actual_response = response_data[0] if isinstance(response_data, tuple) else response_data

            if hasattr(actual_response, 'get_json'):
                source_data = actual_response.get_json()
                if source_data and isinstance(source_data, dict):
                    # Giả sử format trả về là {"data": [...]} hoặc list trực tiếp
                    history_list = source_data.get("data", source_data if isinstance(source_data, list) else [])
            elif isinstance(actual_response, dict):
                 history_list = actual_response.get("data", [])
            elif isinstance(actual_response, list):
                 history_list = actual_response
        except Exception as e:
            print(f"Error parsing medical history response: {e}")
            history_list = []

        # --- 3. Tổng hợp dữ liệu (User DB + Medical History) ---
        
        # A. Dị ứng & Mãn tính (Từ User Profile)
        allergies = _parse_json_field(getattr(user, 'allergies', None)) if user else []
        chronic_from_db = _parse_json_field(getattr(user, 'chronic_conditions', None)) if user else []

        # B. Xử lý Medications & History Strings (Từ MedicalRecord)
        extracted_medications = set()
        formatted_history_records = []

        for item in history_list:
            # --- B1. Lấy tên thuốc từ list object thuốc ---
            # Item format: {"medications": [{"name": "A", "dosage": "..."}], ...}
            meds_list = item.get('medications', [])
            
            if isinstance(meds_list, list):
                for m in meds_list:
                    # Nếu m là dict (Model chuẩn), lấy field 'name'
                    if isinstance(m, dict):
                        med_name = m.get('name')
                        if med_name: extracted_medications.add(str(med_name))
                    # Nếu m là string (Fallback)
                    elif isinstance(m, str):
                        extracted_medications.add(m)
            
            # --- B2. Format dòng lịch sử khám ---
            # Dùng key snake_case khớp với to_dict() của model
            diagnosis = item.get("diagnosis")
            visit_date = item.get("visit_date")   # Key mới
            hospital = item.get("hospital_name")  # Key mới
            
            if diagnosis:
                # Format: "Viêm họng (2023-10-01) at Bệnh viện Đa khoa"
                record_str = f"{diagnosis}"
                if visit_date:
                    # Cắt lấy ngày nếu chuỗi dài (ISO format)
                    date_str = str(visit_date).split('T')[0]
                    record_str += f" ({date_str})"
                if hospital:
                    record_str += f" at {hospital}"
                formatted_history_records.append(record_str)

        # Chuyển set về list
        final_medications = list(extracted_medications)
        
        # Gộp bệnh mãn tính (DB cũ) và chẩn đoán từ lịch sử khám (DB mới)
        final_medical_history = chronic_from_db + formatted_history_records

        # C. Triệu chứng hiện tại (Từ Session - Luồng Chatbot)
        current_symptoms = session.get("current_symptoms")

        # --- 4. Tính toán tuổi & Date ---
        dob_value = getattr(user, 'dob', None) or session.get('dob')
        age_val = 0
        dob_str = ""
        
        if dob_value:
            if isinstance(dob_value, str):
                try:
                    # Cố gắng parse string YYYY-MM-DD
                    dob_dt = datetime.strptime(dob_value, '%Y-%m-%d')
                    age_val = datetime.now().year - dob_dt.year
                    dob_str = dob_value
                except:
                    dob_str = dob_value
            elif hasattr(dob_value, 'year'):
                age_val = datetime.now().year - dob_value.year
                dob_str = dob_value.strftime('%Y-%m-%d')

        # --- 5. Build Payload Final ---
        payload = {
            "identity": {
                "userId": (f"P{user.id:03d}" if user and hasattr(user, 'id') else (str(user_id) if user_id else "P001")),
                "full_name": getattr(user, 'fullname', None) or session.get('fullname') or "Unknown Patient",
                "nationality": session.get('user_nationality', "VietNam") or "", 
                "age": age_val,
                "gender": getattr(user, 'gender', None) or session.get('gender') or "Unknown",
                "date_of_birth": dob_str,
                "emergency_contact": getattr(user, 'name', 'Emergency Contact'), 
                "emergency_contact_phone": getattr(user, 'phone', None) or ""
            },
            "medical_critical": {
                "current_symptoms": current_symptoms or "N/A",
                "blood_type": getattr(user, 'blood_type', None) or session.get('blood_type') or "Unknown",
                "allergies": allergies,
                "Medications": final_medications,         # List tên thuốc đã lọc trùng
                "Medical_history": final_medical_history, # List chẩn đoán
                "surgical_history": session.get('surgical_history') or []
            }
        }

        print(f"DEBUG PAYLOAD: {json.dumps(payload, indent=2, ensure_ascii=False)}")

        # --- 6. Gọi Gateway ---
        try:
            Cardgw = CardGateway()
            response = Cardgw.get_card_info(payload)            
            return response
        except Exception as e:
            print(f"CardGateway connection error: {e}")
            return payload