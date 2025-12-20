import pandas as pd # Bắt buộc phải import pandas để check NaN
from .models import Place
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