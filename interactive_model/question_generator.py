import json
import re
from typing import Dict, List, Any
import google.generativeai as genai
from config import REQUIRED_FIELDS

class QuestionGenerator:
    """Generates contextual questions for missing information"""
    
    def __init__(self, model: genai.GenerativeModel):
        self.model = model
    
    def generate(self, info_status: Dict[str, int], collected_info: Dict[str, Any] = None, user_query: str = "") -> List[str]:
        missing_fields = [field for field, status in info_status.items() if status == 0]
        if not missing_fields: return []

        # Context fields
        fields_context = []
        for field in missing_fields:
            # Lấy description tiếng Anh để AI hiểu ngữ nghĩa field
            desc = REQUIRED_FIELDS.get(field, {}).get('description', field) 
            fields_context.append(f"- {field}: {desc}")

        # --- KEY CHANGE: PROMPT ---
        prompt = f"""You are an intelligent assistant.
        
        DATA:
        - Current Knowledge: {json.dumps(collected_info, ensure_ascii=False)}
        - User Input: "{user_query}"
        
        TASK:
        The user is providing information. However, the following fields are still MISSING:
        {chr(10).join(fields_context)}
        
        REQUIREMENTS:
        1. Analyze the language of the 'User Input'.
        2. Generate 3 to 5 distinct questions to ask for the missing fields based on the context.
        3. STRICTLY MATCH THE LANGUAGE of the 'User Input'. 
           - If User Input is German -> Output German questions.
           - If User Input is Vietnamese -> Output Vietnamese questions.
        4. Output strictly a JSON array of strings.
        """
        
        try:
            response = self.model.generate_content(prompt)
            # ... (giữ nguyên phần xử lý response như câu trả lời trước)
            return self._extract_json_list(response.text)
        except Exception as e:
            print(f"Error: {e}")
            return [self._fallback_question(f) for f in missing_fields] # Fallback này vẫn sẽ là tiếng Việt/Anh cứng

    def _extract_json_list(self, text: str) -> List[str]:
        """Robust extraction of JSON list using Regex"""
        try:
            # Tìm pattern [...] bao gồm xuống dòng
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                json_str = match.group()
                return json.loads(json_str)
            return []
        except json.JSONDecodeError:
            return []

    def _fallback_question(self, field: str) -> str:
        """Generate a simple fallback question"""
        # Cố gắng lấy mô tả từ config để tạo câu hỏi dynamic thay vì hardcode
        field_info = REQUIRED_FIELDS.get(field, {})
        desc = field_info.get('description', field)
        
        # Fallback dictionary (giữ lại các câu hỏi customized)
        custom_fallback = {
            "current_address": "Địa chỉ hiện tại của bạn là gì?",
            "problem": "Bạn có thể mô tả chi tiết vấn đề không?",
            # ...
        }
        
        return custom_fallback.get(field, f"Vui lòng cung cấp thông tin về: {desc}")