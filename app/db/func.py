import pandas as pd # Bắt buộc phải import pandas để check NaN
from .models import Place, Hospital 
from deep_translator import GoogleTranslator

def poi_csv_to_db(record):
    translator = GoogleTranslator(source='auto', target='en')
    query_kw = "other" 

    # Lấy dữ liệu
    name = record.get("Ten")
    location = record.get("Dia chi")
    lat = record.get("Lat")
    lng = record.get("Lng")
    img = record.get("Hinh anh")
    phone_number = record.get("So dien thoai")
    website = record.get("Website")
    intro = record.get("Loai")
    original_kw = record.get("Tu khoa goc", "") 

    if pd.isna(location) or pd.isna(lat) or pd.isna(lng) or \
       pd.isna(img) or str(img).strip() == "Không có" or \
       pd.isna(intro):
        
        return None
    
    if pd.isna(phone_number) or str(phone_number).strip().lower() in ["không có", "nan", ""]:
        phone_number = None
    
    try:
        if location:
            location = translator.translate(str(location))
        if intro:
            intro = translator.translate(str(intro))
            
    except Exception as e:
        print(f"Lỗi dịch thuật tại {name}: {e}")
        
    # Logic gán query_kw
    if "Phòng công chứng" in original_kw:
        query_kw = "notary-office"
    elif "Lãnh sự quán" in original_kw:
        query_kw = "consulate"
    elif "Bệnh viện" in original_kw:
        query_kw = "hospital"
    elif "Ủy ban nhân dân" in original_kw:
        query_kw = "peoples-committee"
    elif "Công an" in original_kw:
        query_kw = "police"
    elif "Trung tâm y tế" in original_kw:
        query_kw = "medical-center"
    elif "Cục QL XNC" in original_kw or "Cục Quản lý Xuất nhập cảnh" in original_kw: 
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