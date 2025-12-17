"""
Information Collector - Optimized for Precision and Stability
"""
import json
import time
from typing import Dict, Any, List
import google.generativeai as genai
from config import REQUIRED_FIELDS

class InformationCollector:
    """Manages information collection from user queries with Strict Logic"""
    
    def __init__(self, model: genai.GenerativeModel):
        self.model = model
        self.required_fields = list(REQUIRED_FIELDS.keys())
    
    def process_query_optimized(self, query: str, collected_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        VERSION 2.1: Fix overwrite issue - Ưu tiên Input mới hơn Context cũ
        """
        
        # [PRE-PROCESSING]
        existing_data = {k: v for k, v in collected_info.items() if v and v not in ["null", "None", ""]}
        current_data_str = json.dumps(existing_data, ensure_ascii=False)

        fields_desc = "\n".join([f"- {k}: {v.get('description', '')}" for k, v in REQUIRED_FIELDS.items()])

        # [PROMPT ENGINEERING] - CẬP NHẬT QUAN TRỌNG Ở ĐÂY
        prompt = f"""You are a strict Legal Data Extractor. Your job is to extract specific fields from user input into JSON format.

### CONTEXT DATA (Current State):
{current_data_str}

### INPUT QUERY (Newest User Action):
"{query}"

### REQUIRED FIELDS SCHEMA:
{fields_desc}

### INSTRUCTIONS:
1. **Analyze Language**: Detect the language of the INPUT QUERY.
2. **Extract & Update Data**: 
   - Extract values from INPUT QUERY for the fields in SCHEMA.
   - **OVERWRITE RULE**: If the INPUT QUERY contains information that conflicts with CONTEXT DATA, the **INPUT QUERY WINS**. You MUST output the NEW value to update the system.
   - Example: If Context has "problem: Lost Visa" but Input says "I want to renew my visa", extract "problem: Renew Visa".
   - Translate extracted values to English (standardized).
   - **problem_category**: Infer strictly from keywords.
3. **Check Status**:
   - 1: Data exists and is valid.
   - 0: Data is missing.
4. **Determine Sufficiency**: TRUE only if 'nationality' and 'problem_category' ALL have valid values.
5. **Generate Questions**: If 'is_sufficient' is false, generate max 4 follow-up questions in the SAME LANGUAGE as the INPUT QUERY.

### OUTPUT FORMAT (JSON ONLY):
{{
    "_thought": "Reasoning. Mention if an update occurred.",
    "collected_info": {{ "field_name": "extracted_value", ... }},
    "info_status": {{ "field_name": 1 or 0, ... }},
    "is_sufficient": boolean,
    "questions": ["Question 1", "Question 2"]
}}
"""

        # Cấu hình sinh nội dung
        generation_config = genai.types.GenerationConfig(
            temperature=0.1, # Tăng nhẹ temperature để AI linh hoạt hơn trong việc phát hiện thay đổi
        )

        max_retries = 2
        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(prompt, generation_config=generation_config)
                
                text = response.text.strip()
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"): text = text[4:]
                
                result = json.loads(text)
                
                return self._finalize_result(result, collected_info)

            except Exception as e:
                print(f"[Attempt {attempt+1}] Error: {e}")
                time.sleep(1)

        return self._get_fallback_response(query, collected_info)

    def _finalize_result(self, ai_result: Dict, old_info: Dict) -> Dict:
        """
        Hợp nhất dữ liệu AI với dữ liệu cũ một cách an toàn.
        """
        new_info = ai_result.get("collected_info", {})
        final_info = old_info.copy()
        
        # 1. Merge Data: Chỉ update nếu AI tìm thấy giá trị mới hợp lệ
        for k, v in new_info.items():
            if v and v not in ["null", "None", "", "unknown"]:
                final_info[k] = v
        
        # 2. Re-evaluate Status & Sufficiency (Python Logic > AI Logic)
        core_fields = ['problem_category', 'nationality']
        clean_status = {}
        
        # Tính toán status dựa trên dữ liệu thực tế sau khi merge
        all_fields = set(list(final_info.keys()) + list(REQUIRED_FIELDS.keys()))
        for field in all_fields:
            if field in final_info and final_info[field]:
                clean_status[field] = 1
            else:
                clean_status[field] = 0
                
        # Kiểm tra điều kiện đủ (Hard Check)
        has_all_core = all(final_info.get(f) for f in core_fields)
        
        # Cập nhật lại kết quả
        ai_result["collected_info"] = final_info
        ai_result["info_status"] = clean_status
        ai_result["is_sufficient"] = has_all_core
        
        # Nếu đã đủ thông tin, xóa câu hỏi thừa
        if has_all_core:
            ai_result["questions"] = []
            
        return ai_result

    def _get_fallback_response(self, query: str, collected_info: Dict) -> Dict:
        """Fallback thông minh: Dịch tên trường sang tiếng Việt/Anh tự nhiên"""
        print("[System] Using fallback logic")
        
        # 1. Từ điển ánh xạ tên trường kỹ thuật sang ngôn ngữ tự nhiên
        field_labels = {
            'nationality': {
                'vi': 'quốc tịch', 
                'en': 'nationality'
            },
            'problem_category': {
                'vi': 'vấn đề bạn đang gặp', 
                'en': 'the issue you are facing'
            }
        }

        # 2. Logic đoán ngôn ngữ (Mở rộng thêm từ khóa không dấu)
        # Check dấu tiếng việt HOẶC các từ phổ biến: tôi, là, ở, bị...
        vi_indicators = ['à','á','ạ','ả','ã','â','ầ','ấ','ậ','ẩ','ẫ','ă','ằ','ắ','ặ','ẳ','ẵ','è','é','ẹ','ẻ','ẽ','ê','ề','ế','ệ','ể','ễ','ì','í','ị','ỉ','ĩ','ò','ó','ọ','ỏ','õ','ô','ồ','ố','ộ','ổ','ỗ','ơ','ờ','ớ','ợ','ở','ỡ','ù','ú','ụ','ủ','ũ','ư','ừ','ứ','ự','ử','ữ','ỳ','ý','ỵ','ỷ','ỹ','đ', 'tôi', 'mình', 'là', 'đang', 'bị', 'cần']
        is_vietnamese = any(w in query.lower() for w in vi_indicators)
        
        core_fields = ['nationality', 'problem_category']
        questions = []
        
        # 3. Xác định trường thiếu
        missing_fields = [f for f in core_fields if not collected_info.get(f)]
        
        if missing_fields:
            # Chuyển tên trường (ví dụ: 'nationality') sang tên hiển thị (ví dụ: 'quốc tịch')
            lang_key = 'vi' if is_vietnamese else 'en'
            readable_missing = [field_labels.get(f, {}).get(lang_key, f) for f in missing_fields]
            
            # Tạo câu hỏi tự nhiên hơn
            if is_vietnamese:
                q_str = ", ".join(readable_missing)
                questions = [f"Để hỗ trợ tốt nhất, mình cần biết thêm về: {q_str}."]
            else:
                q_str = ", ".join(readable_missing)
                questions = [f"To assist you better, I need to know your: {q_str}."]

        # 4. Tạo info_status đầy đủ (bao gồm cả trường thiếu = 0)
        full_status = {}
        # Duyệt qua danh sách core_fields để đảm bảo báo cáo đủ status 0 cho trường thiếu
        all_relevant = set(list(collected_info.keys()) + core_fields)
        for field in all_relevant:
            if collected_info.get(field) and collected_info[field] not in ["null", "None", ""]:
                full_status[field] = 1
            else:
                full_status[field] = 0

        return {
            "collected_info": collected_info,
            "info_status": full_status,
            "is_sufficient": len(missing_fields) == 0,
            "questions": questions
        }