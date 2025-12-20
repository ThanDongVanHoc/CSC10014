import requests

# Địa chỉ API của bạn
url = "http://127.0.0.1:8000/extract-medical-data"

# Đường dẫn đến file ảnh trên máy bạn
image_path = "test_ocr_model2.jpg"

with open(image_path, "rb") as f:
    # Gửi file với key là 'file' (phải trùng với tên biến trong FastAPI)
    files = {"file": f}
    response = requests.post(url, files=files)

print("Status Code:", response.status_code)
print("Kết quả JSON:")
print(response.json())