import json
import pandas as pd
import os
import asyncio
import math
import csv
import pickle
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv
import google.generativeai as genai
from haversine import haversine, Unit

# Load environment variables
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class MedicalMapService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MedicalMapService, cls).__new__(cls)
            cls._instance._initialize_data()
        return cls._instance

    def _initialize_data(self):
        """Initialize Static Data & AI Models"""
        print("🔄 [System] Initializing Medical Map Service (Parent Only)...")
        
        # STUDENT MODEL TOGGLE
        self.ENABLE_STUDENT_MODEL = True 

        try:
            # 1. Load Knowledge Base
            with open('hospital_knowledge_base.json', 'r', encoding='utf-8') as f:
                self.hospitals = json.load(f)
            
            # 2. Load Static Load Data
            self.load_map = {}
            if os.path.exists('hospital_base_load.csv'):
                df_load = pd.read_csv('hospital_base_load.csv')
                for _, row in df_load.iterrows():
                    self.load_map[str(row['id'])] = {
                        "time": int(row['avg_waiting_time']),
                        "level": str(row['load_level'])
                    }
            
            # 3. Configure Gemini
            self.model = genai.GenerativeModel('gemini-2.5-flash')

            # 4. Load Student
            self.student_model = None
            if self.ENABLE_STUDENT_MODEL and os.path.exists('student_brain.pkl'):
                with open('student_brain.pkl', 'rb') as f:
                    self.student_model = pickle.load(f)
                print("🧠 [Student] Brain Loaded! Hybrid Mode Active.")
            else:
                print("🔒 [System] Student Disabled or Not Found.")
            
            print(f"✅ [System] Ready! Loaded {len(self.hospitals)} hospitals.")
            
        except Exception as e:
            print(f"❌ Init Error: {e}")
            self.hospitals = []
            self.load_map = {}

    def _log_training_data(self, user_text: str, urgency: str, reasoning: str):
        """Log data for future training"""
        try:
            file_exists = os.path.isfile('training_history.csv')
            with open('training_history.csv', 'a', newline='', encoding='utf-8') as f:
                headers = ['timestamp', 'query', 'urgency', 'reasoning']
                writer = csv.DictWriter(f, fieldnames=headers)
                if not file_exists:
                    writer.writeheader()
                writer.writerow({
                    'timestamp': datetime.now().isoformat(),
                    'query': user_text.replace('\n', ' ').strip(),
                    'urgency': urgency,
                    'reasoning': reasoning.replace('\n', ' ').strip()
                })
        except Exception:
            pass

    async def _get_ai_relevance_score(self, full_query: str, candidates: List[Dict]) -> Dict:
        """
        Call Gemini to get Score & Reason (IN ENGLISH)
        """
        minimized_candidates = [
            {
                "id": h['id'], 
                "name": h['name'], 
                "specialties": h.get('specialties', []),
                "keywords": h.get('medical_keywords', []),
                "strengths": h.get('strengths', [])
            } for h in candidates
        ]

        prompt = f"""
        Act as a Senior Medical Triage Officer.
        Analyze patient: "{full_query}"
        
        Task 1: Determine Urgency (HIGH/MEDIUM/LOW).
        Task 2: Rate Relevance (0-10) and give a SHORT REASON (in English, < 10 words).
        
        Rules:
        - HIGH Urgency: Prioritize Tertiary Hospitals (Tuyến cuối) like Chợ Rẫy, 115, Nhi Đồng. Score 10. Reason must mention "Tertiary Level" or specific capability.
        - LOW Urgency: Prioritize matching specialties.
        
        Candidates: {json.dumps(minimized_candidates, ensure_ascii=False)}

        Output JSON strictly: 
        {{ 
            "urgency": "HIGH", 
            "evaluations": {{ 
                "hospital_id": {{ "score": number, "reason": "Short explanation in English" }} 
            }} 
        }}
        """

        try:
            response = await self.model.generate_content_async(
                prompt, generation_config={"response_mime_type": "application/json"}
            )
            result = json.loads(response.text)
            
            # Log training data
            self._log_training_data(full_query, result.get('urgency', 'LOW'), "")
            
            return result
        except Exception as e:
            print(f"⚠️ AI Error: {e}")
            return {"urgency": "HIGH", "evaluations": {}}

    async def search_top_k_hospitals(self, payload: Dict, k: int = 5) -> List[Dict]:
        """CORE LOGIC"""
        user_loc = (payload['request']['location']['lat'], payload['request']['location']['lng'])
        symptoms = payload['request']['symptoms']
        chronic = ", ".join(payload['user_context']['chronic_conditions'])
        age = payload['user_context']['age']
        
        full_query = f"Age: {age}. Symptoms: {symptoms}. History: {chronic}."

        # 1. SPATIAL FILTER (15km)
        candidates = []
        for h in self.hospitals:
            h_loc = (h['location']['lat'], h['location']['lng'])
            dist_km = haversine(user_loc, h_loc)
            if dist_km <= 15.0:
                h_copy = h.copy()
                h_copy['temp_dist'] = dist_km
                candidates.append(h_copy)

        if not candidates: return []
        
        candidates.sort(key=lambda x: x['temp_dist'])
        top_candidates = candidates[:30]

        # 2. DISTILLATION LOGIC
        ai_evaluations = {}
        urgency_level = 'LOW'
        use_teacher = True
        
        # Check Student Model
        if self.ENABLE_STUDENT_MODEL and self.student_model:
            try:
                probs = self.student_model.predict_proba([full_query])[0]
                confidence = max(probs)
                predicted_urgency = self.student_model.classes_[probs.argmax()]

                if confidence > 0.90 and predicted_urgency == 'LOW':
                    use_teacher = False
                    urgency_level = 'LOW'
                    print("⏩ Student handled this request.")
                    # Fake evaluation for Student
                    ai_evaluations = {h['id']: {"score": 7.0, "reason": "Suitable for mild symptoms"} for h in top_candidates}
            except Exception:
                pass

        if use_teacher:
            ai_response = await self._get_ai_relevance_score(full_query, top_candidates)
            ai_evaluations = ai_response.get('evaluations', {})
            urgency_level = ai_response.get('urgency', 'LOW')

        print(f"ℹ️ [AI Analysis] Urgency: {urgency_level}")

        # 3. RANKING & DESCRIPTION GENERATION
        results = []
        for h in top_candidates:
            h_id = h['id']
            
            eval_data = ai_evaluations.get(h_id, {"score": 0.0, "reason": ""})
            score_ai = eval_data.get("score", 0.0)
            ai_reason = eval_data.get("reason", "")
            
            if use_teacher and score_ai < 4.0: continue

            # Calc Scores
            score_dist = max(0, 10 - (h['temp_dist'] / 1.5))
            wait_time = self.load_map.get(h_id, {"time": 60})['time']
            score_load = max(0, 10 - (wait_time / 12))

            # Final Score Logic
            if urgency_level == 'HIGH':
                final_score = (score_ai * 0.85) + (score_dist * 0.15)
                heatmap_color = "Red"
            else:
                final_score = (score_ai * 0.6) + (score_dist * 0.25) + (score_load * 0.15)
                heatmap_color = "Red" if wait_time > 90 else ("Green" if wait_time < 30 else "Yellow")

            # --- [UPDATED] ENGLISH DESCRIPTION GENERATION ---
            description = ai_reason
            
            results.append({
                "id": h_id,
                "name": h['name'],
                "final_score": round(final_score, 2),
                "description": description, 
                "ui_context": {
                    "heatmap_color": heatmap_color,
                    "distance_display": f"{h['temp_dist']:.1f} km",
                    "wait_time_display": f"~{wait_time} mins",
                    "urgency_tag": urgency_level
                }
            })

        results.sort(key=lambda x: x['final_score'], reverse=True)
        return results[:k]

# # --- TEST ---
# async def main():
#     service = MedicalMapService()
#     payload = {
#         "user_context": {"age": 32, "gender": "Male", "chronic_conditions": []},
#         "request": {
#             "location": { "lat": 10.762, "lng": 106.660 }, 
#             "symptoms": "Chấn thương sọ não, chảy máu đầu" 
#         }
#     }
#     print("\n🔍 Searching...")
#     results = await service.search_top_k_hospitals(payload)
#     print(json.dumps(results, indent=2, ensure_ascii=False))

# if __name__ == "__main__":
#     asyncio.run(main())