"""
Medical Translation Card - Services
Service xử lý và chuẩn hóa thuật ngữ y khoa
"""

from typing import Dict, List, Optional
from datetime import datetime
import uuid

from models import (
    MedicalCardInput, EmergencyCardOutput, CompactCardOutput, BilingualTerm, 
    AllergyInfo, MedicationInfo, MedicalHistoryInfo, TriageInfo, ChiefComplaint,
    PatientIdentityCard, TriageLevel, MedicalCategory
)
from medical_terminology import (
    SYMPTOM_DICTIONARY, ALLERGY_DICTIONARY, MEDICATION_DICTIONARY,
    MEDICAL_HISTORY_DICTIONARY, SURGICAL_HISTORY_DICTIONARY,
    TRIAGE_LEVELS, GENDER_DICTIONARY, get_country_info, normalize_term
)
from ai_client import ai_client


class MedicalTerminologyService:
    """Service xử lý và chuẩn hóa thuật ngữ y khoa"""
    
    def __init__(self):
        # Sử dụng singleton ai_client thay vì khởi tạo mới
        self._ai = ai_client
    
    # ==================== SYMPTOM PROCESSING ====================
    
    def standardize_symptoms(self, symptoms_text: str) -> List[Dict]:
        """
        Tách và chuẩn hóa nhiều triệu chứng từ chuỗi đầu vào
        Hỗ trợ các dấu phân cách: dấu phẩy, dấu chấm phẩy, 'và', 'and'
        Cũng hỗ trợ trích xuất nhiều triệu chứng từ câu tự nhiên
        """
        import re
        
        # Bước 1: Tách bằng dấu phân cách chuẩn
        separators = r'(?i)[,;.\-]|\s+và\s+|\s+and\s+|\s+với\s+|\s+or\s+|\s+hoặc\s+|\s+with\s+'
        symptom_list = re.split(separators, symptoms_text)
        symptom_list = [s.strip().capitalize() for s in symptom_list if s.strip()]
        
        # Bước 2: Với mỗi phần, thử trích xuất nhiều triệu chứng từ dictionary
        results = []
        for symptom_part in symptom_list:
            extracted = self._extract_symptoms_from_text(symptom_part)
            if extracted:
                results.extend(extracted)
            else:
                # Không tìm thấy triệu chứng nào, xử lý như bình thường
                result = self.standardize_symptom(symptom_part)
                result["original"] = symptom_part
                results.append(result)
        
        return results
    
    def _extract_symptoms_from_text(self, text: str) -> List[Dict]:
        """
        Trích xuất nhiều triệu chứng từ văn bản tự nhiên
        bằng cách tìm tất cả các pattern trong dictionary
        """
        normalized_text = normalize_term(text)
        found_symptoms = []
        
        # Sắp xếp các key theo độ dài giảm dần để match pattern dài trước
        sorted_keys = sorted(SYMPTOM_DICTIONARY.keys(), key=len, reverse=True)
        
        # Tìm tất cả các triệu chứng trong text
        remaining_text = normalized_text
        for key in sorted_keys:
            if key in remaining_text:
                data = SYMPTOM_DICTIONARY[key]
                result = self._build_symptom_result(key, data, source="database")
                result["original"] = key
                found_symptoms.append(result)
                # Đánh dấu đã tìm thấy (không xóa để có thể match overlapping patterns)
                remaining_text = remaining_text.replace(key, " ", 1)
        
        # Nếu tìm thấy ít nhất 1 triệu chứng, trả về danh sách
        # Nếu tìm được nhiều hơn 1, đó là thành công trong việc tách
        if len(found_symptoms) >= 2:
            return found_symptoms
        
        return None
    
    def standardize_symptom(self, symptom: str) -> Dict:
        """
        Chuẩn hóa triệu chứng thành thuật ngữ y khoa chuyên ngành
        Tự động gọi AI nếu không tìm thấy trong database
        """
        normalized = normalize_term(symptom)
        
        # Tìm trong dictionary
        result = self._find_in_dictionary(normalized, SYMPTOM_DICTIONARY)
        if result:
            return self._build_symptom_result(symptom, result, source="database")
        
        # Tìm theo partial match
        result = self._find_partial_match(normalized, SYMPTOM_DICTIONARY)
        if result:
            return self._build_symptom_result(symptom, result, source="database")
        
        # Không tìm thấy → gọi AI
        if self._ai.is_available:
            print(f"🤖 Triệu chứng '{symptom}' không có trong database, đang gọi AI...")
            ai_result = self._ai.standardize_symptom(symptom)
            if ai_result:
                print(f"✅ AI đã chuẩn hóa: {ai_result.get('vi')} / {ai_result.get('en')}")
                return ai_result
            print(f"❌ AI không phản hồi, dùng phân tích cơ bản")
        
        # Fallback: Phân tích keyword
        return self._analyze_unknown_symptom(symptom, normalized)
    
    def _find_in_dictionary(self, normalized: str, dictionary: Dict) -> Optional[Dict]:
        """Tìm chính xác trong dictionary"""
        return dictionary.get(normalized)
    
    def _find_partial_match(self, normalized: str, dictionary: Dict) -> Optional[Dict]:
        """Tìm theo partial match"""
        for key, data in dictionary.items():
            if key in normalized or normalized in key:
                return data
        return None
    
    def _build_symptom_result(self, original: str, data: Dict, source: str) -> Dict:
        """Xây dựng kết quả triệu chứng từ dictionary data"""
        return {
            "original": original,
            "en": data.get("en", original.title()),
            "vi": data.get("vi", original),
            "category": data.get("category", MedicalCategory.OTHER),
            "triage_hint": data.get("triage_hint", TriageLevel.LEVEL_3_YELLOW),
            "clinical_note": data.get("clinical_note"),
            "found_in_db": True,
            "source": source
        }
    
    def _analyze_unknown_symptom(self, original: str, normalized: str) -> Dict:
        """Phân tích triệu chứng không có trong database"""
        triage_level = self._analyze_symptom_severity(normalized)
        category = self._categorize_symptom(normalized)
        
        return {
            "original": original,
            "en": original if self._is_english(original) else None,
            "vi": original if not self._is_english(original) else None,
            "category": category,
            "triage_hint": triage_level,
            "clinical_note": None,
            "found_in_db": False,
            "source": "keyword_analysis"
        }
    
    def _analyze_symptom_severity(self, symptom: str) -> TriageLevel:
        """Phân tích mức độ nghiêm trọng của triệu chứng"""
        severity_keywords = {
            TriageLevel.LEVEL_1_RED: [
                "ngừng tim", "ngừng thở", "hôn mê", "sốc phản vệ", "sốc",
                "cardiac arrest", "respiratory arrest", "coma", "anaphylaxis",
                "đột quỵ", "stroke", "seizure", "co giật", "nguy kịch",
                "đau đầu sét đánh", "thunderclap"
            ],
            TriageLevel.LEVEL_2_ORANGE: [
                "đau ngực", "chest pain", "khó thở", "dyspnea", "shortness of breath",
                "nôn ra máu", "hematemesis", "xuất huyết", "bleeding", "hemorrhage",
                "nhồi máu", "infarction", "gãy xương hở", "open fracture",
                "sốt cao", "high fever", "hạ đường huyết", "hypoglycemia",
                "phù mạch", "angioedema"
            ],
            TriageLevel.LEVEL_3_YELLOW: [
                "đau bụng", "abdominal pain", "sốt", "fever", "gãy xương",
                "fracture", "chóng mặt", "vertigo", "đau đầu", "headache",
                "mề đay", "urticaria", "nôn", "vomiting", "tiêu chảy", "diarrhea"
            ]
        }
        
        for level, keywords in severity_keywords.items():
            if any(kw in symptom for kw in keywords):
                return level
        
        return TriageLevel.LEVEL_3_YELLOW
    
    def _categorize_symptom(self, symptom: str) -> MedicalCategory:
        """Phân loại nhóm bệnh lý từ triệu chứng"""
        category_keywords = {
            MedicalCategory.ALLERGIC: ["dị ứng", "allergy", "sốc phản vệ", "anaphylaxis", "mề đay", "phát ban"],
            MedicalCategory.CARDIOVASCULAR: ["tim", "ngực", "heart", "chest", "cardiac", "huyết áp", "nhịp"],
            MedicalCategory.NEUROLOGICAL: ["đầu", "head", "thần kinh", "neuro", "co giật", "seizure", "đột quỵ", "stroke", "hôn mê"],
            MedicalCategory.RESPIRATORY: ["thở", "breath", "phổi", "lung", "ho", "cough", "khò khè", "wheez"],
            MedicalCategory.GASTROINTESTINAL: ["bụng", "abdomen", "nôn", "vomit", "tiêu", "tiêu hóa", "đi cầu", "stool"],
            MedicalCategory.TRAUMA: ["chấn thương", "trauma", "gãy", "fracture", "tai nạn", "accident", "vết thương", "wound"],
            MedicalCategory.METABOLIC: ["đường", "glucose", "sugar", "tiểu đường", "diabetes", "hạ đường"]
        }
        
        for category, keywords in category_keywords.items():
            if any(kw in symptom for kw in keywords):
                return category
        
        return MedicalCategory.OTHER
    
    def _is_english(self, text: str) -> bool:
        """Kiểm tra text có phải tiếng Anh không"""
        vietnamese_chars = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
        return not any(c in text.lower() for c in vietnamese_chars)
    
    # ==================== ALLERGY PROCESSING ====================
    
    def standardize_allergy(self, allergy: str) -> Dict:
        """Chuẩn hóa thông tin dị ứng"""
        normalized = normalize_term(allergy)
        
        data = self._find_in_dictionary(normalized, ALLERGY_DICTIONARY)
        if not data:
            data = self._find_partial_match(normalized, ALLERGY_DICTIONARY)
        
        if data:
            return {
                "original": allergy,
                "en": data.get("en", allergy),
                "vi": data.get("vi", allergy),
                "type": data.get("type", "unknown"),
                "drug_class": data.get("drug_class"),
                "warning": data.get("warning"),
                "found_in_db": True
            }
        
        return {
            "original": allergy,
            "en": allergy if self._is_english(allergy) else allergy,
            "vi": allergy if not self._is_english(allergy) else allergy,
            "type": "unknown",
            "drug_class": None,
            "warning": None,
            "found_in_db": False
        }
    
    def check_critical_allergy(self, allergies: List[str]) -> bool:
        """Kiểm tra xem có dị ứng nghiêm trọng không"""
        critical_allergies = [
            "anaphylaxis", "sốc phản vệ", "penicillin", "latex",
            "contrast", "thuốc cản quang", "peanut", "đậu phộng",
            "bee", "ong", "shellfish", "hải sản"
        ]
        
        for allergy in allergies:
            normalized = normalize_term(allergy)
            if any(critical in normalized for critical in critical_allergies):
                return True
        return False
    
    # ==================== MEDICATION PROCESSING ====================
    
    def standardize_medication(self, medication: str) -> Dict:
        """Chuẩn hóa thông tin thuốc"""
        normalized = normalize_term(medication)
        
        data = self._find_in_dictionary(normalized, MEDICATION_DICTIONARY)
        if not data:
            data = self._find_partial_match(normalized, MEDICATION_DICTIONARY)
        
        if data:
            return {
                "original": medication,
                "en": data.get("en", medication),
                "vi": data.get("vi", medication),
                "class_en": data.get("class_en"),
                "class_vi": data.get("class_vi"),
                "warning": data.get("warning"),
                "high_risk": data.get("high_risk", False),
                "found_in_db": True
            }
        
        return {
            "original": medication,
            "en": medication,
            "vi": medication,
            "class_en": None,
            "class_vi": None,
            "warning": None,
            "high_risk": False,
            "found_in_db": False
        }
    
    def get_high_risk_medications(self, medications: List[str]) -> List[str]:
        """Lấy danh sách thuốc nguy cơ cao"""
        return [
            self.standardize_medication(med).get("vi", med)
            for med in medications
            if self.standardize_medication(med).get("high_risk")
        ]
    
    # ==================== MEDICAL HISTORY PROCESSING ====================
    
    def standardize_medical_history(self, condition: str) -> Dict:
        """Chuẩn hóa tiền sử bệnh"""
        normalized = normalize_term(condition)
        
        data = self._find_in_dictionary(normalized, MEDICAL_HISTORY_DICTIONARY)
        if not data:
            data = self._find_partial_match(normalized, MEDICAL_HISTORY_DICTIONARY)
        
        if data:
            return {
                "original": condition,
                "en": data.get("en", condition),
                "vi": data.get("vi", condition),
                "significance": data.get("significance"),
                "found_in_db": True
            }
        
        return {
            "original": condition,
            "en": condition if self._is_english(condition) else condition,
            "vi": condition if not self._is_english(condition) else condition,
            "significance": None,
            "found_in_db": False
        }
    
    def standardize_surgical_history(self, surgery: str) -> Dict:
        """Chuẩn hóa tiền sử phẫu thuật"""
        normalized = normalize_term(surgery)
        
        data = self._find_in_dictionary(normalized, SURGICAL_HISTORY_DICTIONARY)
        if not data:
            data = self._find_partial_match(normalized, SURGICAL_HISTORY_DICTIONARY)
        
        if data:
            return {
                "original": surgery,
                "en": data.get("en", surgery),
                "vi": data.get("vi", surgery),
                "found_in_db": True
            }
        
        return {
            "original": surgery,
            "en": surgery,
            "vi": surgery,
            "found_in_db": False
        }
    
    # ==================== TRIAGE DETERMINATION ====================
    
    def determine_triage_level(
        self,
        symptom_data: Dict,
        allergies: List[str],
        medical_history: List[str]
    ) -> TriageLevel:
        """Xác định cấp độ phân loại cấp cứu"""
        base_triage = symptom_data.get("triage_hint", TriageLevel.LEVEL_3_YELLOW)
        
        # Dị ứng nghiêm trọng + triệu chứng dị ứng → Level 1
        if self.check_critical_allergy(allergies):
            if symptom_data.get("category") == MedicalCategory.ALLERGIC:
                return TriageLevel.LEVEL_1_RED
        
        # Tiền sử nguy hiểm → nâng cấp triage
        high_risk_history = ["stent", "pacemaker", "máy tạo nhịp", "van tim", "ghép tạng"]
        for history in medical_history:
            if any(risk in history.lower() for risk in high_risk_history):
                if base_triage == TriageLevel.LEVEL_3_YELLOW:
                    return TriageLevel.LEVEL_2_ORANGE
        
        return base_triage
    
    def determine_triage_level_multi(
        self,
        symptoms_data: List[Dict],
        allergies: List[str],
        medical_history: List[str]
    ) -> TriageLevel:
        """Xác định cấp độ phân loại cấp cứu từ nhiều triệu chứng - lấy mức cao nhất"""
        if not symptoms_data:
            return TriageLevel.LEVEL_3_YELLOW
        
        # Lấy mức triage cao nhất từ tất cả triệu chứng
        triage_levels = []
        for symptom_data in symptoms_data:
            level = self.determine_triage_level(symptom_data, allergies, medical_history)
            triage_levels.append(level)
        
        # Sắp xếp theo mức độ nghiêm trọng (LEVEL_1 > LEVEL_2 > ... > LEVEL_5)
        priority_order = [
            TriageLevel.LEVEL_1_RED,
            TriageLevel.LEVEL_2_ORANGE,
            TriageLevel.LEVEL_3_YELLOW,
            TriageLevel.LEVEL_4_BLUE,
            TriageLevel.LEVEL_5_GREEN
        ]
        
        for priority in priority_order:
            if priority in triage_levels:
                return priority
        
        return TriageLevel.LEVEL_3_YELLOW
    
    def get_triage_info(self, level: TriageLevel) -> Dict:
        """Lấy thông tin chi tiết về cấp độ phân loại"""
        return TRIAGE_LEVELS.get(level, TRIAGE_LEVELS[TriageLevel.LEVEL_3_YELLOW])


