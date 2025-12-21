"""
Medical Translation Card - Data Models
Data classes for input/output
"""

from typing import Optional, List
from enum import Enum
from datetime import datetime
from dataclasses import dataclass, field


# ==================== ENUMS ====================

class Gender(str, Enum):
    """Giới tính"""
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


class TriageLevel(str, Enum):
    """Cấp độ phân loại cấp cứu theo Bộ Y tế Việt Nam"""
    LEVEL_1_RED = "1"      # Cấp cứu tối khẩn / Nguy kịch - Immediate
    LEVEL_2_ORANGE = "2"   # Cấp cứu / Nặng - < 10 phút
    LEVEL_3_YELLOW = "3"   # Khẩn cấp / Trung bình - < 30 phút
    LEVEL_4_BLUE = "4"     # Ít khẩn cấp / Nhẹ - < 60 phút
    LEVEL_5_GREEN = "5"    # Không khẩn cấp - < 120 phút


class MedicalCategory(str, Enum):
    """Phân loại nhóm bệnh lý"""
    CARDIOVASCULAR = "cardiovascular"       # Tim mạch
    NEUROLOGICAL = "neurological"           # Thần kinh
    RESPIRATORY = "respiratory"             # Hô hấp
    GASTROINTESTINAL = "gastrointestinal"   # Tiêu hóa
    TRAUMA = "trauma"                       # Chấn thương
    ALLERGIC = "allergic"                   # Dị ứng
    METABOLIC = "metabolic"                 # Chuyển hóa
    INFECTIOUS = "infectious"               # Nhiễm trùng
    UROLOGY = "urology"                     # Tiết niệu
    OTHER = "other"                         # Khác


# ==================== INPUT MODELS ====================

@dataclass
class Identity:
    """Thông tin định danh người bệnh"""
    userId: str
    full_name: str
    nationality: str
    age: int
    gender: str
    date_of_birth: Optional[str] = None
    passport_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


@dataclass
class MedicalCritical:
    """Thông tin y khoa quan trọng"""
    current_symptoms: str
    blood_type: Optional[str] = None
    allergies: List[str] = field(default_factory=list)
    Medications: List[str] = field(default_factory=list)
    Medical_history: List[str] = field(default_factory=list)
    surgical_history: Optional[List[str]] = field(default_factory=list)


@dataclass
class MedicalCardInput:
    """Input model cho Medical Translation Card"""
    identity: Identity
    medical_critical: MedicalCritical


# ==================== OUTPUT MODELS ====================

@dataclass
class BilingualTerm:
    """Thuật ngữ song ngữ Anh-Việt"""
    en: str
    vi: str
    clinical_note: Optional[str] = None


@dataclass
class AllergyInfo:
    """Thông tin dị ứng chi tiết"""
    allergen: BilingualTerm
    severity: Optional[str] = None
    reaction_type: Optional[BilingualTerm] = None


@dataclass
class MedicationInfo:
    """Thông tin thuốc đang sử dụng"""
    medication_name: BilingualTerm
    drug_class: Optional[BilingualTerm] = None
    clinical_warning: Optional[str] = None


@dataclass
class MedicalHistoryInfo:
    """Thông tin tiền sử bệnh"""
    condition: BilingualTerm
    clinical_significance: Optional[str] = None


@dataclass
class TriageInfo:
    """Thông tin phân loại cấp cứu"""
    level: TriageLevel
    color_code: str
    level_name: BilingualTerm
    target_response_time: str
    description: str


@dataclass
class ChiefComplaint:
    """Lý do vào viện - Chief Complaint"""
    original_input: str
    standardized_terms: List[BilingualTerm]  # Hỗ trợ nhiều triệu chứng
    medical_categories: List[MedicalCategory]  # Danh mục cho từng triệu chứng
    icd_codes: Optional[List[str]] = None
    clinical_descriptions: Optional[List[str]] = None


@dataclass
class PatientIdentityCard:
    """Thông tin định danh trên thẻ"""
    full_name: str
    age: int
    gender: BilingualTerm
    nationality: str
    patient_id: str
    nationality_flag: Optional[str] = None
    blood_type: Optional[str] = None
    date_of_birth: Optional[str] = None


@dataclass
class EmergencyCardOutput:
    """Output model cho Medical Translation Card - Thẻ Cấp cứu Y tế"""
    
    # Metadata
    card_id: str
    generated_at: str
    triage: TriageInfo
    patient_identity: PatientIdentityCard
    chief_complaint: ChiefComplaint
    allergies: List[AllergyInfo]
    has_critical_allergy: bool
    allergy_summary: BilingualTerm
    current_medications: List[MedicationInfo]
    high_risk_medications: List[str]
    medication_summary: BilingualTerm
    medical_history: List[MedicalHistoryInfo]
    history_summary: BilingualTerm
    is_emergency: bool
    card_version: str = "1.0"
    surgical_history: Optional[List[BilingualTerm]] = None
    emergency_contact: Optional[dict] = None
    clinical_notes: List[str] = field(default_factory=list)
    display_language: str = "vi"


@dataclass
class CompactCardOutput:
    """
    Output model tối ưu cho Medical Translation Card
    Chỉ chứa thông tin cần thiết nhất để hiển thị trên card
    """
    # Thông tin bệnh nhân (cơ bản)
    patient: dict  # name, age, gender, nationality, blood_type, emergency_contact
    
    # Phân loại cấp cứu
    triage: dict  # level, color, name_en, name_vi, response_time
    
    # Lý do vào viện
    chief_complaint: dict  # original, en, vi
    
    # Dị ứng (danh sách đơn giản)
    allergies: List[str]  # Chỉ tên dị ứng
    
    # Thuốc đang dùng (danh sách đơn giản)
    medications: List[str]  # Chỉ tên thuốc
    
    # Tiền sử bệnh (danh sách đơn giản)
    medical_history: List[str]  # Chỉ tên bệnh
    
    # Tiền sử phẫu thuật (danh sách đơn giản)
    surgical_history: List[str]  # Chỉ tên phẫu thuật


@dataclass
class ErrorResponse:
    """Error response model"""
    error: str
    detail: str
    code: str
