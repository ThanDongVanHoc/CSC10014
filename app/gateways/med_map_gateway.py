import requests
import os

class HospitalGateway:
    def __init__(self):
        # Chạy local nên không cần API Key
        self.base_url = "http://localhost:8000"
        self.timeout = 5.0 

    def search_hospitals(self, payload: dict):
        """ Gửi yêu cầu tìm kiếm bệnh viện (Synchronous) """
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/hospitals/search",
                json=payload,
                timeout=self.timeout
            )
            # Tự động quăng lỗi nếu server thối (500, 404)
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"Lỗi kết nối Local Backend: {e}")
            return {"status": "error", "message": str(e)}