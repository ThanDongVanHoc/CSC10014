from flask import session
import json
from sqlalchemy import select
from app.db import db
from app.db.models import User, MedicalRecord
from app.gateways.card_gateway import CardGateway
from datetime import datetime
from app.profile.routes import get_medical_history 

def _parse_json_field(value):
    if not value:
        return []
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except Exception:
        # fallback: comma separated
        return [v.strip() for v in str(value).split(',') if v.strip()]


class UserService:
    @staticmethod
    def get_patient_data(user_id: str = None):
        """Lấy dữ liệu bệnh nhân từ session/DB và build payload."""

        identifier = user_id
        user = None

        # 1. Tìm kiếm User
        if not identifier:
            identifier = session.get('user_email') or session.get('user_id')

        try:
            if identifier:
                try:
                    uid = int(identifier)
                    stmt = select(User).where(User.id == uid)
                except Exception:
                    stmt = select(User).where(User.email == identifier)
                user = db.session.scalar(stmt)
        except Exception:
            user = None

        # 2. Xử lý Medical Record (Tránh lỗi AttributeError: 'Response' object)
        latest_record = get_medical_history() 
        if isinstance(latest_record, tuple):
            latest_record = latest_record[0]

        # Trích xuất dữ liệu JSON từ Flask Response an toàn
        record_data = {}
        if latest_record:
            try:
                # Kiểm tra nếu latest_record là Flask Response object
                if hasattr(latest_record, 'get_json'):
                    record_data = latest_record.get_json() or {}
                # Kiểm tra nếu là Model có hàm to_dict
                elif hasattr(latest_record, 'to_dict'):
                    record_data = latest_record.to_dict()
                # Nếu đã là dict sẵn
                elif isinstance(latest_record, dict):
                    record_data = latest_record
            except Exception as e:
                print(f"Error parsing record: {e}")

        # 3. Build các danh sách (Allergies, Medications...)
        allergies = _parse_json_field(getattr(user, 'allergies', None)) if user else []
        chronic = _parse_json_field(getattr(user, 'chronic_conditions', None)) if user else []
        
        # Lấy medications và symptoms từ record_data đã trích xuất
        medications = record_data.get('medications', [])
        current_symptoms = record_data.get('symptoms')

        # 4. Xử lý ngày tháng và tuổi
        dob_value = getattr(user, 'dob', None) or session.get('dob')
        age_val = None
        dob_str = None
        if dob_value and hasattr(dob_value, 'year'):
            age_val = datetime.now().year - dob_value.year
            dob_str = dob_value.strftime('%Y-%m-%d')

        # 5. Build Payload (Sửa None thành giá trị mặc định để tránh lỗi 422)
        payload = {
            "identity": {
                "userId": (f"P{user.id:03d}" if user and hasattr(user, 'id') else (user_id or "P001")),
                "full_name": getattr(user, 'fullname', None) or session.get('fullname') or "John Smith",
                "nationality": session.get('user_nationality', "VietNam") or "", 
                "age": age_val or 0,
                "gender": getattr(user, 'gender', None) or session.get('gender') or "Unknown",
                "date_of_birth": dob_str or "",
                "emergency_contact": getattr(user, 'name', 'Name'),
                "emergency_contact_phone": getattr(user, 'phone', None) or ""
            },
            "medical_critical": {
                "current_symptoms": current_symptoms or session.get('current_symptoms') or "N/A",
                "blood_type": getattr(user, 'blood_type', None) or session.get('blood_type') or "A+",
                "allergies": [a for a in allergies],
                "Medications": [m for m in medications],
                "Medical_history": [c for c in chronic],
                "surgical_history": session.get('surgical_history') or []
            }
        }

        print(f"DEBUG PAYLOAD: {payload}")

        # 6. Gọi Gateway
        try:
            Cardgw = CardGateway()
            response = Cardgw.get_card_info(payload)            
        except Exception as e:
            print(f"CardGateway connection error: {e}")
            return payload
        
        print()
        print(response)

        return response