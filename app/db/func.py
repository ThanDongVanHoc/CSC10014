from .models import Place

def poi_csv_to_db(record):
    query_kw = "other" 
    
    name = record["Ten"]
    location = record["Dia chi"]
    lat = record["Lat"]
    lng = record["Lng"]
    original_kw = record["Tu khoa goc"]
    
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
        
    return Place(name=name,
                 location=location,
                 lat=lat,
                 lng=lng,
                 original_keyword=original_kw,
                 query_kw=query_kw)