# Medical Translation Card Service

## 🏥 Giới thiệu

**Medical Translation Card (MTC)** là một FastAPI service tự động tạo "Thẻ tóm tắt bệnh lý" song ngữ Anh-Việt cho bệnh nhân nước ngoài tại Việt Nam.

Khi người dùng nhập triệu chứng, hệ thống sẽ:

1. **Chuẩn hóa thuật ngữ y khoa** thành thuật ngữ chuyên ngành
2. **Phân loại cấp cứu (Triage)** theo quy trình Bộ Y tế Việt Nam
3. **Nhận diện dị ứng nguy hiểm** và thuốc nguy cơ cao
4. **Tạo thẻ cấp cứu** với đầy đủ thông tin bác sĩ cần

## 🚀 Cài đặt

### 1. Tạo môi trường ảo(Optional)

```bash
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### 3. Cấu hình môi trường

```bash
GEMINI_API_KEY=YOUR_KEY
```

### 4. Chạy server

```bash
python main.py
```

### 5. Truy cập API docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📋 API Endpoints

### POST /api/v1/medical-card/generate-compact

Tạo Medical Translation Card

**Request:**

```json
{
  "identity": {
    "userId": "P001",
    "full_name": "John Smith",
    "nationality": "USA",
    "age": 35,
    "gender": "Male",
    "date_of_birth": "1990-01-15",
    "emergency_contact": "Jane Smith",
    "emergency_contact_phone": "+1 234 567 8900"
  },
  "medical_critical": {
    "current_symptoms": "I have had a headache and dizziness since this morning",
    "blood_type": "A+",
    "allergies": ["Penicillin", "Aspirin"],
    "Medications": ["Metformin", "Warfarin"],
    "Medical_history": ["Tiểu đường", "Cao huyết áp"],
    "surgical_history": ["Appendectomy"]
  }
}
```

**Response:**

```json
{
  "patient": {
    "name": "John Smith",
    "age": 35,
    "gender": {
      "en": "Male",
      "vi": "Nam"
    },
    "nationality": {
      "code": "US",
      "name_en": "USA",
      "name_vi": "Mỹ"
    },
    "blood_type": "A+",
    "emergency_contact": {
      "name": "Jane Smith",
      "phone": "+1 234 567 8900"
    }
  },
  "triage": {
    "level": 3,
    "color_code": "#FFD700",
    "display_text": {
      "en": "Urgent / Moderate",
      "vi": "Khẩn cấp / Trung bình"
    },
    "response_time_minutes": 30
  },
  "chief_complaint": {
    "original": "I have had a headache and dizziness since this morning",
    "symptoms": [
      {
        "en": "Headache",
        "vi": "Đau đầu"
      },
      {
        "en": "Dizziness",
        "vi": "Chóng mặt"
      }
    ]
  },
  "allergies": [
    {
      "name_en": "Penicillin",
      "name_vi": "Penicillin"
    },
    {
      "name_en": "Aspirin",
      "name_vi": "Aspirin"
    }
  ],
  "medications": [
    {
      "name": "Metformin"
    },
    {
      "name": "Warfarin"
    }
  ],
  "medical_history": [
    {
      "en": "Diabetes Mellitus",
      "vi": "Đái tháo đường / Tiểu đường"
    },
    {
      "en": "Hypertension",
      "vi": "Tăng huyết áp / Cao huyết áp"
    }
  ],
  "surgical_history": [
    {
      "en": "Appendectomy",
      "vi": "Phẫu thuật cắt ruột thừa"
    }
  ]
}
```

## 🎯 Cấu trúc Output

Output trả về bao gồm các phần chính:

### 1. Triage Info (Phân loại cấp cứu)

- Level 1 (Đỏ): Cấp cứu tối khẩn - Ngay lập tức
- Level 2 (Cam): Cấp cứu - < 10 phút
- Level 3 (Vàng): Khẩn cấp - < 30 phút
- Level 4 (Xanh dương): Ít khẩn cấp - < 60 phút
- Level 5 (Xanh lá): Không khẩn cấp - < 120 phút

### 2. Patient Identity (Thông tin bệnh nhân)

- Họ tên, tuổi, giới tính
- Quốc tịch, nhóm máu
- Mã bệnh nhân

### 3. Chief Complaint (Lý do vào viện)

- Triệu chứng gốc
- Thuật ngữ chuẩn hóa (Anh/Việt)
- Phân loại bệnh lý
- Ghi chú lâm sàng

### 4. Allergies (Dị ứng)

- Danh sách dị ứng đã chuẩn hóa
- Cảnh báo dị ứng nghiêm trọng
- Loại dị ứng (thuốc/thực phẩm/khác)

### 5. Current Medications (Thuốc đang dùng)

- Danh sách thuốc
- Nhóm dược lý
- Cảnh báo thuốc nguy cơ cao

### 6. Medical History (Tiền sử bệnh)

- Tiền sử bệnh lý
- Ý nghĩa lâm sàng

### 7. Clinical Notes (Ghi chú lâm sàng)

- Cảnh báo quan trọng
- Lưu ý điều trị

## 📁 Cấu trúc Project

```
medical_translation_card/
├── main.py                  # FastAPI app chính
├── models.py                # Pydantic models
├── services.py              # Business logic
├── medical_terminology.py   # Database thuật ngữ
├── requirements.txt         # Dependencies
├── .env.example             # Mẫu file environment
└── README.md                # Tài liệu này
```

## 🔧 Tùy chỉnh

### Thêm thuật ngữ mới

Chỉnh sửa file `medical_terminology.py`:

- `SYMPTOM_DICTIONARY`: Thuật ngữ triệu chứng
- `ALLERGY_DICTIONARY`: Thuật ngữ dị ứng
- `MEDICATION_DICTIONARY`: Thuật ngữ thuốc
- `MEDICAL_HISTORY_DICTIONARY`: Tiền sử bệnh

### Tích hợp AI

Đặt `GEMINI_API_KEY` trong `.env` để sử dụng tính năng chuẩn hóa bằng AI cho các triệu chứng phức tạp không có trong database.

## 📚 Tài liệu tham khảo

- [HL7 FHIR IPS](https://build.fhir.org/ig/HL7/fhir-ips/)
- Quy trình phân loại cấp cứu Bộ Y tế Việt Nam
- Hướng dẫn chẩn đoán và điều trị các bệnh lý cấp cứu

## 📝 License

MIT License
