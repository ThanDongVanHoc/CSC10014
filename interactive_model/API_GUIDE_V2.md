# 📘 Hướng Dẫn Sử Dụng API V2 - Interactive Model

## 🆕 Thay Đổi Trong Phiên Bản V2

**Version 2.0** có các thay đổi sau:

- **Query Type 1** (`/query1`): ✅ **GIỮ NGUYÊN** như V1 - Thu thập thông tin tương tác
- **Query Type 2** (`/query2`): 🎉 **MỚI** - Trả về hướng dẫn cho **TẤT CẢ k địa điểm** thay vì chỉ top 1

---

## 📌 Tổng Quan

API này cung cấp 2 endpoint chính để thu thập thông tin từ người dùng và tạo hướng dẫn chi tiết:

- **Query Type 1** (`/query1`): Thu thập thông tin tương tác (giống V1)
- **Query Type 2** (`/query2`): Tạo hướng dẫn cho **TẤT CẢ** địa điểm từ kết quả Model A (khác V1)

**Base URL:** `http://localhost:8000`

---

## 🔹 Endpoint 2: `/query2` - Tạo Hướng Dẫn Cho TẤT CẢ Địa Điểm

### ✅ Mục Đích

Endpoint này nhận kết quả từ **Model A** (danh sách k địa điểm phù hợp) và tạo hướng dẫn chi tiết bằng ngôn ngữ của người dùng cho **TẤT CẢ k địa điểm** thay vì chỉ top 1.

### 🆕 Sự Khác Biệt So Với V1

| Phiên Bản | Hành Vi                                            |
| --------- | -------------------------------------------------- |
| **V1**    | Chỉ trả về guide cho địa điểm đứng đầu (top 1)     |
| **V2**    | Trả về guide cho **TẤT CẢ k địa điểm** trong input |

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

| Tham số          | Kiểu          | Bắt buộc | Mô tả                                                   |
| ---------------- | ------------- | -------- | ------------------------------------------------------- |
| `original_query` | string        | ✅       | Câu hỏi gốc của người dùng                              |
| `top_k_results`  | array[object] | ✅       | Danh sách k kết quả từ Model A (địa điểm được xếp hạng) |
| `collected_info` | object        | ✅       | Thông tin người dùng đã thu thập từ `/query1`           |

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
  "total_locations": 3,
  "guides": [
    {
      "location_info": {},
      "guide": {},
      "rank": 1
    }
  ]
}
```

#### 📋 Chi Tiết Response

| Trường            | Kiểu          | Mô tả                                                               |
| ----------------- | ------------- | ------------------------------------------------------------------- |
| `total_locations` | integer       | Tổng số địa điểm đã tạo guide                                       |
| `guides`          | array[object] | Danh sách guide cho từng địa điểm (theo thứ tự như `top_k_results`) |

#### 📋 Cấu Trúc Của Mỗi `guide` Object

```json
{
  "location_info": {
    // Thông tin địa điểm (giống như trong top_k_results)
  },
  "guide": {
    "Chuẩn bị": "string",
    "Giấy tờ cần thiết": "string",
    "Địa điểm và thời gian": "string",
    "Thủ tục": "string",
    "Lưu ý quan trọng": "string"
  },
  "rank": 1 // Thứ hạng của địa điểm (1 = top 1, 2 = top 2, ...)
}
```

_(Tên các phần trong guide sẽ tự động dịch sang ngôn ngữ của người dùng)_

---

### 📝 Ví Dụ Sử Dụng Query2 V2

#### **Ví Dụ: Tạo Hướng Dẫn Cho 3 Địa Điểm**

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
    },
    {
      "Ma": "XNC_001",
      "Ten": "Cục Quản lý Xuất nhập cảnh TP.HCM",
      "DiaChi": "161 Nguyễn Du, P. Bến Thành, Quận 1",
      "Lat": "10.7699",
      "Lng": "106.6905",
      "SDT": "02838299797",
      "Website": "https://xuatnhapcanh.gov.vn",
      "Category": "CucXuatNhapCanh",
      "raw_distance_km": 1.2,
      "distance_score": 0.85,
      "spec_score": 0.8,
      "spec_reason": "Cơ quan chính phủ phụ trách xuất nhập cảnh",
      "total_score": 0.82
    },
    {
      "Ma": "PH_001",
      "Ten": "UBND Phường Bến Nghé - Quận 1",
      "DiaChi": "138 Lê Thánh Tôn, P. Bến Nghé, Quận 1",
      "Lat": "10.7756",
      "Lng": "106.7014",
      "SDT": "02838222641",
      "Website": "http://www.quan1.hochiminhcity.gov.vn",
      "Category": "UyBanNhanDan",
      "raw_distance_km": 0.8,
      "distance_score": 0.9,
      "spec_score": 0.5,
      "spec_reason": "Có thể hỗ trợ thủ tục giấy tờ địa phương",
      "total_score": 0.68
    }
  ],
  "collected_info": {
    "nationality": "Indonesian",
    "problem_category": "Visa_Issue",
    "current_location": "District 1",
    "visa_type": "Tourist",
    "visa_expiry_status": "Expires in 3 days"
  }
}
```

