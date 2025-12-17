# 📘 Hướng Dẫn Sử Dụng API - Interactive Model

## 📌 Tổng Quan

API này cung cấp 2 endpoint chính để thu thập thông tin từ người dùng và tạo hướng dẫn chi tiết:

- **Query Type 1** (`/query1`): Thu thập thông tin tương tác
- **Query Type 2** (`/query2`): Tạo hướng dẫn từ kết quả Model A

**Base URL:** `http://localhost:8000`

---

## 🔹 Endpoint 1: `/query1` - Thu Thập Thông Tin

### ✅ Mục Đích

Endpoint này nhận câu hỏi từ người dùng, trích xuất thông tin, phân tích trạng thái các trường dữ liệu và tạo câu hỏi tiếp theo (nếu cần).

### 📥 Request

**Method:** `POST`

**URL:** `http://localhost:8000/query1`

**Headers:**

```
Content-Type: application/json
```

**Body Structure:**

```json
{
  "query": "string",
  "collected_info": {}
}
```

#### 📋 Chi Tiết Tham Số

| Tham số          | Kiểu   | Bắt buộc | Mô tả                                                             |
| ---------------- | ------ | -------- | ----------------------------------------------------------------- |
| `query`          | string | ✅       | Câu hỏi/thông tin từ người dùng (bất kỳ ngôn ngữ nào)             |
| `collected_info` | object | ❌       | Thông tin đã thu thập từ các lần tương tác trước (mặc định: `{}`) |

### 📤 Response

**Status Code:** `200 OK`

**Body Structure:**

```json
{
  "questions": ["string"],
  "collected_info": {},
  "is_complete": false,
  "info_status": {}
}
```

#### 📋 Chi Tiết Response

| Trường           | Kiểu          | Mô tả                                                                                       |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `questions`      | array[string] | Danh sách câu hỏi tiếp theo (tối đa 5 câu, dùng ngôn ngữ của người dùng)                    |
| `collected_info` | object        | Thông tin đã được trích xuất và xác nhận (đã lọc bỏ thông tin không chắc chắn - status 0.5) |
| `is_complete`    | boolean       | `true` nếu đã đủ thông tin, `false` nếu còn thiếu                                           |
| `info_status`    | object        | Trạng thái của từng trường: `0` (thiếu), `1` (đã có)                                        |

---

### 📝 Ví Dụ Sử Dụng

#### **Ví Dụ 1: Câu Hỏi Đầu Tiên (Tiếng Việt)**

**Request:**

```json
{
  "query": "Tôi là người Indonesia muốn gia hạn visa, đang ở quận 1",
  "collected_info": {}
}
```

**Response:**

```json
{
  "questions": [
    "Loại visa bạn đang sử dụng là gì? (Du lịch, Công tác, Học tập...)",
    "Visa của bạn còn hạn bao lâu nữa?",
    "Bạn đang ở địa chỉ cụ thể nào tại Quận 1?",
    "Bạn có thể giao tiếp bằng tiếng gì? (Tiếng Anh, Tiếng Việt...)",
    "Bạn cần xử lý khẩn cấp hay có thời gian?"
  ],
  "collected_info": {
    "nationality": "Indonesian",
    "problem_category": "Visa_Issue"
  },
  "is_complete": false,
  "info_status": {
    "nationality": 1,
    "problem_category": 1,
    "language_spoken": 0,
    "visa_type": 0,
    "visa_expiry_status": 0,
    "time_constraint": 0
  }
}
```

---

#### **Ví Dụ 2: Câu Hỏi Tiếp Theo (Tiếng Đức)**

**Request:**

```json
{
  "query": "Mein Name ist Hilter, ich bin 1990 geboren, habe zwei Kinder und hatte einen Verkehrsunfall.",
  "collected_info": {}
}
```

**Response:**

