import pandas as pd # Bắt buộc phải import pandas để check NaN
from .models import Place, Hospital 
from deep_translator import GoogleTranslator
from sqlalchemy import select, and_
from sqlalchemy.sql import func
from app.db import db
from app.db.models import User

def poi_csv_to_db(record):
    query_kw = "other" 
    
    # Lấy dữ liệu (Lúc này dữ liệu đã được dịch ở bên ngoài rồi)
    name = record.get("Ten")
    location = record.get("Dia chi") # Đã là tiếng Anh
    lat = record.get("Lat")
    lng = record.get("Lng")
    img = record.get("Hinh anh")
    phone_number = record.get("So dien thoai")
    website = record.get("Website")
    intro = record.get("Loai")       # Đã là tiếng Anh
    original_kw = record.get("Tu khoa goc", "") 

    # Validate
    if pd.isna(location) or pd.isna(lat) or pd.isna(lng) or \
       pd.isna(img) or str(img).strip() == "Không có" or \
       pd.isna(intro):
        return None
    
    if pd.isna(phone_number) or str(phone_number).strip().lower() in ["không có", "nan", ""]:
        phone_number = None
    
    # Logic gán query_kw (Giữ nguyên)
    # Lưu ý: original_kw vẫn là tiếng Việt để check logic
    check_kw = str(original_kw).lower() if original_kw else ""
    
    if "phòng công chứng" in check_kw:
        query_kw = "notary-office"
    elif "lãnh sự quán" in check_kw:
        query_kw = "consulate"
    elif "bệnh viện" in check_kw:
        query_kw = "hospital"
    elif "ủy ban nhân dân" in check_kw:
        query_kw = "peoples-committee"
    elif "công an" in check_kw:
        query_kw = "police"
    elif "trung tâm y tế" in check_kw:
        query_kw = "medical-center"
    elif "cục ql xnc" in check_kw or "cục quản lý xuất nhập cảnh" in check_kw: 
        query_kw = "immigration-office"
        
    return Place(
        name=name,
        location=location,
        lat=lat,
        lng=lng,
        img=img,
        phone_number=phone_number,
        website=website,
        intro=intro,
        original_keyword=original_kw,
        query_kw=query_kw
    )


def process_hospital_data(record):
    """Đọc dòng Excel và chuyển thành Hospital Object"""
    
    name = record.get("Ten")
    lat = record.get("Lat")
    lng = record.get("Lng")

    # Validate cơ bản
    if pd.isna(name) or pd.isna(lat) or pd.isna(lng): 
        return None

    # Hàm làm sạch dữ liệu rác (nan, null, download...)
    def clean(val):
        if pd.isna(val): return None
        s = str(val).strip()
        if s.lower() in ["không có", "nan", "null", "download", ""]: return None
        return s

    # Xử lý query_kw
    orig_kw = record.get("Tu khoa goc", "")
    query_kw = "hospital"
    check = str(orig_kw).lower()
    
    if "đa khoa" in check: query_kw = "general"
    elif "phụ sản" in check: query_kw = "maternity"
    elif "nhi" in check: query_kw = "pediatric"
    elif "mắt" in check: query_kw = "eye"
    elif "răng" in check: query_kw = "dental"
    elif "thẩm mỹ" in check: query_kw = "cosmetic"

    return Hospital(
        source_id=record.get("Id"), # Cột ID gốc
        name=name,
        address=record.get("Dia chi"),
        categories=str(record.get("Loai")) if pd.notna(record.get("Loai")) else None,
        phone_number=clean(record.get("So dien thoai")),
        website=clean(record.get("Website")),
        lat=lat,
        lng=lng,
        image_url=clean(record.get("Link Anh Goc")),
        description=clean(record.get("Gioi thieu")),
        original_keyword=orig_kw,
        query_kw=query_kw
    )

def get_user(email):
    """
    Tìm user theo email.
    Trả về: User Object hoặc None nếu không tìm thấy.
    """
    stmt = select(User).where(User.email == email)
    return db.session.scalar(stmt)

