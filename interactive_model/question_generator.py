"""
Question Generator - Generates questions for missing information
"""
import json
from typing import Dict, List, Any
import google.generativeai as genai
from config import REQUIRED_FIELDS


class QuestionGenerator:
    """Generates contextual questions for missing information"""
    
    def __init__(self, model: genai.GenerativeModel):
        self.model = model
    
    def generate(self, info_status: Dict[str, int], collected_info: Dict[str, Any] = None, user_query: str = "") -> List[str]:
        """Generate questions for fields with status = 0"""
        missing_fields = [field for field, status in info_status.items() if status == 0]
        
        if not missing_fields:
            return []
        
        # Limit to 3 questions
        missing_fields = missing_fields[:3]
        
        # Build context from config
        fields_context = []
        for field in missing_fields:
            desc = REQUIRED_FIELDS[field]['description']
            examples = REQUIRED_FIELDS[field]['examples']
            fields_context.append(f"- {field}: {desc} (examples: {', '.join(map(str, examples[:2]))})")
        
        # Add collected info for context
        context = f"\nAlready collected: {json.dumps(collected_info, ensure_ascii=False)}" if collected_info else ""
        query_context = f"\nUser's original query: \"{user_query}\"" if user_query else ""
        
        prompt = f"""Generate friendly questions to collect missing information.
IMPORTANT: Use the SAME LANGUAGE as the user's query.

Missing fields:
{chr(10).join(fields_context)}{context}{query_context}

Requirements:
- Use the same language as the user (Vietnamese, English, Indonesian, etc.)
- Natural, concise questions
- Context-appropriate
- Return JSON array of strings only

Example: ["What is your address?", "What is your full name?"]"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = self._clean_response(response.text)
            questions = json.loads(response_text)
            return questions if isinstance(questions, list) else []
        except Exception as e:
            print(f"[ERROR] Question generation failed: {e}")
            # Fallback: generate simple questions
            return [self._fallback_question(field) for field in missing_fields]
    
    def _fallback_question(self, field: str) -> str:
        """Generate a simple fallback question"""
        fallback = {
            "current_address": "Bạn đang ở địa chỉ nào?",
            "num_people": "Có bao nhiêu người?",
            "nationality": "Quốc tịch của bạn?",
            "problem": "Vấn đề bạn gặp phải?",
            "full_name": "Họ tên đầy đủ của bạn?",
            "birth_year": "Bạn sinh năm nào?"
        }
        return fallback.get(field, f"Vui lòng cung cấp {REQUIRED_FIELDS.get(field, {}).get('description', field)}")
    
    def _clean_response(self, text: str) -> str:
        """Remove markdown code blocks"""
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]) if len(lines) > 2 else text
            if text.startswith("json"):
                text = text[4:].strip()
        return text.strip()
