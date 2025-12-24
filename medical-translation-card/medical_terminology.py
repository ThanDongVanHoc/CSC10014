"""
Medical Translation Card - Medical Terminology Database
Cơ sở dữ liệu thuật ngữ y khoa song ngữ Anh-Việt
Dựa trên tài liệu "Xây dựng Thẻ Dịch Thuật Y Khoa" và tiêu chuẩn IPS
"""

from typing import Dict, List, Optional, Tuple
from models import TriageLevel, MedicalCategory

# ==================== TRIAGE LEVELS ====================
# Hệ thống phân loại cấp cứu theo Bộ Y tế Việt Nam

TRIAGE_LEVELS = {
    TriageLevel.LEVEL_1_RED: {
        "color": "red",
        "color_hex": "#DC2626",
        "name_en": "Resuscitation / Life Threatening",
        "name_vi": "Cấp cứu tối khẩn / Nguy kịch",
        "response_time": "Ngay lập tức (Immediate)",
        "response_minutes": 0,
        "examples": [
            "ngừng tim", "ngừng thở", "đa chấn thương nặng", "hôn mê sâu",
            "sốc phản vệ", "cardiac arrest", "respiratory arrest"
        ]
    },
    TriageLevel.LEVEL_2_ORANGE: {
        "color": "orange", 
        "color_hex": "#EA580C",
        "name_en": "Emergency / Severe",
        "name_vi": "Cấp cứu / Nặng",
        "response_time": "< 10 phút",
        "response_minutes": 10,
        "examples": [
            "đau ngực cấp", "nhồi máu cơ tim", "khó thở dữ dội", "sốc",
            "acute chest pain", "myocardial infarction", "severe dyspnea"
        ]
    },
    TriageLevel.LEVEL_3_YELLOW: {
        "color": "yellow",
        "color_hex": "#FFD700",
        "name_en": "Urgent / Moderate", 
        "name_vi": "Khẩn cấp / Trung bình",
        "response_time": "< 30 phút",
        "response_minutes": 30,
        "examples": [
            "đau bụng cấp", "sốt cao", "gãy xương kín", "khó thở nhẹ",
            "acute abdominal pain", "high fever", "closed fracture"
        ]
    },
    TriageLevel.LEVEL_4_BLUE: {
        "color": "blue",
        "color_hex": "#2563EB",
        "name_en": "Less Urgent / Semi-Urgent",
        "name_vi": "Ít khẩn cấp / Nhẹ",
        "response_time": "< 60 phút",
        "response_minutes": 60,
        "examples": [
            "chấn thương phần mềm", "đau nhẹ", "rối loạn tiêu hóa",
            "soft tissue injury", "mild pain", "GI disturbance"
        ]
    },
    TriageLevel.LEVEL_5_GREEN: {
        "color": "green",
        "color_hex": "#16A34A",
        "name_en": "Non-Urgent",
        "name_vi": "Không khẩn cấp",
        "response_time": "< 120 phút",
        "response_minutes": 120,
        "examples": [
            "khám bệnh thông thường", "thay băng", "lấy thuốc định kỳ",
            "routine exam", "dressing change", "medication refill"
        ]
    }
}


# ==================== SYMPTOM TERMINOLOGY ====================
# Thuật ngữ triệu chứng theo hệ cơ quan