**Response:**

```json
{
  "total_locations": 3,
  "guides": [
    {
      "location_info": {
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
      },
      "guide": {
        "Chuẩn bị": "- Hộ chiếu gốc (còn hạn ít nhất 6 tháng)\n- Visa hiện tại\n- Ảnh 4x6 (2 tấm, nền trắng)\n- Giấy xác nhận tạm trú/booking khách sạn\n- Vé máy bay về nước (nếu có)",
        "Giấy tờ cần thiết": "1. Hộ chiếu gốc + photocopy\n2. Form đơn xin gia hạn visa (tải tại website)\n3. Visa hiện tại (photocopy)\n4. Giấy xác nhận tạm trú từ khách sạn/chủ nhà\n5. Ảnh 4x6 (2 tấm)\n6. Phí gia hạn (khoảng 500,000 - 1,000,000 VND tùy loại visa)",
        "Địa điểm và thời gian": "📍 Địa chỉ: 18 Phùng Khắc Khoan, P. Đa Kao, Quận 1\n📞 Điện thoại: 02838251888\n🌐 Website: https://www.kemlu.go.id/hochiminhcity\n⏰ Giờ làm việc: Thứ 2-6, 8:30-12:00 & 13:30-16:30\n🚗 Cách đến: Taxi/Grab từ vị trí của bạn mất khoảng 5-10 phút",
        "Thủ tục": "Bước 1: Gọi điện hoặc email đặt lịch hẹn trước\nBước 2: Điền form đơn xin gia hạn (tải từ website)\nBước 3: Đến Lãnh sự quán vào giờ hẹn, mang đầy đủ giấy tờ\nBước 4: Nộp hồ sơ và đóng phí\nBước 5: Nhận biên lai, chờ xử lý (thường 3-5 ngày làm việc)\nBước 6: Quay lại nhận hộ chiếu đã gia hạn visa",
        "Lưu ý quan trọng": "⚠️ Nên đến trước khi visa hết hạn ít nhất 3-7 ngày\n⚠️ Nếu đã quá hạn, cần giải trình và có thể bị phạt\n⚠️ Mang theo tiền mặt VND để đóng phí\n⚠️ Nhân viên có thể nói tiếng Indonesia và tiếng Anh\n⚠️ Trường hợp khẩn cấp, có thể xin xử lý nhanh (phụ phí thêm)"
      },
      "rank": 1
    },
    {
      "location_info": {
        "Ma": "XNC_001",
        "Ten": "Cục Quản lý Xuất nhập cảnh TP.HCM",
        "DiaChi": "161 Nguyễn Du, P. Bến Thành, Quận 1",
        "Lat": "10.7699",
        "Lng": "106.6905",
        "SDT": "02838299797",
        "Website": "https://xuatnhapcanh.gov.vn",
        "Category": "CucXuatNhapCanh",
        "raw_distance_km": 1.2,
        "distance_score": 0.85,
        "spec_score": 0.8,
        "spec_reason": "Cơ quan chính phủ phụ trách xuất nhập cảnh",
        "total_score": 0.82
      },
      "guide": {
        "Chuẩn bị": "- Hộ chiếu gốc và bản sao có công chứng\n- Giấy tờ chứng minh lý do gia hạn\n- Ảnh 4x6 (4 tấm, nền trắng)\n- Giấy xác nhận tạm trú có xác nhận công an phường\n- Phí gia hạn visa",
        "Giấy tờ cần thiết": "1. Hộ chiếu + photocopy công chứng\n2. Visa hiện tại + photocopy\n3. Form NA17 (đơn xin gia hạn visa)\n4. Giấy xác nhận tạm trú (có dấu công an)\n5. Ảnh 4x6 (4 tấm)\n6. Giấy tờ chứng minh lý do gia hạn (hợp đồng lao động, thư mời, v.v.)\n7. Phí: 25 USD - 135 USD tùy loại visa và thời hạn",
        "Địa điểm và thời gian": "📍 Địa chỉ: 161 Nguyễn Du, P. Bến Thành, Quận 1\n📞 Điện thoại: 02838299797\n🌐 Website: https://xuatnhapcanh.gov.vn\n⏰ Giờ làm việc: Thứ 2-6, 7:30-11:30 & 13:00-17:00\n🚗 Cách đến: Xe buýt 03, 36 hoặc Grab/Taxi",
        "Thủ tục": "Bước 1: Kiểm tra website để xem điều kiện gia hạn\nBước 2: Chuẩn bị hồ sơ đầy đủ theo yêu cầu\nBước 3: Đến Cục Quản lý Xuất nhập cảnh trong giờ làm việc\nBước 4: Lấy số thứ tự và chờ gọi\nBước 5: Nộp hồ sơ tại quầy và đóng phí\nBước 6: Nhận biên lai, thời gian xử lý: 5-7 ngày làm việc\nBước 7: Quay lại nhận kết quả theo ngày hẹn",
        "Lưu ý quan trọng": "⚠️ Cần đến trước giờ đóng cửa ít nhất 1 giờ\n⚠️ Phải có giấy xác nhận tạm trú hợp lệ từ công an phường\n⚠️ Nên có thông dịch viên nếu không nói được tiếng Việt\n⚠️ Đối với người Indonesia: cần kiểm tra thỏa thuận song phương Việt-Indonesia\n⚠️ Có dịch vụ xử lý nhanh (1-3 ngày) với phụ phí cao hơn"
      },
      "rank": 2
    },
    {
      "location_info": {
        "Ma": "PH_001",
        "Ten": "UBND Phường Bến Nghé - Quận 1",
        "DiaChi": "138 Lê Thánh Tôn, P. Bến Nghé, Quận 1",
        "Lat": "10.7756",
        "Lng": "106.7014",
        "SDT": "02838222641",
        "Website": "http://www.quan1.hochiminhcity.gov.vn",
        "Category": "UyBanNhanDan",
        "raw_distance_km": 0.8,
        "distance_score": 0.9,
        "spec_score": 0.5,
        "spec_reason": "Có thể hỗ trợ thủ tục giấy tờ địa phương",
        "total_score": 0.68
      },
      "guide": {
        "Chuẩn bị": "- UBND Phường không trực tiếp xử lý gia hạn visa\n- Họ chỉ cấp giấy xác nhận tạm trú (cần thiết cho hồ sơ gia hạn)\n- Chuẩn bị: Hộ chiếu, visa hiện tại, hợp đồng thuê nhà",
        "Giấy tờ cần thiết": "Để xin giấy xác nhận tạm trú:\n1. Hộ chiếu + photocopy\n2. Visa hiện tại + photocopy\n3. Hợp đồng thuê nhà/giấy chứng nhận lưu trú từ khách sạn\n4. Đơn đề nghị xác nhận tạm trú (mẫu có tại UBND)\n5. Phí hành chính (khoảng 50,000 VND)",
        "Địa điểm và thời gian": "📍 Địa chỉ: 138 Lê Thánh Tôn, P. Bến Nghé, Quận 1\n📞 Điện thoại: 02838222641\n🌐 Website: http://www.quan1.hochiminhcity.gov.vn\n⏰ Giờ làm việc: Thứ 2-6, 7:30-11:30 & 13:00-16:30\n🚗 Cách đến: Gần chợ Bến Thành, đi bộ hoặc Grab",
        "Thủ tục": "Để lấy giấy xác nhận tạm trú (dùng cho hồ sơ gia hạn visa):\nBước 1: Đến bộ phận tiếp nhận hồ sơ\nBước 2: Điền form đề nghị xác nhận tạm trú\nBước 3: Nộp hồ sơ và đóng phí\nBước 4: Nhận biên lai\nBước 5: Quay lại sau 1-2 ngày để nhận giấy xác nhận\nBước 6: Mang giấy này đến Lãnh sự quán hoặc Cục Xuất nhập cảnh để gia hạn visa",
        "Lưu ý quan trọng": "⚠️ UBND Phường KHÔNG trực tiếp xử lý gia hạn visa\n⚠️ Họ chỉ cấp giấy xác nhận tạm trú (1 trong những giấy tờ cần thiết)\n⚠️ Để gia hạn visa Indonesia, bạn NÊN đến Lãnh sự quán Indonesia (địa điểm đầu tiên)\n⚠️ Hoặc đến Cục Quản lý Xuất nhập cảnh nếu cần gia hạn qua cơ quan chính phủ Việt Nam\n⚠️ Nên có người dịch vì nhân viên ít nói tiếng Anh"
      },
      "rank": 3
    }
  ]
}
```

