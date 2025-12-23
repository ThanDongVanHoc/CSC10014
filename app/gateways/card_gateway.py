import requests
import os
class CardGateway:
    def __init__(self):
        
        self.base_url = "http://localhost:8000"
        self.timeout = 5.0

    @staticmethod
    def get_card_info(self, payload: dict):
        """ Gửi yêu cầu lấy thông tin thẻ (Synchronous) """
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/medical-card/generate-compact",
                params=payload,
                timeout=self.timeout
            )
            # Tự động quăng lỗi nếu server thối (500, 404)
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"Lỗi kết nối Local Backend: {e}")
            return {"status": "error", "message": str(e)}