```json
{
  "questions": [
    "Was ist Ihre Staatsangehörigkeit?",
    "Wo ist der Unfall passiert? (Straße/Bezirk)",
    "Haben Sie bereits eine Polizeimeldung gemacht?",
    "Gibt es Verletzte? Benötigen Sie medizinische Hilfe?",
    "Wo befinden Sie sich gerade?"
  ],
  "collected_info": {
    "full_name": "Hilter",
    "age_group": "Adult",
    "group_size": 3,
    "problem_category": "Medical_Emergency",
    "vehicle_involved": "involved"
  },
  "is_complete": false,
  "info_status": {
    "nationality": 0,
    "incident_location": 0,
    "police_report_status": 0,
    "symptom_urgency": 0,
    "full_name": 1,
    "age_group": 1,
    "group_size": 1
  }
}
```

---

#### **Ví Dụ 3: Đã Đủ Thông Tin (Tiếng Anh)**

**Request:**

```json
{
  "query": "I'm American, living in District 3, need visa renewal, tourist visa expires in 2 days",
  "collected_info": {
    "nationality": "American",
    "language_spoken": "English"
  }
}
```

**Response:**

```json
{
  "questions": [],
  "collected_info": {
    "nationality": "American",
    "language_spoken": "English",
    "problem_category": "Visa_Issue",
    "visa_type": "Tourist",
    "visa_expiry_status": "Expires in 2 days",
    "time_constraint": "Urgent"
  },
  "is_complete": true,
  "info_status": {
    "nationality": 1,
    "language_spoken": 1,
    "problem_category": 1,
    "visa_type": 1,
    "visa_expiry_status": 1,
    "time_constraint": 1
  }
}
```

---

## 🔹 Endpoint 2: `/query2` - Tạo Hướng Dẫn

### ✅ Mục Đích

Endpoint này nhận kết quả từ **Model A** (danh sách địa điểm phù hợp) và tạo hướng dẫn chi tiết bằng ngôn ngữ của người dùng.

### 📥 Request

**Method:** `POST`

**URL:** `http://localhost:8000/query2`

**Headers:**

```
Content-Type: application/json
```

**Body Structure:**

```json
{
  "original_query": "string",
  "top_k_results": [{}],
  "collected_info": {}
}
```

#### 📋 Chi Tiết Tham Số

| Tham số          | Kiểu          | Bắt buộc | Mô tả                                                 |
| ---------------- | ------------- | -------- | ----------------------------------------------------- |
| `original_query` | string        | ✅       | Câu hỏi gốc của người dùng                            |
| `top_k_results`  | array[object] | ✅       | Danh sách kết quả từ Model A (địa điểm được xếp hạng) |
| `collected_info` | object        | ✅       | Thông tin người dùng đã thu thập từ `/query1`         |

#### 📋 Cấu Trúc Của `top_k_results`

Mỗi phần tử trong `top_k_results` là một địa điểm có cấu trúc:

```json
{
  "Ma": "string",
  "Ten": "string",
  "DiaChi": "string",
  "Lat": "string",
  "Lng": "string",
  "SDT": "string",
  "Website": "string",
  "Category": "string",
  "raw_distance_km": 0.0,
  "distance_score": 0.0,
  "spec_score": 0.0,
  "spec_reason": "string",
  "total_score": 0.0
}
```

### 📤 Response

**Status Code:** `200 OK`

**Body Structure:**

```json
{
  "guide": {},
  "top_result": {}
}
```

#### 📋 Chi Tiết Response

| Trường       | Kiểu   | Mô tả                                                               |
| ------------ | ------ | ------------------------------------------------------------------- |
| `guide`      | object | Hướng dẫn chi tiết theo ngôn ngữ người dùng (5 phần)                |
| `top_result` | object | Thông tin địa điểm được chọn (phần tử đầu tiên của `top_k_results`) |

#### 📋 Cấu Trúc Của `guide`

```json
{
  "Chuẩn bị": "string",
  "Giấy tờ cần thiết": "string",
  "Địa điểm và thời gian": "string",
  "Thủ tục": "string",
  "Lưu ý quan trọng": "string"
}
```

_(Tên các phần sẽ tự động dịch sang ngôn ngữ của người dùng)_

---

### 📝 Ví Dụ Sử Dụng

#### **Ví Dụ: Tạo Hướng Dẫn Cho Người Indonesia**

**Request:**

