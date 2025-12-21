# Medical Translation Card Service

## 🏥 Giới thiệu

**Medical Translation Card (MTC)** là một FastAPI service tự động tạo "Thẻ tóm tắt bệnh lý" song ngữ Anh-Việt cho bệnh nhân nước ngoài tại Việt Nam.

Khi người dùng nhập triệu chứng, hệ thống sẽ:

1. **Chuẩn hóa thuật ngữ y khoa** thành thuật ngữ chuyên ngành
2. **Phân loại cấp cứu (Triage)** theo quy trình Bộ Y tế Việt Nam
3. **Nhận diện dị ứng nguy hiểm** và thuốc nguy cơ cao
4. **Tạo thẻ cấp cứu** với đầy đủ thông tin bác sĩ cần

## 🚀 Cài đặt

### 1. Tạo môi trường ảo

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

### 3. Cấu hình môi trường (Optional)

```bash
# Copy file mẫu
cp .env.example .env

# Thêm OpenAI API key nếu muốn dùng AI enhancement
# OPENAI_API_KEY=your_key_here
```

### 4. Chạy server

```bash
# Development mode
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Hoặc
python main.py
```

### 5. Truy cập API docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📋 API Endpoints

### POST /api/v1/medical-card/generate

Tạo Medical Translation Card

**Request Body:**

```json
{
  "identity": {
    "userId": "user_123",
    "full_name": "Alex Mueller",
    "nationality": "Germany (DE)",
    "age": 24,
    "gender": "Male",
    "date_of_birth": "15/03/2001",
    "passport_number": "C01X00T47",
    "emergency_contact": "Maria Mueller",
    "emergency_contact_phone": "+49 170 1234567"
  },
  "medical_critical": {
    "blood_type": "A+",
    "allergies": ["Aspirin", "Penicillin"],
    "current_symptoms": "Sốc phản vệ",
    "Medications": ["Metoprolol", "Atorvastatin"],
    "Medical_history": ["Hypertension", "Coronary Stent"],
    "surgical_history": ["Appendectomy"]
  }
}
```

**Response:** Xem chi tiết tại `/api/v1/example`

### POST /api/v1/symptoms/standardize

Chuẩn hóa một triệu chứng

### POST /api/v1/symptoms/standardize-ai

Chuẩn hóa triệu chứng bằng AI (cần OPENAI_API_KEY)

### GET /api/v1/triage/levels

Lấy danh sách cấp độ phân loại cấp cứu

### GET /api/v1/categories

Lấy danh sách phân loại bệnh lý

### GET /api/v1/terminology/search

Tìm kiếm thuật ngữ y khoa

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

Đặt `OPENAI_API_KEY` trong `.env` để sử dụng tính năng chuẩn hóa bằng AI cho các triệu chứng phức tạp không có trong database.

## 📚 Tài liệu tham khảo

- [HL7 FHIR IPS](https://build.fhir.org/ig/HL7/fhir-ips/)
- Quy trình phân loại cấp cứu Bộ Y tế Việt Nam
- Hướng dẫn chẩn đoán và điều trị các bệnh lý cấp cứu

## 📝 License

MIT License
