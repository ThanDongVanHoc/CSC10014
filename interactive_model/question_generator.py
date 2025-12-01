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
        """Generate up to 5 most important questions for fields with status = 0"""
        missing_fields = [field for field, status in info_status.items() if status == 0]
        
        if not missing_fields:
            return []
        
        # If there are many missing fields, ask AI to prioritize
        if len(missing_fields) > 5:
            missing_fields = self._prioritize_fields(missing_fields, collected_info, user_query)
        
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
- Generate MAXIMUM 5 questions (prioritize the most important ones)
- Natural, concise questions
- Context-appropriate
- Return JSON array of strings only

Example: ["What is your address?", "What is your nationality?", "What happened?"]"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = self._clean_response(response.text)
            questions = json.loads(response_text)
            return questions if isinstance(questions, list) else []
        except Exception as e:
            print(f"[ERROR] Question generation failed: {e}")
            # Fallback: generate simple questions
            return [self._fallback_question(field) for field in missing_fields]
    
    def _prioritize_fields(self, missing_fields: List[str], collected_info: Dict[str, Any], user_query: str) -> List[str]:
        """Prioritize the most important fields to ask about
        
        Args:
            missing_fields: List of all missing field names
            collected_info: Already collected information
            user_query: User's original query
            
        Returns:
            Top 5 most important fields
        """
        fields_desc = "\n".join([
            f"- {field}: {REQUIRED_FIELDS[field]['description']}"
            for field in missing_fields
        ])
        
        prompt = f"""Prioritize which fields are MOST IMPORTANT to collect first.

User query: "{user_query}"
Already collected: {json.dumps(collected_info, ensure_ascii=False)}

Missing fields:
{fields_desc}

RULES:
1. Select TOP 5 most critical fields for this specific situation
2. Core identity fields (nationality, current_location) are usually high priority
3. Problem-specific fields should be prioritized (e.g., visa fields for visa issues)
4. Urgent/safety fields should come first
5. Nice-to-have fields (budget_preference, group_size) can be deprioritized

Return ONLY a JSON array of exactly 5 field names in priority order: ["field1", "field2", "field3", "field4", "field5"]

Example: ["nationality", "current_location", "visa_type", "visa_expiry_status", "time_constraint"]"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = self._clean_response(response.text)
            prioritized = json.loads(response_text)
            
            if isinstance(prioritized, list) and len(prioritized) > 0:
                # Validate fields
                valid_prioritized = [f for f in prioritized if f in missing_fields]
                return valid_prioritized[:5]
        except Exception as e:
            print(f"[ERROR] Prioritization failed: {e}")
        
        # Fallback: return first 5 fields
        return missing_fields[:5]
    
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