---

## 📊 So Sánh V1 vs V2

| Feature           | V1                                | V2                                                 |
| ----------------- | --------------------------------- | -------------------------------------------------- |
| **Query1**        | Thu thập thông tin                | ✅ Giống V1                                        |
| **Query2 Input**  | `top_k_results` (list)            | ✅ Giống V1                                        |
| **Query2 Logic**  | Chỉ xử lý `top_k_results[0]`      | 🆕 Xử lý **TẤT CẢ** phần tử trong `top_k_results`  |
| **Query2 Output** | `guide` (1 object) + `top_result` | 🆕 `guides` (array of objects) + `total_locations` |

---

## 🚀 Cách Chạy API V2

### 1️⃣ Cài Đặt Dependencies

```bash
pip install -r requirements.txt
```

### 2️⃣ Cấu Hình API Key

Tạo file `.env` và thêm:

```
GEMINI_API_KEY=your_api_key_here
```

### 3️⃣ Khởi Động Server V2

```bash
python main_v2.py
```

Server sẽ chạy tại: `http://localhost:8000`

### 4️⃣ Test API V2

```bash
python test_api_v2.py
```

---

## 📌 Lưu Ý Quan Trọng

### ⚡ Hiệu Suất

- V2 sẽ mất nhiều thời gian hơn V1 vì phải tạo guide cho nhiều địa điểm
- Thời gian xử lý tỷ lệ thuận với số lượng địa điểm trong `top_k_results`
- Ví dụ: 3 địa điểm ≈ 3x thời gian so với 1 địa điểm

### 💡 Khuyến Nghị Sử Dụng

- **Dùng V1** nếu: Chỉ cần guide cho địa điểm tốt nhất
- **Dùng V2** nếu: Muốn so sánh guide của nhiều địa điểm để chọn phù hợp nhất

### 🔄 Tương Thích

- Frontend/Client có thể dùng cả V1 và V2
- Request format giống nhau, chỉ khác response structure
- Có thể chạy cả `main.py` (V1) và `main_v2.py` (V2) trên các port khác nhau

---
