# Interactive Model API - OOP Version

## 🏗️ Cấu trúc mới (OOP)

```
interactive_model/
├── config.py              # ⚙️ Cấu hình tập trung
├── collector.py           # 📊 Thu thập & phân tích thông tin
├── question_generator.py  # ❓ Tạo câu hỏi
├── guide_generator.py     # 📖 Tạo hướng dẫn
├── main_v2.py            # 🚀 API endpoints (refactored)
├── main.py               # 📄 Old version
└── test_api.py           # ✅ Test script
```

## ✨ Cải tiến chính

### 1. **Tách biệt concerns (Separation of Concerns)**

- `InformationCollector`: Xử lý extraction & analysis
- `QuestionGenerator`: Tạo câu hỏi
- `GuideGenerator`: Tạo hướng dẫn
- `config.py`: Cấu hình tập trung

### 2. **Dễ thay đổi required_fields**

```python
# Chỉ cần sửa config.py
REQUIRED_FIELDS = {
    "current_address": {...},
    "phone_number": {  # ← Thêm field mới
        "type": "str",
        "description": "Số điện thoại",
        "examples": ["0901234567", "84901234567"]
    }
}
# Tất cả logic tự động adapt!
```

### 3. **Prompts ngắn gọn hơn**

- Loại bỏ chi tiết dư thừa
- Sử dụng dynamic generation từ config
- Tập trung vào yêu cầu cốt lõi

### 4. **Questions từ API**

- `QuestionGenerator` gọi Gemini để tạo câu hỏi contextual
- Có fallback nếu API fail
- Phù hợp với ngữ cảnh của collected_info

### 5. **Dễ extend và maintain**

```python
# Muốn thay đổi logic extraction?
# → Chỉ sửa collector.py

# Muốn cải thiện câu hỏi?
# → Chỉ sửa question_generator.py

# Muốn thêm RAG nguồn khác?
# → Chỉ sửa guide_generator.py
```

## 🚀 Sử dụng

### Chạy version mới:

```bash
python main_v2.py
```

### Test:

```bash
# Cần update test_api.py để test main_v2.py nếu cần
python test_api.py
```

### Xem fields hiện tại:

```bash
curl http://localhost:8000/fields
```

## 📝 Ví dụ thay đổi cấu hình

### Thêm field mới:

```python
# config.py
REQUIRED_FIELDS = {
    # ... existing fields ...
    "email": {
        "type": "str",
        "description": "Địa chỉ email",
        "examples": ["user@example.com", "contact@mail.com"]
    }
}
```

### Thay đổi model:

```python
# config.py
GEMINI_MODEL_NAME = "gemini-1.5-pro-latest"  # Model mạnh hơn
```

## 🎯 Lợi ích

1. **Single Responsibility**: Mỗi class làm 1 việc
2. **Open/Closed**: Dễ extend, không cần sửa code cũ
3. **DRY**: Không lặp lại logic
4. **Testable**: Dễ unit test từng component
5. **Maintainable**: Dễ hiểu, dễ sửa

## 🔄 So sánh

| Aspect          | Old (main.py)  | New (main_v2.py)      |
| --------------- | -------------- | --------------------- |
| Lines of code   | 319            | ~150 (main) + modules |
| Required fields | Hardcoded      | Config file           |
| Prompts         | Dài, chi tiết  | Ngắn, dynamic         |
| Questions       | Hardcoded dict | API-generated         |
| Extensibility   | Khó            | Dễ                    |
| Maintainability | Trung bình     | Cao                   |

## 🐛 Migration từ v1

Code cũ (`main.py`) vẫn hoạt động. Để chuyển sang v2:

1. Test `main_v2.py` thoroughly
2. Backup `main.py`
3. Rename `main_v2.py` → `main.py`
4. Done!
