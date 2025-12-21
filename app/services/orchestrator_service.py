# app/services/orchestrator_service.py
from app.schemas.payloads import MedMapPayload, CardPayload

class OrchestratorService:
    def __init__(self, profile_gw, map_gw, card_gw, user_repo):
        self.profile_gw = profile_gw
        self.map_gw = map_gw
        self.card_gw = card_gw
        self.user_repo = user_repo
        
    # --- Aggregator Logic ---
    def get_aggregated_info(self, user_id):
        # 1. Gọi song song (Concept) hoặc tuần tự
        local_data = self.user_repo.get_user_dob_nationality(user_id)
        profile_data = self.profile_gw.get_profile(user_id)
        
        # 2. Merge Data
        return {
            "dob": local_data.dob,
            "nationality": local_data.nationality,
            **profile_data # Merge dict từ Profile Service
        }

    # --- Orchestrator Logic (Map) ---
    def process_med_map(self, user_id, symptoms):
        # 1. Lấy data cần thiết
        profile = self.profile_gw.get_profile(user_id)

        # 2. Build Payload A (Dùng Pydantic đã định nghĩa ở trên)
        payload_a = MedMapPayload.from_data(symptoms, profile)

        # 3. Gửi đi
        return self.map_gw.send_routing(payload_a.dict())

    # --- Orchestrator Logic (Card) ---
    def process_card_issuance(self, user_id, symptoms):
        profile = self.profile_gw.get_profile(user_id)
        
        # Build Payload B
        payload_b = CardPayload.from_data(symptoms, profile)

        return self.card_gw.create_card(payload_b.dict())