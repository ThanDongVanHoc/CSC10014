"""
Guide Generator V2 - Creates instruction guides for ALL locations from Model A results
"""
import json
from typing import Dict, Any, List
import google.generativeai as genai


class GuideGeneratorV2:
    """Generates comprehensive guides for multiple locations"""
    
    def __init__(self, model: genai.GenerativeModel):
        self.model = model
    
    def generate_for_all_locations(
        self, 
        top_k_results: List[Dict[str, Any]], 
        original_query: str, 
        user_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate structured guides for ALL k locations in the results"""
        
        guides = []
        for idx, location in enumerate(top_k_results):
            print(f"[INFO] Generating guide for location {idx + 1}/{len(top_k_results)}: {location.get('Ten', 'N/A')}")
            guide = self.generate_single_guide(location, original_query, user_info)
            guides.append({
                "location_info": location,
                "guide": guide,
                "rank": idx + 1
            })
        
        return guides
    
    def generate_single_guide(
        self, 
        location: Dict[str, Any], 
        original_query: str, 
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate structured guide for a single location"""
        
        prompt = f"""Create a detailed, structured guide for the user.
IMPORTANT: Use the SAME LANGUAGE as the user's query.

Location information:
- Name: {location.get('Ten', 'N/A')}
- Address: {location.get('DiaChi', 'N/A')}
- Phone: {location.get('SDT', 'N/A')}
- Website: {location.get('Website', 'N/A')}
- Category: {location.get('Category', 'N/A')}

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
            print(f"[ERROR] Guide generation failed for {location.get('Ten', 'N/A')}: {e}")
            return self._fallback_guide(location, user_info)
    
    def _fallback_guide(self, location: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate basic fallback guide"""
        return {
            "Chuẩn bị": f"Chuẩn bị giấy tờ liên quan đến: {user_info.get('problem', 'vấn đề của bạn')}",
            "Giấy tờ cần thiết": "CMND/CCCD, Hộ chiếu (người nước ngoài), Giấy tờ liên quan",
            "Địa điểm và thời gian": f"Địa chỉ: {location.get('DiaChi', 'N/A')}\nSĐT: {location.get('SDT', 'N/A')}\nWebsite: {location.get('Website', 'N/A')}",
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
