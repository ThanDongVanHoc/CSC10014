"""
Medical Translation Card - Configuration
Quản lý tất cả settings tập trung
"""

import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


@dataclass(frozen=True)
class GeminiConfig:
    """Cấu hình cho Gemini AI"""
    api_key: str
    model_name: str = "gemini-2.5-flash-lite"
    temperature: float = 0.3
    max_output_tokens: int = 500


@dataclass(frozen=True)
class AppConfig:
    """Cấu hình chung cho ứng dụng"""
    app_name: str = "Medical Translation Card API"
    version: str = "1.0.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000


class Settings:
    """
    Singleton class quản lý tất cả settings của ứng dụng
    """
    _instance: Optional["Settings"] = None
    
    def __new__(cls) -> "Settings":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self) -> None:
        """Khởi tạo settings từ environment variables"""
        gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        
        self.gemini = GeminiConfig(
            api_key=gemini_api_key,
            model_name=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
            temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.3")),
            max_output_tokens=int(os.getenv("GEMINI_MAX_TOKENS", "500"))
        )
        
        self.app = AppConfig(
            app_name=os.getenv("APP_NAME", "Medical Translation Card API"),
            version=os.getenv("APP_VERSION", "1.0.0"),
            debug=os.getenv("DEBUG", "false").lower() == "true",
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "8000"))
        )
    
    @property
    def is_ai_available(self) -> bool:
        """Kiểm tra xem AI service có khả dụng không"""
        return bool(self.gemini.api_key)


# Global settings instance
settings = Settings()