SYMPTOM_DICTIONARY: Dict[str, Dict] = {
    # === TIM MẠCH (Cardiovascular) ===
    "chest pain": {
        "en": "Chest Pain",
        "vi": "Đau ngực",
        "category": MedicalCategory.CARDIOVASCULAR,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE,
        "clinical_note": "Cần xác định tính chất đau: bóp nghẹt, đè nặng"
    },
    "đau ngực": {
        "en": "Chest Pain",
        "vi": "Đau ngực",
        "category": MedicalCategory.CARDIOVASCULAR,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE,
        "clinical_note": "Nghi ngờ Hội chứng vành cấp"
    },
    "angina": {
        "en": "Angina",
        "vi": "Đau thắt ngực",
        "vi_detail": "Cảm giác bóp nghẹt / Đè nặng",
        "category": MedicalCategory.CARDIOVASCULAR,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE,
        "clinical_note": "Điển hình của thiếu máu cơ tim"
    },
    "đau thắt ngực": {
        "en": "Angina",
        "vi": "Đau thắt ngực",
        "category": MedicalCategory.CARDIOVASCULAR,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "palpitations": {
        "en": "Palpitations",
        "vi": "Hồi hộp / Đánh trống ngực",
        "category": MedicalCategory.CARDIOVASCULAR,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW,
        "clinical_note": "Dấu hiệu rối loạn nhịp tim"
    },
    "cardiac arrest": {
        "en": "Cardiac Arrest",
        "vi": "Ngừng tuần hoàn / Ngừng tim",
        "category": MedicalCategory.CARDIOVASCULAR,
        "triage_hint": TriageLevel.LEVEL_1_RED,
        "clinical_note": "CPR ngay lập tức"
    },
    "ngừng tim": {
        "en": "Cardiac Arrest",
        "vi": "Ngừng tuần hoàn / Ngừng tim",
        "category": MedicalCategory.CARDIOVASCULAR,
        "triage_hint": TriageLevel.LEVEL_1_RED
    },
    "syncope": {
        "en": "Syncope",
        "vi": "Ngất / Cơn ngất xỉu",
        "category": MedicalCategory.CARDIOVASCULAR,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW,
        "clinical_note": "Mất ý thức thoáng qua do giảm tưới máu não"
    },
    "shortness of breath": {
        "en": "Shortness of Breath / Dyspnea",
        "vi": "Khó thở / Hụt hơi",
        "category": MedicalCategory.RESPIRATORY,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "khó thở": {
        "en": "Shortness of Breath / Dyspnea",
        "vi": "Khó thở",
        "category": MedicalCategory.RESPIRATORY,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "hypertensive urgency": {
        "en": "Hypertensive Urgency",
        "vi": "Cơn tăng huyết áp khẩn cấp",
        "category": MedicalCategory.CARDIOVASCULAR,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE,
        "clinical_note": "HA > 180/110 mmHg kèm triệu chứng"
    },
    
    # === THẦN KINH (Neurological) ===
    "thunderclap headache": {
        "en": "Thunderclap Headache",
        "vi": "Đau đầu sét đánh",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED,
        "clinical_note": "Nghi ngờ Xuất huyết dưới nhện (SAH)"
    },
    "đau đầu sét đánh": {
        "en": "Thunderclap Headache",
        "vi": "Đau đầu sét đánh",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED,
        "clinical_note": "Cảnh báo xuất huyết dưới nhện"
    },
    "severe headache": {
        "en": "Severe Headache",
        "vi": "Đau đầu dữ dội",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "đau đầu": {
        "en": "Headache",
        "vi": "Đau đầu",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "headache": {
        "en": "Headache",
        "vi": "Đau đầu",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "stroke": {
        "en": "Stroke",
        "vi": "Đột quỵ / Tai biến mạch máu não",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED,
        "clinical_note": "Yếu liệt nửa người, méo miệng, nói đớ"
    },
    "đột quỵ": {
        "en": "Stroke",
        "vi": "Đột quỵ / Tai biến mạch máu não",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED
    },
    "seizure": {
        "en": "Seizure / Convulsion",
        "vi": "Co giật / Cơn động kinh",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "co giật": {
        "en": "Seizure / Convulsion",
        "vi": "Co giật / Cơn động kinh",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "loss of consciousness": {
        "en": "Loss of Consciousness / Coma",
        "vi": "Mất ý thức / Hôn mê",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED,
        "clinical_note": "Đánh giá thang điểm Glasgow (GCS)"
    },
    "hôn mê": {
        "en": "Loss of Consciousness / Coma",
        "vi": "Mất ý thức / Hôn mê",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED
    },
    "numbness": {
        "en": "Numbness / Paresthesia",
        "vi": "Tê bì / Dị cảm",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "vertigo": {
        "en": "Vertigo",
        "vi": "Chóng mặt xoay tròn",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW,
        "clinical_note": "Phân biệt tiền đình vs tim mạch"
    },
    "chóng mặt": {
        "en": "Vertigo / Dizziness",
        "vi": "Chóng mặt",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "dizziness": {
        "en": "Dizziness",
        "vi": "Chóng mặt",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "hemiplegia": {
        "en": "Hemiplegia",
        "vi": "Liệt nửa người",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED
    },
    "liệt nửa người": {
        "en": "Hemiplegia",
        "vi": "Liệt nửa người",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED
    },
    "slurred speech": {
        "en": "Slurred Speech / Difficulty Speaking",        
        "vi": "Nói đớ / Khó nói",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED,
        "clinical_note": "Dấu hiệu cảnh báo Đột quỵ (Stroke - FAST)"
    },
    "nói đớ": {
        "en": "Slurred Speech / Difficulty Speaking",
        "vi": "Nói đớ / Khó nói",
        "category": MedicalCategory.NEUROLOGICAL,
        "triage_hint": TriageLevel.LEVEL_1_RED
    },
    
    # === DỊ ỨNG (Allergic) ===
    "anaphylaxis": {
        "en": "Anaphylaxis",
        "vi": "Sốc phản vệ",
        "category": MedicalCategory.ALLERGIC,
        "triage_hint": TriageLevel.LEVEL_1_RED,
        "clinical_note": "NGUY HIỂM - Chuẩn bị Adrenaline ngay"
    },
    "sốc phản vệ": {
        "en": "Anaphylaxis",
        "vi": "Sốc phản vệ",
        "category": MedicalCategory.ALLERGIC,
        "triage_hint": TriageLevel.LEVEL_1_RED,
        "clinical_note": "CẤP CỨU TỐI KHẨN - Tiêm Adrenaline 0.5mg IM"
    },
    "allergic reaction": {
        "en": "Allergic Reaction",
        "vi": "Phản ứng dị ứng",
        "category": MedicalCategory.ALLERGIC,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "dị ứng": {
        "en": "Allergy / Allergic Reaction",
        "vi": "Dị ứng",
        "category": MedicalCategory.ALLERGIC,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "urticaria": {
        "en": "Urticaria / Hives",
        "vi": "Nổi mề đay",
        "category": MedicalCategory.ALLERGIC,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "nổi mề đay": {
        "en": "Urticaria / Hives",
        "vi": "Nổi mề đay",
        "category": MedicalCategory.ALLERGIC,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "angioedema": {
        "en": "Angioedema",
        "vi": "Phù mạch",
        "category": MedicalCategory.ALLERGIC,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE,
        "clinical_note": "Nguy cơ tắc nghẽn đường thở"
    },
    "phù mạch": {
        "en": "Angioedema",
        "vi": "Phù mạch",
        "category": MedicalCategory.ALLERGIC,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "wheezing": {
        "en": "Wheezing",
        "vi": "Khò khè",
        "category": MedicalCategory.RESPIRATORY,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE,
        "clinical_note": "Co thắt phế quản do dị ứng"
    },
    
    # === TIÊU HÓA (Gastrointestinal) ===
    "abdominal pain": {
        "en": "Abdominal Pain",
        "vi": "Đau bụng",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW,
        "clinical_note": "Cần xác định vị trí đau"
    },
    "đau bụng": {
        "en": "Abdominal Pain",
        "vi": "Đau bụng",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "vomiting blood": {
        "en": "Hematemesis / Vomiting Blood",
        "vi": "Nôn ra máu",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE,
        "clinical_note": "Xuất huyết tiêu hóa trên"
    },
    "nôn ra máu": {
        "en": "Hematemesis / Vomiting Blood",
        "vi": "Nôn ra máu",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "melena": {
        "en": "Melena",
        "vi": "Phân đen",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE,
        "clinical_note": "Xuất huyết tiêu hóa"
    },
    "bloody stool": {
        "en": "Bloody Stool / Hematochezia",
        "vi": "Đi cầu ra máu",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "diarrhea": {
        "en": "Diarrhea",
        "vi": "Tiêu chảy cấp",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW,
        "clinical_note": "Nguy cơ mất nước, rối loạn điện giải"
    },
    "tiêu chảy": {
        "en": "Diarrhea",
        "vi": "Tiêu chảy cấp",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "constipation": {
        "en": "Constipation",
        "vi": "Táo bón",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_4_BLUE
    },
    "Táo bón": {
        "en": "Constipation",
        "vi": "Táo bón",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_4_BLUE
    },
    "food poisoning": {
        "en": "Food Poisoning",
        "vi": "Ngộ độc thực phẩm",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "ngộ độc thực phẩm": {
        "en": "Food Poisoning",
        "vi": "Ngộ độc thực phẩm",
        "category": MedicalCategory.GASTROINTESTINAL,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },

    
    # === CHẤN THƯƠNG (Trauma) ===
    "trauma": {
        "en": "Trauma / Injury",
        "vi": "Chấn thương",
        "category": MedicalCategory.TRAUMA,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "chấn thương": {
        "en": "Trauma / Injury",
        "vi": "Chấn thương",
        "category": MedicalCategory.TRAUMA,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "fracture": {
        "en": "Bone Fracture",
        "vi": "Gãy xương",
        "category": MedicalCategory.TRAUMA,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "gãy xương": {
        "en": "Bone Fracture",
        "vi": "Gãy xương",
        "category": MedicalCategory.TRAUMA,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "bleeding": {
        "en": "Bleeding / Hemorrhage",
        "vi": "Chảy máu / Xuất huyết",
        "category": MedicalCategory.TRAUMA,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "chảy máu": {
        "en": "Bleeding / Hemorrhage",
        "vi": "Chảy máu / Xuất huyết",
        "category": MedicalCategory.TRAUMA,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    
    # === CHUYỂN HÓA (Metabolic) ===
    "hypoglycemia": {
        "en": "Hypoglycemia",
        "vi": "Hạ đường huyết",
        "category": MedicalCategory.METABOLIC,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE,
        "clinical_note": "Cho glucose ngay nếu có thể"
    },
    "hạ đường huyết": {
        "en": "Hypoglycemia",
        "vi": "Hạ đường huyết",
        "category": MedicalCategory.METABOLIC,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "diabetic ketoacidosis": {
        "en": "Diabetic Ketoacidosis (DKA)",
        "vi": "Nhiễm toan ceton do đái tháo đường",
        "category": MedicalCategory.METABOLIC,
        "triage_hint": TriageLevel.LEVEL_2_ORANGE
    },
    "high fever": {
        "en": "High Fever",
        "vi": "Sốt cao",
        "category": MedicalCategory.INFECTIOUS,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "sốt cao": {
        "en": "High Fever",
        "vi": "Sốt cao",
        "category": MedicalCategory.INFECTIOUS,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "sốt": {
        "en": "Fever",
        "vi": "Sốt",
        "category": MedicalCategory.INFECTIOUS,
        "triage_hint": TriageLevel.LEVEL_4_BLUE
    },
    "fever": {
        "en": "Fever",
        "vi": "Sốt",
        "category": MedicalCategory.INFECTIOUS,
        "triage_hint": TriageLevel.LEVEL_4_BLUE
    },
    # === BỔ SUNG: TIẾT NIỆU (Urology) ===
    "hematuria": {
        "en": "Hematuria",
        "vi": "Tiểu ra máu",
        "category": MedicalCategory.UROLOGY, # Cần thêm category này vào models
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "tiểu ra máu": {
        "en": "Hematuria",
        "vi": "Tiểu ra máu",
        "category": MedicalCategory.UROLOGY, # Cần thêm category này vào models
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    },
    "dysuria": {
        "en": "Dysuria / Painful Urination",
        "vi": "Tiểu buốt / Tiểu rắt",
        "category": MedicalCategory.UROLOGY,
        "triage_hint": TriageLevel.LEVEL_4_BLUE,
        "clinical_note": "Nghi ngờ nhiễm trùng đường tiết niệu (UTI)"
    },
    "tiểu buốt": {
        "en": "Dysuria / Painful Urination",
        "vi": "Tiểu buốt / Tiểu rắt",
        "category": MedicalCategory.UROLOGY,
        "triage_hint": TriageLevel.LEVEL_4_BLUE
    },
    "flank pain": {
        "en": "Flank Pain",
        "vi": "Đau hông lưng",
        "category": MedicalCategory.UROLOGY,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW,
        "clinical_note": "Nghi ngờ sỏi thận hoặc viêm đài bể thận"
    },
    "đau hông lưng": {
        "en": "Flank Pain",
        "vi": "Đau hông lưng",
        "category": MedicalCategory.UROLOGY,
        "triage_hint": TriageLevel.LEVEL_3_YELLOW
    }
}


# ==================== ALLERGY TERMINOLOGY ====================

ALLERGY_DICTIONARY: Dict[str, Dict] = {
    # Thuốc
    "aspirin": {
        "en": "Aspirin",
        "vi": "Aspirin",
        "type": "drug",
        "drug_class": "NSAIDs / Thuốc kháng viêm không steroid",
        "warning": "Tránh tất cả thuốc nhóm NSAID"
    },
    "penicillin": {
        "en": "Penicillin",
        "vi": "Penicillin",
        "type": "drug",
        "drug_class": "Kháng sinh nhóm Beta-lactam",
        "warning": "Thận trọng phản ứng chéo với Cephalosporin"
    },
    "cephalosporin": {
        "en": "Cephalosporin",
        "vi": "Cephalosporin",
        "type": "drug",
        "drug_class": "Kháng sinh nhóm Beta-lactam"
    },
    "sulfa": {
        "en": "Sulfa Drugs",
        "vi": "Thuốc nhóm Sulfonamide",
        "type": "drug",
        "drug_class": "Kháng sinh Sulfonamide"
    },
    "ibuprofen": {
        "en": "Ibuprofen",
        "vi": "Ibuprofen",
        "type": "drug",
        "drug_class": "NSAIDs"
    },
    "morphine": {
        "en": "Morphine",
        "vi": "Morphine",
        "type": "drug",
        "drug_class": "Opioid / Thuốc giảm đau gây nghiện"
    },
    "codeine": {
        "en": "Codeine",
        "vi": "Codeine",
        "type": "drug",
        "drug_class": "Opioid"
    },
    
    # Thuốc cản quang
    "contrast media": {
        "en": "Iodinated Contrast Media",
        "vi": "Thuốc cản quang chứa I-ốt",
        "type": "drug",
        "warning": "NGUY HIỂM: Báo ngay cho bác sĩ trước khi chụp CT-Scanner",
        "clinical_note": "Cần tiền mê hoặc đổi phương pháp chẩn đoán"
    },
    "thuốc cản quang": {
        "en": "Contrast Media/Dye",
        "vi": "Thuốc cản quang",
        "type": "drug",
        "warning": "Không chụp CT có thuốc"
    },
    "iodine": {
        "en": "Iodine",
        "vi": "Iốt / I-ốt",
        "type": "drug",
        "warning": "Thận trọng với thuốc cản quang chứa iốt"
    },
    
    # Thực phẩm
    "peanuts": {
        "en": "Peanuts",
        "vi": "Đậu phộng / Lạc",
        "type": "food",
        "warning": "Nguy cơ sốc phản vệ cao"
    },
    "đậu phộng": {
        "en": "Peanuts",
        "vi": "Đậu phộng / Lạc",
        "type": "food"
    },
    "shellfish": {
        "en": "Shellfish",
        "vi": "Hải sản có vỏ (Tôm, Cua, Sò)",
        "type": "food"
    },
    "hải sản": {
        "en": "Seafood/Shellfish",
        "vi": "Hải sản",
        "type": "food"
    },
    "eggs": {
        "en": "Eggs",
        "vi": "Trứng",
        "type": "food"
    },
    "milk": {
        "en": "Milk/Dairy",
        "vi": "Sữa / Sản phẩm từ sữa",
        "type": "food"
    },
    "gluten": {
        "en": "Gluten",
        "vi": "Gluten (từ lúa mì)",
        "type": "food"
    },
    "soy": {
        "en": "Soy",
        "vi": "Đậu nành",
        "type": "food"
    },
    "tree nuts": {
        "en": "Tree Nuts",
        "vi": "Các loại hạt (Hạnh nhân, Óc chó...)",
        "type": "food"
    },
    
    # Khác
    "latex": {
        "en": "Latex",
        "vi": "Nhựa latex (Mủ cao su)",
        "type": "other",
        "warning": "Dùng găng tay không latex, sonde không latex"
    },
    "bee sting": {
        "en": "Bee Sting / Insect Venom",
        "vi": "Nọc ong / Côn trùng đốt",
        "type": "other"
    },
    "nọc ong": {
        "en": "Bee Venom",
        "vi": "Nọc ong",
        "type": "other"
    }
}


# ==================== MEDICATION TERMINOLOGY ====================
# Nhóm thuốc nguy cơ cao (High-Alert Medications)

MEDICATION_DICTIONARY: Dict[str, Dict] = {
    # === THUỐC CHỐNG ĐÔNG (Anticoagulants) ===
    "warfarin": {
        "en": "Warfarin",
        "vi": "Warfarin",
        "class_en": "Anticoagulant",
        "class_vi": "Thuốc chống đông",
        "warning": "NGUY CƠ CHẢY MÁU CAO - Cần kiểm tra INR",
        "high_risk": True
    },
    "rivaroxaban": {
        "en": "Rivaroxaban (Xarelto)",
        "vi": "Rivaroxaban (Xarelto)",
        "class_en": "DOAC - Anticoagulant",
        "class_vi": "Thuốc chống đông đường uống thế hệ mới",
        "warning": "Nguy cơ xuất huyết - Không có thuốc đối kháng đặc hiệu phổ biến",
        "high_risk": True
    },
    "xarelto": {
        "en": "Xarelto (Rivaroxaban)",
        "vi": "Xarelto (Rivaroxaban)",
        "class_en": "DOAC",
        "class_vi": "Thuốc chống đông đường uống",
        "high_risk": True
    },
    "dabigatran": {
        "en": "Dabigatran (Pradaxa)",
        "vi": "Dabigatran (Pradaxa)",
        "class_en": "DOAC - Anticoagulant",
        "class_vi": "Thuốc chống đông",
        "high_risk": True
    },
    "apixaban": {
        "en": "Apixaban (Eliquis)",
        "vi": "Apixaban (Eliquis)",
        "class_en": "DOAC",
        "class_vi": "Thuốc chống đông",
        "high_risk": True
    },
    "heparin": {
        "en": "Heparin",
        "vi": "Heparin",
        "class_en": "Anticoagulant",
        "class_vi": "Thuốc chống đông",
        "high_risk": True
    },
    "enoxaparin": {
        "en": "Enoxaparin (Lovenox)",
        "vi": "Enoxaparin (Lovenox)",
        "class_en": "LMWH - Low Molecular Weight Heparin",
        "class_vi": "Heparin trọng lượng phân tử thấp",
        "high_risk": True
    },
    
    # === THUỐC KHÁNG KẾT TẬP TIỂU CẦU (Antiplatelets) ===
    "aspirin": {
        "en": "Aspirin",
        "vi": "Aspirin",
        "class_en": "Antiplatelet",
        "class_vi": "Thuốc kháng kết tập tiểu cầu",
        "warning": "Không ngưng đột ngột nếu đang đặt stent",
        "high_risk": True
    },
    "clopidogrel": {
        "en": "Clopidogrel (Plavix)",
        "vi": "Clopidogrel (Plavix)",
        "class_en": "Antiplatelet",
        "class_vi": "Thuốc kháng kết tập tiểu cầu",
        "warning": "Nguy cơ chảy máu khi phẫu thuật/chấn thương",
        "high_risk": True
    },
    "plavix": {
        "en": "Plavix (Clopidogrel)",
        "vi": "Plavix (Clopidogrel)",
        "class_en": "Antiplatelet",
        "class_vi": "Thuốc kháng kết tập tiểu cầu",
        "high_risk": True
    },
    "ticagrelor": {
        "en": "Ticagrelor (Brilinta)",
        "vi": "Ticagrelor (Brilinta)",
        "class_en": "Antiplatelet",
        "class_vi": "Thuốc kháng kết tập tiểu cầu",
        "high_risk": True
    },
    
    # === THUỐC CHẸN BETA (Beta Blockers) ===
    "bisoprolol": {
        "en": "Bisoprolol",
        "vi": "Bisoprolol",
        "class_en": "Beta Blocker",
        "class_vi": "Thuốc chẹn beta giao cảm",
        "warning": "Làm chậm nhịp tim, có thể che lấp dấu hiệu hạ đường huyết",
        "high_risk": True
    },
    "metoprolol": {
        "en": "Metoprolol",
        "vi": "Metoprolol",
        "class_en": "Beta Blocker",
        "class_vi": "Thuốc chẹn beta",
        "high_risk": True
    },
    "propranolol": {
        "en": "Propranolol",
        "vi": "Propranolol",
        "class_en": "Beta Blocker",
        "class_vi": "Thuốc chẹn beta",
        "high_risk": True
    },
    "atenolol": {
        "en": "Atenolol",
        "vi": "Atenolol",
        "class_en": "Beta Blocker",
        "class_vi": "Thuốc chẹn beta",
        "high_risk": True
    },
    "carvedilol": {
        "en": "Carvedilol",
        "vi": "Carvedilol",
        "class_en": "Beta Blocker",
        "class_vi": "Thuốc chẹn beta",
        "high_risk": True
    },
    
    # === THUỐC ỨC CHẾ MEN CHUYỂN (ACE Inhibitors) ===
    "enalapril": {
        "en": "Enalapril",
        "vi": "Enalapril",
        "class_en": "ACE Inhibitor",
        "class_vi": "Thuốc ức chế men chuyển",
        "warning": "Có thể gây ho khan, ảnh hưởng thận"
    },
    "lisinopril": {
        "en": "Lisinopril",
        "vi": "Lisinopril",
        "class_en": "ACE Inhibitor",
        "class_vi": "Thuốc ức chế men chuyển"
    },
    "perindopril": {
        "en": "Perindopril",
        "vi": "Perindopril",
        "class_en": "ACE Inhibitor",
        "class_vi": "Thuốc ức chế men chuyển"
    },
    "ramipril": {
        "en": "Ramipril",
        "vi": "Ramipril",
        "class_en": "ACE Inhibitor",
        "class_vi": "Thuốc ức chế men chuyển"
    },
    
    # === INSULIN & THUỐC HẠ ĐƯỜNG HUYẾT ===
    "insulin": {
        "en": "Insulin",
        "vi": "Insulin",
        "class_en": "Insulin",
        "class_vi": "Insulin",
        "warning": "NGUY CƠ HẠ ĐƯỜNG HUYẾT nếu bệnh nhân nhịn ăn",
        "high_risk": True
    },
    "metformin": {
        "en": "Metformin",
        "vi": "Metformin",
        "class_en": "Oral Hypoglycemic",
        "class_vi": "Thuốc hạ đường huyết đường uống",
        "warning": "Nguy cơ nhiễm toan lactic"
    },
    "gliclazide": {
        "en": "Gliclazide",
        "vi": "Gliclazide",
        "class_en": "Sulfonylurea",
        "class_vi": "Thuốc hạ đường huyết nhóm Sulfonylurea",
        "warning": "Nguy cơ hạ đường huyết",
        "high_risk": True
    },
    
    # === CORTICOID ===
    "prednisolone": {
        "en": "Prednisolone",
        "vi": "Prednisolone",
        "class_en": "Corticosteroid",
        "class_vi": "Corticoid / Thuốc kháng viêm steroid",
        "warning": "Nguy cơ suy thượng thận cấp nếu ngưng đột ngột",
        "high_risk": True
    },
    "methylprednisolone": {
        "en": "Methylprednisolone",
        "vi": "Methylprednisolone",
        "class_en": "Corticosteroid",
        "class_vi": "Corticoid",
        "high_risk": True
    },
    "dexamethasone": {
        "en": "Dexamethasone",
        "vi": "Dexamethasone",
        "class_en": "Corticosteroid",
        "class_vi": "Corticoid",
        "high_risk": True
    },
    "prednisone": {
        "en": "Prednisone",
        "vi": "Prednisone",
        "class_en": "Corticosteroid",
        "class_vi": "Corticoid",
        "high_risk": True
    },
    # === TIM MẠCH CẤP CỨU (Bổ sung quan trọng) ===
    "nitroglycerin": {
        "en": "Nitroglycerin",
        "vi": "Nitroglycerin",
        "class_en": "Nitrate / Vasodilator",
        "class_vi": "Thuốc giãn mạch gốc Nitrate",
        "warning": "Dùng cắt cơn đau thắt ngực. Có thể gây tụt huyết áp.",
        "high_risk": True
    },
    
    # === KHÁNG SINH PHỔ BIẾN (Bổ sung để hỏi tiền sử dị ứng) ===
    "amoxicillin": {
        "en": "Amoxicillin",
        "vi": "Amoxicillin",
        "class_en": "Penicillin Antibiotic",
        "class_vi": "Kháng sinh nhóm Penicillin",
        "warning": "Nguy cơ dị ứng cao"
    },
    "ciprofloxacin": {
        "en": "Ciprofloxacin",
        "vi": "Ciprofloxacin",
        "class_en": "Quinolone Antibiotic",
        "class_vi": "Kháng sinh nhóm Quinolone"
    },

    # === THUỐC TÂM THẦN / AN THẦN (Ảnh hưởng tri giác) ===
    "diazepam": {
        "en": "Diazepam (Valium)",
        "vi": "Diazepam (Seduxen)",
        "class_en": "Benzodiazepine",
        "class_vi": "Thuốc an thần",
        "warning": "Gây buồn ngủ, ức chế hô hấp",
        "high_risk": True
    },
    
    # === THUỐC KHÁC ===
    "amlodipine": {
        "en": "Amlodipine",
        "vi": "Amlodipine",
        "class_en": "Calcium Channel Blocker",
        "class_vi": "Thuốc chẹn kênh Calci"
    },
    "losartan": {
        "en": "Losartan",
        "vi": "Losartan",
        "class_en": "ARB",
        "class_vi": "Thuốc chẹn thụ thể Angiotensin"
    },
    "valsartan": {
        "en": "Valsartan",
        "vi": "Valsartan",
        "class_en": "ARB",
        "class_vi": "Thuốc chẹn thụ thể Angiotensin"
    },
    "atorvastatin": {
        "en": "Atorvastatin",
        "vi": "Atorvastatin",
        "class_en": "Statin",
        "class_vi": "Thuốc hạ mỡ máu nhóm Statin"
    },
    "rosuvastatin": {
        "en": "Rosuvastatin",
        "vi": "Rosuvastatin",
        "class_en": "Statin",
        "class_vi": "Thuốc hạ mỡ máu nhóm Statin"
    },
    "simvastatin": {
        "en": "Simvastatin",
        "vi": "Simvastatin",
        "class_en": "Statin",
        "class_vi": "Thuốc hạ mỡ máu"
    },
    "omeprazole": {
        "en": "Omeprazole",
        "vi": "Omeprazole",
        "class_en": "PPI",
        "class_vi": "Thuốc ức chế bơm proton"
    },
    "pantoprazole": {
        "en": "Pantoprazole",
        "vi": "Pantoprazole",
        "class_en": "PPI",
        "class_vi": "Thuốc ức chế bơm proton"
    },
    "levothyroxine": {
        "en": "Levothyroxine",
        "vi": "Levothyroxine",
        "class_en": "Thyroid Hormone",
        "class_vi": "Hormone tuyến giáp"
    },
    "albuterol": {
        "en": "Albuterol / Salbutamol",
        "vi": "Salbutamol",
        "class_en": "Bronchodilator",
        "class_vi": "Thuốc giãn phế quản"
    },
    "salbutamol": {
        "en": "Salbutamol",
        "vi": "Salbutamol",
        "class_en": "Bronchodilator",
        "class_vi": "Thuốc giãn phế quản / Thuốc xịt hen"
    }
}


# ==================== MEDICAL HISTORY TERMINOLOGY ====================

MEDICAL_HISTORY_DICTIONARY: Dict[str, Dict] = {
    "hypertension": {
        "en": "Hypertension",
        "vi": "Tăng huyết áp / Cao huyết áp",
        "significance": "Yếu tố nguy cơ đột quỵ và tim mạch"
    },
    "tăng huyết áp": {
        "en": "Hypertension",
        "vi": "Tăng huyết áp",
        "significance": "Bệnh nền phổ biến"
    },
    "diabetes": {
        "en": "Diabetes Mellitus",
        "vi": "Đái tháo đường / Tiểu đường",
        "significance": "Nguy cơ nhiễm trùng, vết thương khó lành"
    },
    "đái tháo đường": {
        "en": "Diabetes",
        "vi": "Đái tháo đường",
        "significance": "Cần theo dõi đường huyết"
    },
    "diabetes type 1": {
        "en": "Type 1 Diabetes",
        "vi": "Đái tháo đường típ 1",
        "significance": "Phụ thuộc insulin"
    },
    "diabetes type 2": {
        "en": "Type 2 Diabetes",
        "vi": "Đái tháo đường típ 2",
        "significance": "Thường dùng thuốc uống"
    },
    "myocardial infarction": {
        "en": "Myocardial Infarction / Heart Attack",
        "vi": "Nhồi máu cơ tim",
        "significance": "Tiền sử hoại tử cơ tim, chức năng tim có thể đã giảm"
    },
    "nhồi máu cơ tim": {
        "en": "Myocardial Infarction",
        "vi": "Nhồi máu cơ tim",
        "significance": "Nguy cơ tái phát"
    },
    "coronary stent": {
        "en": "Coronary Stent",
        "vi": "Đặt Stent mạch vành",
        "significance": "BẮT BUỘC dùng thuốc kháng kết tập tiểu cầu - KHÔNG NGƯNG THUỐC"
    },
    "đặt stent": {
        "en": "Coronary Stent",
        "vi": "Đặt Stent mạch vành",
        "significance": "Đang dùng thuốc chống đông/kháng tiểu cầu"
    },
    "heart failure": {
        "en": "Heart Failure",
        "vi": "Suy tim",
        "significance": "Thận trọng khi truyền dịch (nguy cơ phù phổi)"
    },
    "suy tim": {
        "en": "Heart Failure",
        "vi": "Suy tim",
        "significance": "Hạn chế truyền dịch"
    },
    "atrial fibrillation": {
        "en": "Atrial Fibrillation",
        "vi": "Rung nhĩ",
        "significance": "Nguy cơ đột quỵ tắc mạch, thường dùng thuốc chống đông"
    },
    "rung nhĩ": {
        "en": "Atrial Fibrillation",
        "vi": "Rung nhĩ",
        "significance": "Đang dùng thuốc chống đông"
    },
    "asthma": {
        "en": "Asthma",
        "vi": "Hen phế quản / Suyễn",
        "significance": "Nguy cơ co thắt phế quản, suy hô hấp"
    },
    "hen suyễn": {
        "en": "Asthma",
        "vi": "Hen phế quản / Suyễn",
        "significance": "Tránh thuốc chẹn beta"
    },
    "copd": {
        "en": "COPD",
        "vi": "Bệnh phổi tắc nghẽn mạn tính",
        "significance": "Nguy cơ suy hô hấp"
    },
    "chronic kidney disease": {
        "en": "Chronic Kidney Disease",
        "vi": "Bệnh thận mạn",
        "significance": "Thận trọng thuốc cản quang và thuốc thải qua thận"
    },
    "bệnh thận mạn": {
        "en": "Chronic Kidney Disease",
        "vi": "Bệnh thận mạn",
        "significance": "Chỉnh liều thuốc theo chức năng thận"
    },
    "epilepsy": {
        "en": "Epilepsy",
        "vi": "Động kinh",
        "significance": "Nguy cơ lên cơn co giật"
    },
    "động kinh": {
        "en": "Epilepsy",
        "vi": "Động kinh",
        "significance": "Đang dùng thuốc chống động kinh"
    },
    "stroke": {
        "en": "Stroke / CVA",
        "vi": "Đột quỵ / Tai biến mạch máu não",
        "significance": "Tiền sử tai biến, có thể có di chứng yếu liệt"
    },
    "pacemaker": {
        "en": "Pacemaker",
        "vi": "Máy tạo nhịp tim",
        "significance": "CHỐNG CHỈ ĐỊNH chụp MRI"
    },
    "máy tạo nhịp": {
        "en": "Pacemaker",
        "vi": "Máy tạo nhịp tim",
        "significance": "Không chụp cộng hưởng từ"
    },
    "artificial heart valve": {
        "en": "Artificial Heart Valve",
        "vi": "Van tim nhân tạo",
        "significance": "Dùng thuốc chống đông suốt đời, nguy cơ viêm nội tâm mạc"
    },
    "van tim nhân tạo": {
        "en": "Prosthetic Heart Valve",
        "vi": "Van tim nhân tạo",
        "significance": "Đang dùng Warfarin"
    },
    "cancer": {
        "en": "Cancer / Malignancy",
        "vi": "Ung thư",
        "significance": "Có thể đang hóa trị, suy giảm miễn dịch"
    },
    "ung thư": {
        "en": "Cancer",
        "vi": "Ung thư",
        "significance": "Cần hỏi giai đoạn và điều trị"
    },
    "hiv": {
        "en": "HIV/AIDS",
        "vi": "HIV/AIDS",
        "significance": "Suy giảm miễn dịch, tương tác thuốc"
    },
    "pregnancy": {
        "en": "Pregnancy",
        "vi": "Mang thai / Thai kỳ",
        "significance": "Tránh nhiều loại thuốc, X-quang"
    },
    "mang thai": {
        "en": "Pregnancy",
        "vi": "Mang thai",
        "significance": "Chống chỉ định nhiều thuốc"
    },
    # === HÔ HẤP ===
    "tuberculosis": {
        "en": "Tuberculosis (TB)",
        "vi": "Lao phổi",
        "significance": "Nguy cơ lây nhiễm - Cần cách ly hô hấp"
    },
    "lao phổi": {
        "en": "Tuberculosis",
        "vi": "Lao phổi",
        "significance": "Cần cách ly hô hấp"
    },
    # === TIM MẠCH & MÁU ===
    "deep vein thrombosis": {
        "en": "Deep Vein Thrombosis (DVT)",
        "vi": "Huyết khối tĩnh mạch sâu",
        "significance": "Nguy cơ thuyên tắc phổi"
    },
    "huyết khối tĩnh mạch sâu": {
        "en": "Deep Vein Thrombosis",
        "vi": "Huyết khối tĩnh mạch sâu",
        "significance": "Nguy cơ thuyên tắc phổi"
    },
    "anemia": {
        "en": "Anemia",
        "vi": "Thiếu máu",
        "significance": "Lưu ý khi phẫu thuật hoặc chảy máu"
    },
    "thiếu máu": {
        "en": "Anemia",
        "vi": "Thiếu máu",
        "significance": "Có thể cần truyền máu"
    },
    "hemophilia": {
        "en": "Hemophilia",
        "vi": "Bệnh máu khó đông",
        "significance": "NGUY HIỂM: Rối loạn đông máu di truyền"
    },
    "bệnh máu khó đông": {
        "en": "Hemophilia",
        "vi": "Bệnh máu khó đông",
        "significance": "Nguy cơ chảy máu cao"
    },
    "dyslipidemia": {
        "en": "Dyslipidemia / High Cholesterol",
        "vi": "Rối loạn mỡ máu",
        "significance": "Yếu tố nguy cơ tim mạch"
    },
    "rối loạn mỡ máu": {
        "en": "Dyslipidemia",
        "vi": "Rối loạn mỡ máu",
        "significance": "Cần kiểm soát lipid máu"
    },
    "gout": {
        "en": "Gout",
        "vi": "Bệnh Gút (Thống phong)",
        "significance": "Thận trọng khi dùng thuốc lợi tiểu, aspirin"
    },
    "bệnh gút": {
        "en": "Gout",
        "vi": "Bệnh Gút",
        "significance": "Hạn chế thực phẩm giàu purin"
    },
    "gerd": {
        "en": "GERD (Acid Reflux)",
        "vi": "Trào ngược dạ dày thực quản",
        "significance": "Có thể giả đau ngực (heartburn)"
    },
    "trào ngược dạ dày thực quản": {
        "en": "GERD",
        "vi": "Trào ngược dạ dày thực quản",
        "significance": "Nguy cơ viêm loét thực quản"
    },
    "hepatitis b": {
        "en": "Hepatitis B",
        "vi": "Viêm gan siêu vi B",
        "significance": "Nguy cơ lây nhiễm đường máu"
    },
    "viêm gan b": {
        "en": "Hepatitis B",
        "vi": "Viêm gan siêu vi B",
        "significance": "Cần theo dõi chức năng gan"
    }
}


# ==================== SURGICAL HISTORY TERMINOLOGY ====================

SURGICAL_HISTORY_DICTIONARY: Dict[str, Dict] = {
    "appendectomy": {
        "en": "Appendectomy",
        "vi": "Phẫu thuật cắt ruột thừa"
    },
    "cắt ruột thừa": {
        "en": "Appendectomy",
        "vi": "Phẫu thuật cắt ruột thừa"
    },
    "cesarean section": {
        "en": "Cesarean Section / C-Section",
        "vi": "Phẫu thuật lấy thai / Mổ đẻ"
    },
    "mổ đẻ": {
        "en": "Cesarean Section",
        "vi": "Mổ lấy thai"
    },
    "cholecystectomy": {
        "en": "Cholecystectomy",
        "vi": "Phẫu thuật cắt túi mật"
    },
    "cắt túi mật": {
        "en": "Cholecystectomy",
        "vi": "Cắt túi mật"
    },
    "hysterectomy": {
        "en": "Hysterectomy",
        "vi": "Phẫu thuật cắt tử cung"
    },
    "cabg": {
        "en": "CABG (Coronary Artery Bypass Graft)",
        "vi": "Phẫu thuật bắc cầu mạch vành"
    },
    "bắc cầu mạch vành": {
        "en": "CABG",
        "vi": "Phẫu thuật bắc cầu động mạch vành"
    },
    "organ transplant": {
        "en": "Organ Transplant",
        "vi": "Ghép tạng"
    },
    "ghép tạng": {
        "en": "Organ Transplant",
        "vi": "Ghép tạng"
    },
    "knee replacement": {
        "en": "Knee Replacement",
        "vi": "Thay khớp gối"
    },
    "hip replacement": {
        "en": "Hip Replacement",
        "vi": "Thay khớp háng"
    },
    "hernia repair": {
        "en": "Hernia Repair",
        "vi": "Phẫu thuật sửa thoát vị"
    }
}


# ==================== NATIONALITY & COUNTRY DATA ====================

COUNTRY_DATA: Dict[str, Dict] = {
    "germany": {"flag": "🇩🇪", "code": "DE", "name_vi": "Đức"},
    "de": {"flag": "🇩🇪", "code": "DE", "name_vi": "Đức"},
    "united states": {"flag": "🇺🇸", "code": "US", "name_vi": "Mỹ"},
    "us": {"flag": "🇺🇸", "code": "US", "name_vi": "Mỹ"},
    "usa": {"flag": "🇺🇸", "code": "US", "name_vi": "Mỹ"},
    "united kingdom": {"flag": "🇬🇧", "code": "GB", "name_vi": "Anh Quốc"},
    "uk": {"flag": "🇬🇧", "code": "GB", "name_vi": "Anh Quốc"},
    "gb": {"flag": "🇬🇧", "code": "GB", "name_vi": "Anh Quốc"},
    "france": {"flag": "🇫🇷", "code": "FR", "name_vi": "Pháp"},
    "fr": {"flag": "🇫🇷", "code": "FR", "name_vi": "Pháp"},
    "japan": {"flag": "🇯🇵", "code": "JP", "name_vi": "Nhật Bản"},
    "jp": {"flag": "🇯🇵", "code": "JP", "name_vi": "Nhật Bản"},
    "korea": {"flag": "🇰🇷", "code": "KR", "name_vi": "Hàn Quốc"},
    "kr": {"flag": "🇰🇷", "code": "KR", "name_vi": "Hàn Quốc"},
    "south korea": {"flag": "🇰🇷", "code": "KR", "name_vi": "Hàn Quốc"},
    "china": {"flag": "🇨🇳", "code": "CN", "name_vi": "Trung Quốc"},
    "cn": {"flag": "🇨🇳", "code": "CN", "name_vi": "Trung Quốc"},
    "australia": {"flag": "🇦🇺", "code": "AU", "name_vi": "Úc"},
    "au": {"flag": "🇦🇺", "code": "AU", "name_vi": "Úc"},
    "canada": {"flag": "🇨🇦", "code": "CA", "name_vi": "Canada"},
    "ca": {"flag": "🇨🇦", "code": "CA", "name_vi": "Canada"},
    "singapore": {"flag": "🇸🇬", "code": "SG", "name_vi": "Singapore"},
    "sg": {"flag": "🇸🇬", "code": "SG", "name_vi": "Singapore"},
    "thailand": {"flag": "🇹🇭", "code": "TH", "name_vi": "Thái Lan"},
    "th": {"flag": "🇹🇭", "code": "TH", "name_vi": "Thái Lan"},
    "malaysia": {"flag": "🇲🇾", "code": "MY", "name_vi": "Malaysia"},
    "my": {"flag": "🇲🇾", "code": "MY", "name_vi": "Malaysia"},
    "indonesia": {"flag": "🇮🇩", "code": "ID", "name_vi": "Indonesia"},
    "id": {"flag": "🇮🇩", "code": "ID", "name_vi": "Indonesia"},
    "russia": {"flag": "🇷🇺", "code": "RU", "name_vi": "Nga"},
    "ru": {"flag": "🇷🇺", "code": "RU", "name_vi": "Nga"},
    "india": {"flag": "🇮🇳", "code": "IN", "name_vi": "Ấn Độ"},
    "in": {"flag": "🇮🇳", "code": "IN", "name_vi": "Ấn Độ"},
    "italy": {"flag": "🇮🇹", "code": "IT", "name_vi": "Ý"},
    "it": {"flag": "🇮🇹", "code": "IT", "name_vi": "Ý"},
    "spain": {"flag": "🇪🇸", "code": "ES", "name_vi": "Tây Ban Nha"},
    "es": {"flag": "🇪🇸", "code": "ES", "name_vi": "Tây Ban Nha"},
    "netherlands": {"flag": "🇳🇱", "code": "NL", "name_vi": "Hà Lan"},
    "nl": {"flag": "🇳🇱", "code": "NL", "name_vi": "Hà Lan"},
    "vietnam": {"flag": "🇻🇳", "code": "VN", "name_vi": "Việt Nam"},
    "vn": {"flag": "🇻🇳", "code": "VN", "name_vi": "Việt Nam"},
}


# ==================== GENDER TERMINOLOGY ====================

GENDER_DICTIONARY = {
    "Male": {"en": "Male", "vi": "Nam"},
    "Female": {"en": "Female", "vi": "Nữ"},
    "Other": {"en": "Other", "vi": "Khác"}
}


# ==================== HELPER FUNCTIONS ====================

def get_country_info(nationality: str) -> Dict:
    """Lấy thông tin quốc gia từ tên hoặc mã"""
    # Chuẩn hóa input
    normalized = nationality.lower().strip()
    
    # Xử lý format "Germany (DE)"
    if "(" in normalized:
        parts = normalized.split("(")
        country_name = parts[0].strip()
        country_code = parts[1].replace(")", "").strip()
        
        if country_code in COUNTRY_DATA:
            return COUNTRY_DATA[country_code]
        if country_name in COUNTRY_DATA:
            return COUNTRY_DATA[country_name]
    
    # Tìm trực tiếp
    if normalized in COUNTRY_DATA:
        return COUNTRY_DATA[normalized]
    
    # Tìm theo một phần
    for key, data in COUNTRY_DATA.items():
        if key in normalized or normalized in key:
            return data
    
    # Default
    return {"flag": "🏳️", "code": "??", "name_vi": nationality}


def normalize_term(term: str) -> str:
    """Chuẩn hóa thuật ngữ để tìm kiếm"""
    return term.lower().strip()
