"""
Medical Translation Card - AI Client
Quản lý kết nối với Gemini AI theo pattern Singleton
"""

import json
from typing import Optional, Dict, Any
import google.generativeai as genai

from config import settings
from models import TriageLevel, MedicalCategory


class GeminiClient:
    """
    Singleton class quản lý kết nối với Gemini AI
    Chỉ khởi tạo model một lần duy nhất
    """
    _instance: Optional["GeminiClient"] = None
    _model: Optional[genai.GenerativeModel] = None
    _initialized: bool = False
    
    def __new__(cls) -> "GeminiClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self) -> None:
        if not self._initialized and settings.is_ai_available:
            self._setup_model()
            GeminiClient._initialized = True
    
    def _setup_model(self) -> None:
        """Khởi tạo Gemini model"""
        try:
            genai.configure(api_key=settings.gemini.api_key)
            self._model = genai.GenerativeModel(settings.gemini.model_name)
            print(f"✅ Gemini AI initialized: {settings.gemini.model_name}")
        except Exception as e:
            print(f"❌ Failed to initialize Gemini AI: {e}")
            self._model = None
    
    @property
    def is_available(self) -> bool:
        """Kiểm tra model có sẵn sàng không"""
        return self._model is not None
    
    def _get_generation_config(self) -> genai.types.GenerationConfig:
        """Tạo generation config từ settings"""
        return genai.types.GenerationConfig(
            temperature=settings.gemini.temperature,
            max_output_tokens=settings.gemini.max_output_tokens
        )
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON từ response của Gemini, xử lý markdown code blocks"""
        content = content.strip()
        
        # Xử lý markdown code block
        if content.startswith("```"):
            lines = content.split("```")
            if len(lines) >= 2:
                content = lines[1]
                if content.startswith("json"):
                    content = content[4:]
        
        content = content.strip()
        
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parse error: {e}")
            return None
    
    def standardize_symptom(self, symptom: str) -> Optional[Dict[str, Any]]:
        """
        Gọi Gemini AI để chuẩn hóa triệu chứng
        Returns: Dict với thông tin đã chuẩn hóa hoặc None nếu fail
        """
        if not self.is_available:
            return None
        
        prompt = f"""Bạn là bác sĩ cấp cứu song ngữ Anh-Việt. Chuẩn hóa triệu chứng sau:

Triệu chứng: "{symptom}"

Chỉ trả về JSON (không có markdown code block), format:
{{
    "en": "Thuật ngữ tiếng Anh chuyên ngành",
    "vi": "Thuật ngữ tiếng Việt chuyên ngành",
    "category": "cardiovascular|neurological|respiratory|gastrointestinal|trauma|allergic|metabolic|infectious|other",
    "triage_level": "1|2|3|4|5",
    "clinical_note": "Ghi chú lâm sàng (nếu có)"
}}"""
        
        try:
            response = self._model.generate_content(
                prompt, 
                generation_config=self._get_generation_config()
            )
            
            ai_data = self._parse_json_response(response.text)
            if not ai_data:
                return None
            
            # Map string values to enums
            return self._map_symptom_response(symptom, ai_data)
            
        except Exception as e:
            print(f"❌ Gemini AI error: {e}")
            return None
    
    def _map_symptom_response(self, original: str, ai_data: Dict) -> Dict[str, Any]:
        """Map AI response to internal format with enums"""
        triage_map = {
            "1": TriageLevel.LEVEL_1_RED,
            "2": TriageLevel.LEVEL_2_ORANGE,
            "3": TriageLevel.LEVEL_3_YELLOW,
            "4": TriageLevel.LEVEL_4_BLUE,
            "5": TriageLevel.LEVEL_5_GREEN
        }
        
        category_map = {
            "cardiovascular": MedicalCategory.CARDIOVASCULAR,
            "neurological": MedicalCategory.NEUROLOGICAL,
            "respiratory": MedicalCategory.RESPIRATORY,
            "gastrointestinal": MedicalCategory.GASTROINTESTINAL,
            "trauma": MedicalCategory.TRAUMA,
            "allergic": MedicalCategory.ALLERGIC,
            "metabolic": MedicalCategory.METABOLIC,
            "infectious": MedicalCategory.INFECTIOUS,
            "other": MedicalCategory.OTHER
        }
        
        return {
            "original": original,
            "en": ai_data.get("en"),
            "vi": ai_data.get("vi"),
            "category": category_map.get(ai_data.get("category", "other"), MedicalCategory.OTHER),
            "triage_hint": triage_map.get(ai_data.get("triage_level", "3"), TriageLevel.LEVEL_3_YELLOW),
            "clinical_note": ai_data.get("clinical_note"),
            "found_in_db": False,
            "source": "ai_gemini"
        }


# Global AI client instance
ai_client = GeminiClient()
