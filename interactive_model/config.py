"""
Configuration file for the interactive model
Centralized place to manage all settings and field definitions
"""

# Required fields for information collection
REQUIRED_FIELDS = {
    "current_address": {
        "type": "str",
        "description": "Địa chỉ hiện tại",
        "examples": ["quận 1", "123 đường ABC, quận 3"]
    },
    "num_people": {
        "type": "int",
        "description": "Số người gặp vấn đề",
        "examples": [1, 2, 5]
    },
    "nationality": {
        "type": "str",
        "description": "Quốc tịch",
        "examples": ["Indonesia", "Việt Nam", "Malaysia"]
    },
    "problem": {
        "type": "str",
        "description": "Vấn đề đang gặp",
        "examples": ["gia hạn visa", "làm hộ chiếu", "đăng ký kết hôn"]
    },
    "full_name": {
        "type": "str",
        "description": "Họ và tên đầy đủ",
        "examples": ["Budi Santoso", "Nguyễn Văn A"]
    },
    "birth_year": {
        "type": "int",
        "description": "Năm sinh",
        "examples": [1990, 1985, 2000]
    }
}

# Model configuration
GEMINI_MODEL_NAME = 'gemini-2.5-flash'

# API settings
API_HOST = "0.0.0.0"
API_PORT = 8000
