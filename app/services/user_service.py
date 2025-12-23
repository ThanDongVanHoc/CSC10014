from flask import session
import json
from sqlalchemy import select
from app.db import db
from app.db.models import User, MedicalRecord
from app.gateways.card_gateway import CardGateway


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
        """Lấy dữ liệu bệnh nhân từ session/DB và build payload.

        Thuật toán:
        - Nếu `user_id` không truyền vào, thử đọc từ `session['user_email']` hoặc `session['user_id']`.
        - Tìm `User` trong DB bằng `id` (nếu là số) hoặc `email`.
        - Lấy MedicalRecord gần nhất (nếu có) để thu thập thuốc, triệu chứng, v.v.
        - Điền các trường còn thiếu bằng giá trị mặc định giống mẫu.
        """

        identifier = user_id
        user = None

        # try session when no explicit id
        if not identifier:
            identifier = session.get('user_email') or session.get('user_id')

        try:
            if identifier:
                # try numeric id lookup
                try:
                    uid = int(identifier)
                    stmt = select(User).where(User.id == uid)
                except Exception:
                    stmt = select(User).where(User.email == identifier)
                user = db.session.scalar(stmt)
        except Exception:
            user = None

        # fetch latest medical record
        latest_record = None
        if user:
            try:
                stmt_rec = (
                    select(MedicalRecord)
                    .where(MedicalRecord.user_id == user.id)
                    .order_by(MedicalRecord.created_at.desc())
                    .limit(1)
                )
                latest_record = db.session.scalar(stmt_rec)
            except Exception:
                latest_record = None

        # Build payload using available fields
        allergies = _parse_json_field(getattr(user, 'allergies', None)) if user else []
        chronic = _parse_json_field(getattr(user, 'chronic_conditions', None)) if user else []

        medications = []
        if latest_record:
            try:
                medications = latest_record.to_dict().get('medications', [])
            except Exception:
                medications = []

        payload = {
            "identity": {
                "userId": (f"P{user.id:03d}" if user and getattr(user, 'id', None) else (user_id or "P001")),
                "full_name": getattr(user, 'fullname', None) or session.get('fullname') or "John Smith",
                "nationality": session.get('user_nationality') or None,
                "age": None,
                "gender": None,
                "date_of_birth": None,
                "emergency_contact": None,
                "emergency_contact_phone": getattr(user, 'phone', None)
            },
            "medical_critical": {
                "current_symptoms": (latest_record.to_dict().get('symptoms') if latest_record else None) or 
                                        session.get('current_symptoms') or
                                        "I have had a headache and dizziness since this morning",

                "blood_type": getattr(user, 'blood_type', None) or session.get('blood_type') or "A+",
                "allergies": [a for a in allergies],
                "Medications": [m for m in medications],
                "Medical_history": [c for c in chronic],
                "surgical_history": session.get('surgical_history', [])
            }
        }

        try:
            response = CardGateway.get_card_info(payload)
        except Exception as e:
            print(f"CardGateway error: {e}")
            return payload

        if isinstance(response, dict) and response.get("status") == "success":
            return response.get("data", payload)
        else:
            print(f"Lỗi khi lấy dữ liệu bệnh nhân: {response.get('message') if isinstance(response, dict) else response}")
            return payload