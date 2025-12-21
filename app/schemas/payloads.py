# app/schemas/payloads.py
from pydantic import BaseModel, Field

# Định nghĩa Payload A (Gửi sang Med Map)
class MedMapPayload(BaseModel):
    patient_age: int
    condition: str
    medical_history: list
    
    # Logic map từ data gốc sang Payload A
    @classmethod
    def from_data(cls, symptoms, profile):
        return cls(
            patient_age=2024 - profile.get('yob', 2000),
            condition=symptoms.get('primary_symptom'),
            medical_history=profile.get('history', [])
        )

# Định nghĩa Payload B (Gửi sang Card Service)
class CardPayload(BaseModel):
    user_id: str
    card_type: str = "STANDARD"
    details: str

    @classmethod
    def from_data(cls, symptoms, profile):
        return cls(
            user_id=profile.get('id'),
            details=f"Symptom: {symptoms.get('primary_symptom')}"
        )