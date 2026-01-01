import requests
import os
class CardGateway:
    def __init__(self):
        
        self.base_url = "http://localhost:8000"
        self.timeout = 100.0

    def get_card_info(self, payload):
        """ Gửi yêu cầu lấy thông tin thẻ (Synchronous) """
        print(payload)
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/medical-card/generate-compact",
                json=payload,  # THAY params= BẰNG json=
                timeout=self.timeout
            )
            # Tự động quăng lỗi nếu server thối (500, 404)
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"Lỗi kết nối Local Backend: {e}")
            return {"status": "error", "message": str(e)}
