import os
import time
from dotenv import load_dotenv
import google.generativeai as genai

# --- TẢI API KEYS TỪ FILE .ENV MỘT CÁCH AN TOÀN ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- CẤU HÌNH ---
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-2.5-flash')
output_filename = "queries_list.txt"

def generate_ai_queries(field, district):
    """Sử dụng Gemini để sinh ra các từ khóa tìm kiếm liên quan."""
    print(f"🧠 [GEMINI] Đang tạo các từ khóa tăng cường cho '{field}' tại '{district}'...")
    try:
        prompt = f"""
        Tạo ra 4 cụm từ tìm kiếm đa dạng bằng tiếng Việt để tìm một cơ quan '{field}' tại '{district}, TPHCM' trên Google Maps.
        Chỉ trả về danh sách, mỗi cụm từ trên một dòng, không giải thích.
        """
        response = gemini_model.generate_content(prompt)
        keywords = [k.strip() for k in response.text.strip().split('\n') if k.strip()]
        print(f"✨ [GEMINI] Đã tạo: {keywords}")
        return keywords
    except Exception as e:
        print(f"❌ [GEMINI] Lỗi khi tạo từ khóa: {e}")
        return []

def main():
    """Hàm chính để tạo và lưu danh sách truy vấn ra file txt."""
    districts = ["Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10", "Quận 11", "Quận 12", "Quận Bình Tân", "Quận Bình Thạnh", "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú", "Thành phố Thủ Đức"]
    
    all_queries = []
    # 1. Các từ khóa CỐ ĐỊNH (cốt lõi)
    city_level_queries = ["Cục Quản lý Xuất nhập cảnh tại TPHCM", "Phòng Quản lý Xuất nhập cảnh Công an TPHCM", "Phòng Cảnh sát giao thông đường bộ - đường sắt TPHCM", "Sở Tư pháp TPHCM", "Danh sách Lãnh sự quán tại TPHCM", "Bệnh viện quốc tế tại TPHCM", "Bệnh viện công tại TPHCM"]
    all_queries.extend(city_level_queries)
    for district in districts:
        base_fields_for_district = [f"Công an {district}", f"Ủy ban nhân dân {district}", f"Trung tâm y tế {district}", f"Bệnh viện {district}", f"Đội Cảnh sát giao thông {district}", f"Đội Cảnh sát PCCC và CNCH {district}", f"Phòng công chứng {district}"]
        all_queries.extend(base_fields_for_district)
        
    # 2. Tăng cường bằng các từ khóa ĐỘNG từ Gemini AI
    print("\n--- Bắt đầu tăng cường từ khóa bằng Gemini AI ---")
    for district in districts:
        print(f"\n--- Tăng cường cho {district} ---")
        base_fields = ["Công an", "Ủy ban nhân dân", "Bệnh viện", "Đội Cảnh sát giao thông"]
        for field in base_fields:
            ai_queries = generate_ai_queries(field, district)
            all_queries.extend(ai_queries)
            time.sleep(1)

    # 3. Lưu toàn bộ danh sách ra file txt
    with open(output_filename, 'w', encoding='utf-8') as f:
        for query in all_queries:
            f.write(f"{query}\n")
            
    print(f"\n🎉 HOÀN TẤT! Đã tạo và lưu tổng cộng {len(all_queries)} từ khóa vào file '{output_filename}'.")

if __name__ == "__main__":
    main()