```json
{
  "original_query": "Tôi là người Indonesia muốn gia hạn visa",
  "top_k_results": [
    {
      "Ma": "LSQ_001",
      "Ten": "Tổng Lãnh sự quán Indonesia",
      "DiaChi": "18 Phùng Khắc Khoan, P. Đa Kao, Quận 1",
      "Lat": "10.7813",
      "Lng": "106.6953",
      "SDT": "02838251888",
      "Website": "https://www.kemlu.go.id/hochiminhcity",
      "Category": "LanhSuQuan",
      "raw_distance_km": 0.354,
      "distance_score": 1.0,
      "spec_score": 0.9,
      "spec_reason": "Địa điểm này là Lãnh sự quán của Indonesia",
      "total_score": 0.92
    }
  ],
  "collected_info": {
    "nationality": "Indonesian",
    "problem_category": "Visa_Issue",
    "visa_type": "Tourist",
    "visa_expiry_status": "Expires in 3 days",
    "language_spoken": "English, Indonesian"
  }
}
```

**Response:**

```json
{
  "guide": {
    "Chuẩn bị": "- Hộ chiếu gốc (còn hạn ít nhất 6 tháng)\n- Visa hiện tại\n- Ảnh 4x6 (2 tấm, nền trắng)\n- Giấy xác nhận tạm trú/booking khách sạn\n- Vé máy bay về nước (nếu có)",
    "Giấy tờ cần thiết": "1. Hộ chiếu gốc + photocopy\n2. Form đơn xin gia hạn visa (tải tại website)\n3. Visa hiện tại (photocopy)\n4. Giấy xác nhận tạm trú từ khách sạn/chủ nhà\n5. Ảnh 4x6 (2 tấm)\n6. Phí gia hạn (khoảng 500,000 - 1,000,000 VND tùy loại visa)",
    "Địa điểm và thời gian": "📍 Địa chỉ: 18 Phùng Khắc Khoan, P. Đa Kao, Quận 1\n📞 Điện thoại: 02838251888\n🌐 Website: https://www.kemlu.go.id/hochiminhcity\n⏰ Giờ làm việc: Thứ 2-6, 8:30-12:00 & 13:30-16:30\n🚗 Cách đến: Taxi/Grab từ vị trí của bạn mất khoảng 5-10 phút",
    "Thủ tục": "Bước 1: Gọi điện hoặc email đặt lịch hẹn trước\nBước 2: Điền form đơn xin gia hạn (tải từ website)\nBước 3: Đến Lãnh sự quán vào giờ hẹn, mang đầy đủ giấy tờ\nBước 4: Nộp hồ sơ và đóng phí\nBước 5: Nhận biên lai, chờ xử lý (thường 3-5 ngày làm việc)\nBước 6: Quay lại nhận hộ chiếu đã gia hạn visa",
    "Lưu ý quan trọng": "⚠️ Nên đến trước khi visa hết hạn ít nhất 3-7 ngày\n⚠️ Nếu đã quá hạn, cần giải trình và có thể bị phạt\n⚠️ Mang theo tiền mặt VND để đóng phí\n⚠️ Nhân viên có thể nói tiếng Indonesia và tiếng Anh\n⚠️ Trường hợp khẩn cấp, có thể xin xử lý nhanh (phụ phí thêm)"
  },
  "top_result": {
    "Ma": "LSQ_001",
    "Ten": "Tổng Lãnh sự quán Indonesia",
    "DiaChi": "18 Phùng Khắc Khoan, P. Đa Kao, Quận 1",
    "Lat": "10.7813",
    "Lng": "106.6953",
    "SDT": "02838251888",
    "Website": "https://www.kemlu.go.id/hochiminhcity",
    "Category": "LanhSuQuan",
    "raw_distance_km": 0.354,
    "distance_score": 1.0,
    "spec_score": 0.9,
    "spec_reason": "Địa điểm này là Lãnh sự quán của Indonesia",
    "total_score": 0.92
  }
}
```

---

---

## 🚀 Cách Chạy API

### 1️⃣ Cài Đặt Dependencies

```bash
pip install -r requirements.txt
```

### 2️⃣ Cấu Hình API Key

Tạo file `.env` và thêm:

```
GEMINI_API_KEY=your_api_key_here
```

### 3️⃣ Khởi Động Server

```bash
python main.py
```

Server sẽ chạy tại: `http://localhost:8000`

### 4️⃣ Test API

```bash
python test_api.py
```

---
