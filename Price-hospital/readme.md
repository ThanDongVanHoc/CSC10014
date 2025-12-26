# 🏥 Hospital Price Search System (Hệ thống Tra cứu Giá Viện phí)

Dự án cung cấp API và giao diện để tra cứu, so sánh giá dịch vụ kỹ thuật tại các bệnh viện (dữ liệu từ các file CSV).

## 🔧 Hướng dẫn Backend (FastAPI)

Backend được viết bằng Python sử dụng framework FastAPI để xử lý dữ liệu từ CSV với tốc độ cao.

### 1. Yêu cầu hệ thống

- Python 3.8 trở lên.

### 2. Cài đặt môi trường

Mở terminal tại thư mục `backend` và thực hiện các bước sau:

<!-- **Bước 1: Tạo môi trường ảo (Khuyên dùng)**

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# MacOS/Linux
python3 -m venv venv
source venv/bin/activate

``` -->

**Bước 2: Cài đặt thư viện**

```bash
pip install -r requirements.txt
```

_(Nếu chưa có file `requirements.txt`, nội dung file nằm ở cuối tài liệu này)_

### 3. Khởi chạy Server

```bash
python main.py
```

Sau khi chạy thành công, server sẽ lắng nghe tại: `http://127.0.0.1:8000`

### 4. Tài liệu API (Swagger UI)

Truy cập **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)** để xem hướng dẫn chi tiết và test thử API trực tiếp.

---

## 💻 Hướng dẫn Frontend (Integration)

### Thông tin kết nối

- **Base URL:** `http://127.0.0.1:8000`
- **Format:** JSON

### Các Endpoints chính

#### 1. Lấy danh sách giá dịch vụ (Search & Filter)

**Endpoint:** `GET /services`

| Tham số         | Kiểu   | Bắt buộc | Mô tả                                            |
| --------------- | ------ | -------- | ------------------------------------------------ |
| `q`             | string | Không    | Từ khóa tìm kiếm dịch vụ (VD: "khám", "siêu âm") |
| `hospital_name` | string | Không    | Tên bệnh viện (VD: "Chợ Rẫy", "115")             |
| `min_price`     | int    | Không    | Giá thấp nhất                                    |
| `max_price`     | int    | Không    | Giá cao nhất                                     |
| `skip`          | int    | Không    | Số lượng bỏ qua (Phân trang). Mặc định: 0        |
| `limit`         | int    | Không    | Số lượng lấy về. Mặc định: 20                    |

**Ví dụ Request:**

```http
GET /services?q=ph%E1%BA%ABu&hospital_name=ch%E1%BB%A3%20r%E1%BA%ABy&skip=0&limit=1000 HTTP/1.1
```

**Ví dụ Response:**

```json
{
  "total": 297,
  "data": [
    {
      "hospital_id": "1913d55b",
      "hospital_name": "Bệnh viện Chợ Rẫy",
      "service_name": "Phẫu thuật kết hợp xương điều trị gãy xương gò má bằng chỉ thép",
      "price": 7391000
    },
    {
      "hospital_id": "1913d55b",
      "hospital_name": "Bệnh viện Chợ Rẫy",
      "service_name": "Phẫu thuật kết hợp xương điều trị gãy xương gò má bằng nẹp vít hợp kim",
      "price": 6948000
    },
    ...
  ]
}

```

#### 2. Lấy danh sách bệnh viện

**Endpoint:** `GET /hospitals`
Dùng để đổ dữ liệu vào `Dropdown` hoặc `Select box` chọn bệnh viện.

---

## 📝 Quản lý Dữ liệu (Dành cho Admin)

Dữ liệu được lưu trong thư mục `data/`.

1. **Thêm bệnh viện mới:**

- Đặt tên file CSV là mã ID của bệnh viện (ví dụ: `abc12345.csv`).
- File phải có 2 cột chính: `Ten dich vu`, `Gia (VND)`.

2. **Cập nhật thông tin bệnh viện:**

- Mở file `data_benhvien_hcm.csv`.
- Thêm dòng mới chứa `Id` (trùng tên file CSV) và `Ten` (Tên hiển thị).

---