class MedicalCardGenerator:
    """Service tạo Medical Translation Card"""
    
    def __init__(self):
        self.terminology_service = MedicalTerminologyService()
    
    def generate_card(self, input_data: MedicalCardInput) -> EmergencyCardOutput:
        """Tạo Medical Translation Card đầy đủ từ input data"""
        card_id = f"MTC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        identity = input_data.identity
        medical = input_data.medical_critical
        ts = self.terminology_service
        
        # Get country info
        country_info = get_country_info(identity.nationality)
        
        # Process symptoms (hỗ trợ nhiều triệu chứng)
        symptoms_data = ts.standardize_symptoms(medical.current_symptoms)
        
        # Process allergies
        processed_allergies = self._process_allergies(medical.allergies)
        has_critical_allergy = ts.check_critical_allergy(medical.allergies)
        allergy_summary = self._build_allergy_summary(medical.allergies, has_critical_allergy)
        
        # Process medications
        processed_medications = self._process_medications(medical.Medications)
        high_risk_meds = ts.get_high_risk_medications(medical.Medications)
        medication_summary = self._build_medication_summary(medical.Medications, high_risk_meds)
        
        # Process medical history
        processed_history = self._process_medical_history(medical.Medical_history)
        history_summary = self._build_history_summary(medical.Medical_history)
        
        # Process surgical history
        processed_surgical = self._process_surgical_history(medical.surgical_history)
        
        # Determine triage (lấy mức cao nhất từ tất cả triệu chứng)
        triage_level = ts.determine_triage_level_multi(
            symptoms_data, medical.allergies, medical.Medical_history
        )
        triage_data = ts.get_triage_info(triage_level)
        
        # Build components
        chief_complaint = self._build_chief_complaint(medical.current_symptoms, symptoms_data)
        patient_identity = self._build_patient_identity(identity, medical, country_info)
        triage_info = self._build_triage_info(triage_level, triage_data)
        clinical_notes = self._build_clinical_notes_multi(
            symptoms_data, has_critical_allergy, high_risk_meds, 
            processed_medications, processed_history
        )
        emergency_contact = self._build_emergency_contact(identity)
        
        is_emergency = triage_level in [TriageLevel.LEVEL_1_RED, TriageLevel.LEVEL_2_ORANGE]
        
        return EmergencyCardOutput(
            card_id=card_id,
            generated_at=datetime.now().isoformat(),
            card_version="1.0",
            triage=triage_info,
            patient_identity=patient_identity,
            chief_complaint=chief_complaint,
            allergies=processed_allergies,
            has_critical_allergy=has_critical_allergy,
            allergy_summary=allergy_summary,
            current_medications=processed_medications,
            high_risk_medications=high_risk_meds,
            medication_summary=medication_summary,
            medical_history=processed_history,
            history_summary=history_summary,
            surgical_history=processed_surgical,
            emergency_contact=emergency_contact,
            clinical_notes=clinical_notes,
            is_emergency=is_emergency,
            display_language="vi"
        )
    
    def generate_compact_card(self, input_data: MedicalCardInput) -> CompactCardOutput:
        """Tạo Compact Medical Translation Card - phiên bản tối ưu"""
        identity = input_data.identity
        medical = input_data.medical_critical
        ts = self.terminology_service
        
        country_info = get_country_info(identity.nationality)
        symptoms_data = ts.standardize_symptoms(medical.current_symptoms)
        
        triage_level = ts.determine_triage_level_multi(
            symptoms_data, medical.allergies, medical.Medical_history
        )
        triage_data = ts.get_triage_info(triage_level)
        
        gender_data = GENDER_DICTIONARY.get(
            identity.gender, {"en": "Unknown", "vi": "Không xác định"}
        )

        patient_payload = {
            "name": identity.full_name,
            "age": identity.age,
            "gender": {
                "en": gender_data["en"],
                "vi": gender_data["vi"]
            },
            "nationality": {
                "code": country_info.get("code", "??"),
                "name_en": identity.nationality,
                "name_vi": country_info.get("name_vi", identity.nationality)
            },
            "blood_type": medical.blood_type,
            "emergency_contact": (
                {
                    "name": identity.emergency_contact,
                    "phone": identity.emergency_contact_phone
                } if identity.emergency_contact else None
            )
        }

        triage_payload = {
            "level": int(triage_level.value),
            "color_code": triage_data.get("color_hex"),
            "display_text": {
                "en": triage_data.get("name_en"),
                "vi": triage_data.get("name_vi")
            },
            "response_time_minutes": triage_data.get("response_minutes")
        }

        chief_complaint_payload = {
            "original": medical.current_symptoms,
            "symptoms": self._build_compact_symptoms(symptoms_data)
        }

        return CompactCardOutput(
            patient=patient_payload,
            triage=triage_payload,
            chief_complaint=chief_complaint_payload,
            allergies=self._build_compact_allergies(medical.allergies),
            medications=self._build_compact_medications_structured(medical.Medications),
            medical_history=self._build_compact_bilingual_list(
                medical.Medical_history, ts.standardize_medical_history
            ),
            surgical_history=self._build_compact_bilingual_list(
                medical.surgical_history or [], ts.standardize_surgical_history
            )
        )
    
    # ==================== PRIVATE HELPER METHODS ====================
    
    def _process_allergies(self, allergies: List[str]) -> List[AllergyInfo]:
        """Xử lý danh sách dị ứng"""
        result = []
        for allergy in allergies:
            data = self.terminology_service.standardize_allergy(allergy)
            result.append(AllergyInfo(
                allergen=BilingualTerm(
                    en=data["en"],
                    vi=data["vi"],
                    clinical_note=data.get("warning")
                ),
                severity="Severe" if data.get("warning") else "Moderate",
                reaction_type=BilingualTerm(
                    en=data.get("type", "Unknown").title(),
                    vi=self._translate_allergy_type(data.get("type", "unknown"))
                ) if data.get("type") else None
            ))
        return result
    
    def _process_medications(self, medications: List[str]) -> List[MedicationInfo]:
        """Xử lý danh sách thuốc"""
        result = []
        for med in medications:
            data = self.terminology_service.standardize_medication(med)
            result.append(MedicationInfo(
                medication_name=BilingualTerm(en=data["en"], vi=data["vi"]),
                drug_class=BilingualTerm(
                    en=data.get("class_en", "Unknown"),
                    vi=data.get("class_vi", "Không xác định")
                ) if data.get("class_en") else None,
                clinical_warning=data.get("warning")
            ))
        return result
    
    def _process_medical_history(self, history: List[str]) -> List[MedicalHistoryInfo]:
        """Xử lý tiền sử bệnh"""
        result = []
        for condition in history:
            data = self.terminology_service.standardize_medical_history(condition)
            result.append(MedicalHistoryInfo(
                condition=BilingualTerm(en=data["en"], vi=data["vi"]),
                clinical_significance=data.get("significance")
            ))
        return result
    
    def _process_surgical_history(self, surgeries: Optional[List[str]]) -> Optional[List[BilingualTerm]]:
        """Xử lý tiền sử phẫu thuật"""
        if not surgeries:
            return None
        
        result = []
        for surgery in surgeries:
            data = self.terminology_service.standardize_surgical_history(surgery)
            result.append(BilingualTerm(en=data["en"], vi=data["vi"]))
        return result
    
    def _build_allergy_summary(self, allergies: List[str], has_critical: bool) -> BilingualTerm:
        """Tạo tóm tắt dị ứng"""
        if not allergies:
            return BilingualTerm(
                en="No Known Allergies (NKDA)",
                vi="Không có tiền sử dị ứng ghi nhận"
            )
        
        warning = " - CẢNH BÁO NGHIÊM TRỌNG" if has_critical else ""
        return BilingualTerm(
            en=f"{len(allergies)} known allergies",
            vi=f"Có {len(allergies)} dị ứng ghi nhận{warning}"
        )
    
    def _build_medication_summary(self, medications: List[str], high_risk: List[str]) -> BilingualTerm:
        """Tạo tóm tắt thuốc"""
        if not medications:
            return BilingualTerm(en="No current medications", vi="Không đang dùng thuốc")
        
        warning = f" - {len(high_risk)} thuốc nguy cơ cao" if high_risk else ""
        return BilingualTerm(
            en=f"{len(medications)} current medications",
            vi=f"Đang dùng {len(medications)} loại thuốc{warning}"
        )
    
    def _build_history_summary(self, history: List[str]) -> BilingualTerm:
        """Tạo tóm tắt tiền sử"""
        if not history:
            return BilingualTerm(
                en="No significant past medical history",
                vi="Không có tiền sử bệnh lý đáng kể"
            )
        
        return BilingualTerm(
            en=f"{len(history)} conditions in history",
            vi=f"Tiền sử {len(history)} bệnh lý"
        )
    
    def _build_chief_complaint(self, original: str, symptoms_data: List[Dict]) -> ChiefComplaint:
        """Tạo chief complaint từ danh sách triệu chứng"""
        standardized_terms = []
        medical_categories = []
        clinical_descriptions = []
        
        for symptom_data in symptoms_data:
            standardized_terms.append(BilingualTerm(
                en=symptom_data.get("en") or symptom_data.get("original", original),
                vi=symptom_data.get("vi") or symptom_data.get("original", original),
                clinical_note=symptom_data.get("clinical_note")
            ))
            medical_categories.append(symptom_data.get("category", MedicalCategory.OTHER))
            if symptom_data.get("clinical_note"):
                clinical_descriptions.append(symptom_data["clinical_note"])
        
        return ChiefComplaint(
            original_input=original,
            standardized_terms=standardized_terms,
            medical_categories=medical_categories,
            clinical_descriptions=clinical_descriptions if clinical_descriptions else None
        )
    
    def _build_patient_identity(self, identity, medical, country_info: Dict) -> PatientIdentityCard:
        """Tạo patient identity card"""
        gender_data = GENDER_DICTIONARY.get(
            identity.gender, {"en": "Unknown", "vi": "Không xác định"}
        )
        
        return PatientIdentityCard(
            full_name=identity.full_name,
            age=identity.age,
            gender=BilingualTerm(en=gender_data["en"], vi=gender_data["vi"]),
            nationality=identity.nationality,
            nationality_flag=country_info.get("flag", "🏳️"),
            blood_type=medical.blood_type,
            date_of_birth=identity.date_of_birth,
            patient_id=identity.userId
        )
    
    def _build_triage_info(self, level: TriageLevel, data: Dict) -> TriageInfo:
        """Tạo triage info"""
        return TriageInfo(
            level=level,
            color_code=data["color"],
            level_name=BilingualTerm(en=data["name_en"], vi=data["name_vi"]),
            target_response_time=data["response_time"],
            description=f"Mức độ {level.value}: {data['name_vi']}"
        )
    
    def _build_clinical_notes_multi(
        self, symptoms_data: List[Dict], has_critical_allergy: bool,
        high_risk_meds: List[str], medications: List[MedicationInfo],
        history: List[MedicalHistoryInfo]
    ) -> List[str]:
        """Tạo danh sách ghi chú lâm sàng từ nhiều triệu chứng"""
        notes = []
        
        # Thêm clinical note từ tất cả triệu chứng
        for symptom_data in symptoms_data:
            if symptom_data.get("clinical_note"):
                notes.append(f"⚠️ {symptom_data['clinical_note']}")
        
        if has_critical_allergy:
            notes.append("🔴 CẢNH BÁO: Có tiền sử dị ứng nghiêm trọng")
        
        if high_risk_meds:
            notes.append(f"💊 Thuốc nguy cơ cao: {', '.join(high_risk_meds)}")
        
        for med in medications:
            if med.clinical_warning:
                notes.append(f"💊 {med.medication_name.vi}: {med.clinical_warning}")
        
        for hist in history:
            if hist.clinical_significance:
                notes.append(f"📋 {hist.condition.vi}: {hist.clinical_significance}")
        
        return notes

    def _build_emergency_contact(self, identity) -> Optional[Dict]:
        """Tạo emergency contact"""
        if not identity.emergency_contact:
            return None
        
        return {
            "name": identity.emergency_contact,
            "phone": identity.emergency_contact_phone,
            "label": {"en": "Emergency Contact", "vi": "Người liên hệ khẩn cấp"}
        }
    
    def _build_compact_symptoms(self, symptoms_data: List[Dict]) -> List[Dict[str, str]]:
        """Chuẩn hóa danh sách triệu chứng song ngữ cho compact card"""
        compact = []
        for symptom in symptoms_data or []:
            en_term = symptom.get("en") or symptom.get("original") or ""
            vi_term = symptom.get("vi") or symptom.get("original") or en_term
            if not en_term and vi_term:
                en_term = vi_term
            if not vi_term and en_term:
                vi_term = en_term
            compact.append({"en": en_term, "vi": vi_term})
        return compact
    
    def _build_compact_allergies(self, allergies: List[str]) -> List[Dict[str, str]]:
        """Tạo danh sách dị ứng gồm tên tiếng Anh và tiếng Việt"""
        result = []
        for allergy in allergies:
            data = self.terminology_service.standardize_allergy(allergy)
            en_name = data.get("en") or data.get("original") or allergy
            vi_name = data.get("vi") or data.get("original") or en_name
            result.append({"name_en": en_name, "name_vi": vi_name})
        return result
    
    def _build_compact_medications_structured(self, medications: List[str]) -> List[Dict[str, str]]:
        """Tạo danh sách thuốc theo cấu trúc mới"""
        result = []
        for med in medications:
            data = self.terminology_service.standardize_medication(med)
            name = data.get("en") or data.get("vi") or med
            result.append({"name": name})
        return result
    
    def _build_compact_bilingual_list(self, items: List[str], standardize_func) -> List[Dict[str, str]]:
        """Tạo danh sách phần tử song ngữ dạng {en, vi}"""
        if not items:
            return []
        result = []
        for item in items:
            data = standardize_func(item)
            en_value = data.get("en") or data.get("original") or item
            vi_value = data.get("vi") or data.get("original") or en_value
            result.append({"en": en_value, "vi": vi_value})
        return result
    
    def _translate_allergy_type(self, allergy_type: str) -> str:
        """Dịch loại dị ứng sang tiếng Việt"""
        translations = {
            "drug": "Dị ứng thuốc",
            "food": "Dị ứng thực phẩm",
            "other": "Dị ứng khác",
            "unknown": "Không xác định"
        }
        return translations.get(allergy_type, "Không xác định")
