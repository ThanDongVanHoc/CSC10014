"""
Information Collector - Handles information extraction and analysis
"""
import json
import time
import re
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from config import REQUIRED_FIELDS

class InformationCollector:
    """Manages information collection from user queries"""
    
    def __init__(self, model: genai.GenerativeModel):
        self.model = model
        self.required_fields = list(REQUIRED_FIELDS.keys())
    
    def process_query_optimized(self, query: str, collected_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        VERSION FINAL: Strict Logic Enforcement & Token Minimization
        """
        
        # [LAYER 1] Lọc dữ liệu đầu vào - TIẾT KIỆM TOKEN & GIẢM NHIỄU
        # Chỉ gửi cho AI những field ĐÃ CÓ dữ liệu. Bỏ qua toàn bộ null.
        existing_data = {k: v for k, v in collected_info.items() if v and v != "null"}
        current_data_str = json.dumps(existing_data, ensure_ascii=False, separators=(',', ':'))

        # Định nghĩa schema ngắn gọn
        fields_short = "\n".join([
            f"{field}: {REQUIRED_FIELDS[field].get('description', '')}"
            for field in self.required_fields
        ])

        # [LAYER 2] Prompt chặt chẽ hơn về 'Relevance'
        prompt = f"""Role: Legal Assistant. Return JSON.

SCHEMA:
{fields_short}

DATA:
- Known: {current_data_str}
- Input: "{query}"

TASKS:
1. MERGE: Extract info from Input (English val).
2. PROBLEM: Identify 'problem_category'.
3. FILTER: Select ONLY fields relevant to this problem.
   - E.g: If 'Notarization' -> Ignore 'threat_level', 'vehicle_involved'.
4. STATUS: 1=Has Data, 0=Missing.
   - CRITICAL: If field is NOT in "Known" and NOT in "Input" -> Status MUST be 0.
5. ASK: 3 conversational questions for Missing Relevant fields (Match Input Language).

OUTPUT: {{"collected_info": {{...}}, "info_status": {{...}}, "questions": [...]}}"""

        max_retries = 3
        generation_config = genai.types.GenerationConfig(temperature=0.3)

        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(prompt, generation_config=generation_config)
                
                # Clean response string
                text = response.text.strip().replace("```json", "").replace("```", "")
                if text.startswith("json"): text = text[4:].strip()
                
                result = json.loads(text)
                
                # --- [LAYER 3] LOGIC HẬU KIỂM (QUAN TRỌNG) ---
                
                # 1. Merge Data an toàn
                new_info = result.get("collected_info", {})
                final_info = collected_info.copy()
                for k, v in new_info.items():
                    if v and v not in ["null", "None"]:
                        final_info[k] = v
                
                # 2. Sửa lỗi Hallucination của AI (Status 1 nhưng Data Null)
                raw_status = result.get("info_status", {})
                clean_status = {}
                
                # Chỉ lấy status của những field liên quan mà AI gợi ý
                for field, status in raw_status.items():
                    # Kiểm tra thực tế trong dữ liệu
                    has_data = bool(final_info.get(field))
                    
                    if has_data:
                        clean_status[field] = 1 # Force 1 nếu đã có data
                    else:
                        # Nếu AI bảo 1 mà data rỗng -> Force 0
                        clean_status[field] = 0 if status == 1 else status

                # 3. Đảm bảo các field quan trọng luôn hiện diện
                core = ['problem_category', 'nationality', 'current_location']
                for f in core:
                    if final_info.get(f):
                        clean_status[f] = 1
                    elif f not in clean_status:
                        clean_status[f] = 0

                # Cập nhật lại result
                result["collected_info"] = final_info
                result["info_status"] = clean_status
                
                return result

            except Exception as e:
                print(f"Error: {e}")
                time.sleep(1)

        return self._get_fallback_response(query, collected_info)

    def _optimize_status_display(self, raw_status: Dict, relevant_fields: List) -> Dict:
        """Helper to limit info_status to essential fields for display"""
        priority_status = {}
        
        # 1. Add Core Fields
        core_fields = ['nationality', 'current_location', 'problem_category']
        for f in core_fields:
            if f in raw_status:
                priority_status[f] = raw_status[f]
            elif f in relevant_fields:
                priority_status[f] = 0 
        
        # 2. Add Missing Fields (Status 0)
        for f, s in raw_status.items():
            if len(priority_status) >= 10: break
            if s == 0 and f not in priority_status:
                priority_status[f] = s
                
        # 3. Add Present Fields (Status 1)
        for f, s in raw_status.items():
            if len(priority_status) >= 10: break
            if s == 1 and f not in priority_status:
                priority_status[f] = s
                
        return priority_status

    def _get_fallback_response(self, query: str, collected_info: Dict) -> Dict:
        """Fallback when API fails completely"""
        print("[ERROR] Using fallback response")
        core_fields = ['nationality', 'current_location', 'problem_category']
        
        # Improved Language Detection for Fallback
        vietnamese_chars = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ'
        is_vietnamese = any(c in query.lower() for c in vietnamese_chars) or " là " in query or " tôi " in query
        
        if is_vietnamese:
            base_questions = {
                'nationality': "Quốc tịch của bạn là gì?",
                'current_location': "Bạn đang sinh sống ở khu vực nào?",
                'problem_category': "Vấn đề pháp lý chính bạn đang gặp phải là gì?"
            }
            default_q = "Vui lòng cung cấp thêm thông tin chi tiết."
        else:
            base_questions = {
                'nationality': "What is your nationality?",
                'current_location': "Where are you currently located?",
                'problem_category': "What is the specific legal issue?"
            }
            default_q = "Please provide more details."
            
        # Determine missing info
        status = {}
        questions = []
        
        for field in core_fields:
            if collected_info.get(field):
                status[field] = 1
            else:
                status[field] = 0
                questions.append(base_questions.get(field, default_q))
        
        return {
            "collected_info": collected_info,
            "relevant_fields": core_fields,
            "info_status": status,
            "questions": questions
        }