"""
Guide Generator - Creates instruction guides from Model A results
"""
import json
from typing import Dict, Any, List
import google.generativeai as genai


class GuideGenerator:
    """Generates comprehensive guides based on location results"""
    
    def __init__(self, model: genai.GenerativeModel):
        self.model = model
    
    def generate(
        self, 
        top_result: Dict[str, Any], 
        original_query: str, 
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate structured guide for the top result location"""
        
        prompt = f"""Create a detailed, structured guide for the user.
IMPORTANT: Use the SAME LANGUAGE as the user's query.

Location information:
- Name: {top_result.get('Ten', 'N/A')}
- Address: {top_result.get('DiaChi', 'N/A')}
- Phone: {top_result.get('SDT', 'N/A')}
- Website: {top_result.get('Website', 'N/A')}

User's query: "{original_query}"
Nationality: {user_info.get('nationality', 'N/A')}
Problem: {user_info.get('problem', 'N/A')}

Create a JSON object with 5 sections (use appropriate section names in the user's language):
1. Preparation: What to prepare beforehand
2. Required Documents: List of necessary documents
3. Location & Time: How to get there, operating hours, contact
4. Procedures: Step-by-step process
5. Important Notes: Special requirements based on nationality

Priority for information sources:
- Government/official sources first
- Reliable sources second
- Logical reasoning last

Format: Clear, concise, use bullet points. Return JSON only."""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = self._clean_response(response.text)
            guide = json.loads(response_text)
            return guide
        except Exception as e:
            print(f"[ERROR] Guide generation failed: {e}")
            return self._fallback_guide(top_result, user_info)
    
    def _fallback_guide(self, top_result: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate basic fallback guide"""
        return {
            "Chuẩn bị": f"Chuẩn bị giấy tờ liên quan đến: {user_info.get('problem', 'vấn đề của bạn')}",
            "Giấy tờ cần thiết": "CMND/CCCD, Hộ chiếu (người nước ngoài), Giấy tờ liên quan",
            "Địa điểm và thời gian": f"Địa chỉ: {top_result.get('DiaChi', 'N/A')}\nSĐT: {top_result.get('SDT', 'N/A')}\nWebsite: {top_result.get('Website', 'N/A')}",
            "Thủ tục": "1. Liên hệ trước qua điện thoại\n2. Chuẩn bị đầy đủ giấy tờ\n3. Đến địa điểm trong giờ hành chính",
            "Lưu ý quan trọng": f"Lưu ý cho người {user_info.get('nationality', 'nước ngoài')}: Kiểm tra yêu cầu đặc biệt trên website"
        }
    
    def _clean_response(self, text: str) -> str:
        """Remove markdown code blocks"""
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]) if len(lines) > 2 else text
            if text.startswith("json"):
                text = text[4:].strip()
        return text.strip()
