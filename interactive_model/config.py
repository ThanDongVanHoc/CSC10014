"""
Configuration file for the interactive model
Centralized place to manage all settings and field definitions
"""

# Required fields for information collection
REQUIRED_FIELDS = {
    # --- NHÓM 1: ĐỊNH DANH & VỊ TRÍ CỐT LÕI (Core Identity & Location) ---
    # [cite_start]Dùng để tính điểm Relevance (Model A) [cite: 50, 54]
    
    "nationality": {
        "type": "str",
        "description": "Quốc tịch của người dùng (Bắt buộc để tìm Lãnh sự quán phù hợp).",
        "examples": ["Indonesian", "French", "Japanese", "American"]
    },
    "current_location": {
        "type": "str",
        "description": "Địa chỉ/Khu vực hiện tại (Bắt buộc để tính khoảng cách Haversine).",
        "examples": ["District 1", "Thao Dien Ward", "123 Nguyen Hue"]
    },
    "language_spoken": {
        "type": "str",
        "description": "Ngôn ngữ người dùng có thể giao tiếp (Để tìm nơi có phiên dịch/staff phù hợp).",
        "examples": ["English only", "Vietnamese & English", "Korean"]
    },
    "problem_category": {
        "type": "str",
        "description": "Phân loại vấn đề chính để chọn database tìm kiếm.",
        "examples": ["Lost_Passport", "Medical_Emergency", "Visa_Issue", "Theft"]
    },

    # --- NHÓM 2: PHÁP LÝ & GIẤY TỜ (Legal & Admin Context) ---
    # [cite_start]Dùng khi mất giấy tờ, visa, thủ tục hành chính [cite: 14]

    "incident_location": {
        "type": "str",
        "description": "Nơi xảy ra sự việc (Quan trọng để tìm Công an phường đúng tuyến).",
        "examples": ["Ben Thanh Market", "District 4", "Tan Son Nhat Airport"]
    },
    "police_report_status": {
        "type": "str",
        "description": "Đã có biên bản công an chưa? (Yes: Đi LSQ / No: Đi Công an).",
        "examples": ["Yes", "No", "Not yet"]
    },
    "lost_items": {
        "type": "list",
        "description": "Danh sách các tài sản bị mất.",
        "examples": ["Passport", "Wallet", "Phone", "Laptop"]
    },
    "visa_type": {
        "type": "str",
        "description": "Loại visa đang sử dụng (Quyết định quy trình xử lý).",
        "examples": ["Tourist", "Business", "Student", "E-visa"]
    },
    "visa_expiry_status": {
        "type": "str",
        "description": "Tình trạng hạn visa (Để xác định độ khẩn cấp/phạt).",
        "examples": ["Valid", "Expired < 3 days", "Overstayed"]
    },
    "document_condition": {
        "type": "str",
        "description": "Tình trạng giấy tờ hiện tại.",
        "examples": ["Lost", "Damaged", "Wet", "Expired"]
    },

    # --- NHÓM 3: Y TẾ & SỨC KHỎE (Medical & Health Context) ---
    # Dùng khi ốm đau, tai nạn (Cần lọc bệnh viện)

    "symptom_urgency": {
        "type": "str",
        "description": "Mức độ nghiêm trọng của triệu chứng.",
        "examples": ["Critical (Emergency)", "High (Fever/Pain)", "Low (Check-up)"]
    },
    "insurance_status": {
        "type": "str",
        "description": "Loại bảo hiểm y tế đang có (Để lọc bệnh viện quốc tế/tư nhân).",
        "examples": ["International Insurance", "Travel Insurance", "None/Cash"]
    },
    "mobility_status": {
        "type": "str",
        "description": "Khả năng di chuyển của người bệnh.",
        "examples": ["Walkable", "Wheelchair needed", "Ambulance needed"]
    },
    "medical_history": {
        "type": "str",
        "description": "Lưu ý y tế quan trọng (Dị ứng, thai sản...).",
        "examples": ["Pregnant", "Allergic to Penicillin", "None"]
    },

    # --- NHÓM 4: AN NINH & KHẨN CẤP (Security & Safety) ---
    # Dùng khi bị đe dọa, tai nạn giao thông

    "threat_level": {
        "type": "str",
        "description": "Mức độ nguy hiểm hiện tại.",
        "examples": ["Safe", "Being followed", "In danger"]
    },
    "vehicle_involved": {
        "type": "str",
        "description": "Phương tiện liên quan đến tai nạn (nếu có).",
        "examples": ["Motorbike", "Taxi", "Pedestrian"]
    },
    "witness_availability": {
        "type": "str",
        "description": "Có nhân chứng tại hiện trường không?",
        "examples": ["Yes", "No"]
    },

    # --- NHÓM 5: NHÂN KHẨU & HẬU CẦN (Demographics & Logistics) ---
    # [cite_start]Dùng để tạo Instruction và Personalize [cite: 79, 84]

    "age_group": {
        "type": "str",
        "description": "Nhóm tuổi (Thay thế năm sinh để bảo mật PII).",
        "examples": ["Adult", "Minor (<16)", "Elderly"]
    },
    "group_size": {
        "type": "int",
        "description": "Số lượng người gặp vấn đề.",
        "examples": [1, 2, 5]
    },
    "residence_type": {
        "type": "str",
        "description": "Loại hình nơi ở hiện tại (Ảnh hưởng thủ tục tạm trú).",
        "examples": ["Hotel", "Homestay", "Private Apartment"]
    },
    "budget_preference": {
        "type": "str",
        "description": "Mức độ chi trả mong muốn.",
        "examples": ["Budget/Low", "Standard", "Premium/High"]
    },
    "time_constraint": {
        "type": "str",
        "description": "Ràng buộc về thời gian xử lý.",
        "examples": ["Urgent (Now)", "Tomorrow", "Next week"]
    },
    "full_name": {
         "type": "str",
         "description": "Họ tên (Chỉ hỏi khi thực sự cần điền form, ưu tiên ẩn danh).",
         "examples": ["John Doe", "Nguyễn Văn A"]
    }
}

# Model configuration
GEMINI_MODEL_NAME = 'gemini-2.5-flash'

# API settings
API_HOST = "0.0.0.0"
API_PORT = 8000
