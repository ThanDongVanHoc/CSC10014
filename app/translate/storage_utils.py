import os
import cloudinary
import cloudinary.uploader
from urllib.parse import urlparse
from dotenv import load_dotenv 

load_dotenv()

cloudinary.config( 
    cloud_name = os.getenv("CLOUD_NAME"), 
    api_key = os.getenv("CLOUD_API_KEY"), 
    api_secret = os.getenv("CLOUD_API_SECRET"),
    secure = True
)

def delete_file_from_cloudinary(file_url):
    """Xóa 1 file cụ thể dựa trên URL đầy đủ."""
    if not file_url: return

    try:
        # Cắt URL: https://.../medical_logs/abc.mp3 -> medical_logs/abc
        parsed = urlparse(file_url)
        path = parsed.path
        parts = path.split('/')
        
        if "medical_logs" in parts:
            start_index = parts.index("medical_logs")
            # Ghép lại và bỏ đuôi mở rộng (.mp3)
            public_id = os.path.splitext("/".join(parts[start_index:]))[0]
            
            # Xóa trên Cloudinary (Audio thường tính là resource_type='video')
            cloudinary.uploader.destroy(public_id, resource_type="video")
            print(f"✅ Đã xóa file: {public_id}")
            
    except Exception as e:
        print(f"❌ Lỗi xóa file lẻ: {e}")
