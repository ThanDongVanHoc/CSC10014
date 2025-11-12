# 📍 API Gợi Ý Địa Điểm  
**Location Recommendation Service**

Tài liệu này mô tả cách tích hợp và sử dụng API gợi ý địa điểm.  
Service nhận vào một câu truy vấn (query) + tọa độ GPS người dùng → trả về danh sách địa điểm liên quan đã được chấm điểm và xếp hạng.

---

## ✅ 1. Endpoint

| Thuộc tính | Giá trị |
|------------|--------|
| **URL**    | `http://<HOST>:8000/recommend` |
| **Method** | `POST` |

> `<HOST>` là IP server (VD: `127.0.0.1` chạy local, `192.168.1.10` chạy LAN).

---

## ✅ 2. Request Body

Request dạng `application/json`:

```json
{
  "query": "string",
  "lat": "float",
  "lng": "float"
}
````

| Trường  | Kiểu   | Bắt buộc | Mô tả                   |
| ------- | ------ | -------- | ----------------------- |
| `query` | string | ✔        | Câu truy vấn người dùng |
| `lat`   | float  | ✔        | Latitude                |
| `lng`   | float  | ✔        | Longitude               |

**Ví dụ:**

```json
{
  "query": "đĂNG KÍ TẠM TRÚ CHO NGƯỜI INDONESIA Ở TPHCM",
  "lat": 10.7803,
  "lng": 106.6925
}
```

---

## ✅ 3. Response (Thành công)

HTTP `200 OK`

```json
{
  "predicted_category": "string",
  "total_processing_time_ms": "integer",
  "results_count": "integer",
  "results": "array[object]"
}
```

### Ý nghĩa:

| Trường                     | Kiểu   | Mô tả                       |
| -------------------------- | ------ | --------------------------- |
| `predicted_category`       | string | Category model dự đoán      |
| `total_processing_time_ms` | int    | Tổng thời gian xử lý (ms)   |
| `results_count`            | int    | Số lượng địa điểm trả về    |
| `results`                  | array  | Danh sách địa điểm xếp hạng |

Mỗi item của `results` gồm các cột trong `corpus.csv` + các trường điểm:

| Trường mới        | Kiểu   | Mô tả                                              |
| ----------------- | ------ | -------------------------------------------------- |
| `raw_distance_km` | float  | Khoảng cách chim bay                               |
| `distance_score`  | float  | Điểm khoảng cách (0 → 1)                           |
| `spec_score`      | float  | Điểm specific (Gemini)                             |
| `spec_reason`     | string | Lý do chấm điểm                                    |
| `total_score`     | float  | Điểm cuối (ALPHA*spec_score + BETA*distance_score) |

### Ví dụ Response:

```json
{
  "predicted_category": "LanhSuQuan",
  "total_processing_time_ms": 12450,
  "results_count": 10,
  "results": [
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
      "spec_reason": "Địa điểm này là Lãnh sự quán của Indonesia, hoàn toàn khớp với yêu cầu 'người Indonesia' trong query.",
      "total_score": 0.92
    },
    {
      "Ma": "LSQ_012",
      "Ten": "Tổng Lãnh sự quán Malaysia",
      "DiaChi": "120 Nguyễn Đình Chiểu, P. Võ Thị Sáu, Quận 3",
      "Lat": "10.7818",
      "Lng": "106.6918",
      "SDT": "02838299023",
      "Website": "https://www.kln.gov.my/web/vnm_ho-chi-minh-city",
      "Category": "LanhSuQuan",
      "raw_distance_km": 0.187,
      "distance_score": 1.0,
      "spec_score": 0.1,
      "spec_reason": "Đây là Lãnh sự quán Malaysia, không liên quan đến 'Indonesia'.",
      "total_score": 0.28
    }
  ]
}
```

---

## ❌ 4. Response (Thất bại)

```json
{
  "detail": "string"
}
```

**Ví dụ:**

```json
{
  "detail": "Lỗi máy chủ nội bộ: Lỗi khi gọi Gemini API, rate limit."
}
```

---

## ✅ 5. Ví dụ gọi API bằng `curl`

```bash
curl -X 'POST' \
  'http://127.0.0.1:8000/recommend' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "Cần tìm Lãnh sự quán Mỹ gấp",
  "lat": 10.7769,
  "lng": 106.6952
}'
```

---

> © 2025 — Location Recommendation Service

