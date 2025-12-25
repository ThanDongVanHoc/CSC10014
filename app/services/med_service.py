# services/hospital_service.py
from datetime import datetime
from requests import session
from app.gateways.med_map_gateway import HospitalGateway
from app.db import db
from app.db.models import User
import json
from sqlalchemy import select
from sqlalchemy import and_
from flask import session  # Đảm bảo có dòng này
class HospitalService:
    @staticmethod
    def find_best_hospitals(user_id, frontend_data):
        
        # 1. Lấy thêm dữ liệu từ Database hoặc nguồn khác
        lat = frontend_data.get('lat', None)
        lng = frontend_data.get('lng', None)

        lat = 10.76268
        lng = 106.68168
        symptoms = frontend_data.get('symptoms', None)


        try:
            stmt = select(User).where(User.id == user_id).limit(1)
            user = db.session.scalar(stmt)
        except Exception:
            user = None

        dob_value = getattr(user, 'dob', None) or session.get('dob')    

        if user:
            try:
                chronic = json.loads(user.chronic_conditions) if user.chronic_conditions else []
            except Exception:
                chronic = []

            try:
                allergies = json.loads(user.allergies) if user.allergies else []
            except Exception:
                allergies = []

            user_profile = {
                "id": user.id,
                "fullname": user.fullname,
                "email": user.email,
                "phone": user.phone,
                "blood_type": user.blood_type,
                "chronic_diseases": chronic,
                "allergies": allergies,
                "avatar_url": user.avatar_url,

                "age": (datetime.now().year - dob_value.year) if dob_value and hasattr(dob_value, 'year') else 0,
                "gender": getattr(user, 'gender', None) or session.get('gender') or "All",
            }
        else:
            user_profile = {
                "age": 0,
                "gender": "All",
                "chronic_diseases": [],
                "allergies": []
            }

        # 2. Kết hợp dữ liệu từ frontend và backend
        
        full_context = {
            "user_context": {
                "age": user_profile.get("age", 0),
                "gender": user_profile.get("gender", "All"),
                "chronic_conditions": user_profile.get("chronic_diseases", [])
            },
            "request": {
                "location": {
                    "lat": lat,
                    "lng": lng
                },
                "symptoms": symptoms
            }
        }

        print(full_context)

        print()

        hospitalGw = HospitalGateway()
        # 3. Chuyển cho Gateway để gọi API Backend thực sự
        results =  hospitalGw.search_hospitals(full_context)
        print(results)

        return results.get('data')