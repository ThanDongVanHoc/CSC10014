import os
import csv
import time
import pandas as pd
from dotenv import load_dotenv
from serpapi import GoogleSearch

# --- TẢI API KEY TỪ FILE .ENV ---
load_dotenv()
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")
queries_filename = "queries_list.txt" # File chứa danh sách query

def get_locations(query, location="Ho Chi Minh City, Vietnam", limit=15):
    """Sử dụng SerpApi để lấy địa điểm từ Google Maps."""
    print(f"🔎 [SERPAPI] Đang tìm kiếm: '{query}'...")
    params = {"api_key": SERPAPI_API_KEY, "engine": "google_maps", "q": query, "location": location, "hl": "vi", "gl": "vn", "num": "20"}
    try:
        search = GoogleSearch(params)
        results = search.get_dict()
        local_results = results.get("local_results", [])
        if not local_results:
            print("-> Không tìm thấy kết quả.")
            return []
        found_data = [{'Ten': item.get('title'), 'Dia chi': str(item.get('address')), 'Loai': item.get('type'),
                       'Lat': item.get('gps_coordinates', {}).get('latitude'), 'Lng': item.get('gps_coordinates', {}).get('longitude'),
                       'Tu khoa goc': query} for item in local_results[:limit]]
        print(f"-> Tìm thấy {len(found_data)} kết quả.")
        return found_data
    except Exception as e:
        print(f"❌ [SERPAPI] Lỗi khi tìm kiếm: {e}")
        return []

def main():
    """Hàm chính thực thi crawler bằng cách đọc query từ file."""
    
    # --- KHỞI TẠO CÁC FILE CSV VÀ CẤU TRÚC DỮ LIỆU ---
    raw_filename = "raw_data_realtime.csv"
    filtered_filename = "filtered_data_realtime.csv"
    headers = ['Ten', 'Dia chi', 'Loai', 'Lat', 'Lng', 'Tu khoa goc']
    
    with open(raw_filename, 'w', newline='', encoding='utf-8-sig') as f:
        csv.writer(f).writerow(headers)
    with open(filtered_filename, 'w', newline='', encoding='utf-8-sig') as f:
        csv.writer(f).writerow(headers)

    seen_entries = set()

    # --- ĐỌC DANH SÁCH QUERY TỪ FILE TXT ---
    try:
        with open(queries_filename, 'r', encoding='utf-8') as f:
            all_queries = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"❌ Lỗi: Không tìm thấy file '{queries_filename}'. Vui lòng chạy script generate_queries.py trước.")
        return

    # Giữ lại các danh sách cố định để dùng cho logic lọc
    districts = ["Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10", "Quận 11", "Quận 12", "Quận Bình Tân", "Quận Bình Thạnh", "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú", "Thành phố Thủ Đức"]
    city_level_queries = ["Cục Quản lý Xuất nhập cảnh tại TPHCM", "Phòng Quản lý Xuất nhập cảnh Công an TPHCM", "Phòng Cảnh sát giao thông đường bộ - đường sắt TPHCM", "Sở Tư pháp TPHCM", "Danh sách Lãnh sự quán tại TPHCM", "Bệnh viện quốc tế tại TPHCM", "Bệnh viện công tại TPHCM"]

    # --- BẮT ĐẦU QUÉT VÀ GHI REAL-TIME ---
    print(f"🚀 Bắt đầu quét từ file cho {len(all_queries)} từ khóa...")
    
    for query in all_queries:
        results = get_locations(query)
        
        if not results:
            time.sleep(1)
            print("-" * 25)
            continue

        with open(raw_filename, 'a', newline='', encoding='utf-8-sig') as f_raw, \
             open(filtered_filename, 'a', newline='', encoding='utf-8-sig') as f_filtered:
            
            raw_writer = csv.writer(f_raw)
            filtered_writer = csv.writer(f_filtered)

            for item in results:
                entry_key = (item['Ten'], item['Dia chi'])
                if entry_key not in seen_entries:
                    seen_entries.add(entry_key)
                    row_to_write = [item.get(h) for h in headers]
                    raw_writer.writerow(row_to_write)
                    
                    is_relevant = False
                    if query in city_level_queries:
                        is_relevant = True
                    else:
                        for district in districts:
                            if district in query and district in item['Dia chi']:
                                is_relevant = True
                                break
                    
                    if is_relevant:
                        filtered_writer.writerow(row_to_write)

        time.sleep(1.5)
        print("-" * 25)

    print(f"\n🎉 HOÀN TẤT! Đã thu thập và lưu real-time được {len(seen_entries)} địa điểm duy nhất.")
    print(f"-> Dữ liệu thô được lưu tại: '{raw_filename}'")
    print(f"-> Dữ liệu đã lọc được lưu tại: '{filtered_filename}'")

if __name__ == "__main__":
    main()