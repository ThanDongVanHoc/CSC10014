import os
import csv
import time
import requests
import hashlib
from serpapi import GoogleSearch
from dotenv import load_dotenv

load_dotenv()
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

queries_filename = "queries_list.txt"
raw_filename = "raw_data_robust.csv"
image_folder = "downloaded_images" 

START_FROM_QUERY = 1

if not os.path.exists(image_folder):
    os.makedirs(image_folder)

def download_image(image_url):
    """Tải ảnh an toàn (Safe Download)."""
    if not image_url or not isinstance(image_url, str) or image_url == 'Không có':
        return 'Không có'
    try:
        filename = hashlib.md5(image_url.encode('utf-8')).hexdigest() + ".jpg"
        file_path = os.path.join(image_folder, filename)
        if os.path.exists(file_path):
            return file_path
        response = requests.get(image_url, stream=True, timeout=10)
        if response.status_code == 200:
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return file_path
    except:
        pass
    return 'Lỗi tải ảnh'

def clean_query_for_coords(query):
    """Làm sạch query khi dùng tọa độ (Mode 1)."""
    query_lower = query.lower()
    remove_phrases = ["tại tphcm", "ở tphcm", "tại hồ chí minh", "ở hồ chí minh", "tphcm", "hồ chí minh", "tp.hcm", "danh sách", "các", "những"]
    
    clean_q = query_lower
    for phrase in remove_phrases:
        clean_q = clean_q.replace(phrase, "")
    
    clean_q = clean_q.strip()
    return clean_q.title() if clean_q else query

def get_locations_robust(query, limit=20):
    original_query = query
    short_query = clean_query_for_coords(query)
    
    print(f"🔎 [SERPAPI] '{original_query}'")
    found_data = []

    # MODE 1
    print(f"   👉 Mode 1: Maps + Coordinates ('{short_query}')...")
    params = {
        "api_key": SERPAPI_API_KEY, 
        "engine": "google_maps", 
        "type": "search", 
        "q": short_query,
        "ll": "@10.762622,106.660172,13z",
        "hl": "vi", 
        "gl": "vn", 
        "num": str(limit)
    }
    try:
        search = GoogleSearch(params)
        results = search.get_dict()
        if "error" not in results and (results.get("local_results") or results.get("place_results")):
             data = parse_results(results, original_query, limit)
             if data:
                 print(f"      -> ✅ Mode 1 OK: {len(data)} item.")
                 return data
    except Exception as e:
        print(f"      -> Mode 1 Lỗi nhẹ: {e}")

    # MODE 2
    print(f"   👉 Mode 2: Maps Text Search (Full Query)...")
    params_mode2 = {
        "api_key": SERPAPI_API_KEY, 
        "engine": "google_maps", 
        "q": f"{original_query} Hồ Chí Minh",
        "hl": "vi", 
        "gl": "vn", 
        "num": str(limit)
    }
    try:
        search = GoogleSearch(params_mode2)
        results = search.get_dict()
        if "error" not in results and (results.get("local_results") or results.get("place_results")):
             data = parse_results(results, original_query, limit)
             if data:
                 print(f"      -> ✅ Mode 2 OK: {len(data)} item.")
                 return data
        elif "error" in results:
             print(f"      -> Mode 2 API Error: {results['error']}")
    except Exception as e:
        print(f"      -> Mode 2 Lỗi: {e}")

    # MODE 3
    print("   👉 Mode 3: Google Web Search (Knowledge Graph/Local Pack)...")
    params_web = {
        "api_key": SERPAPI_API_KEY,
        "engine": "google",
        "q": f"{original_query} Hồ Chí Minh",
        "hl": "vi",
        "gl": "vn"
    }
    try:
        search = GoogleSearch(params_web)
        results = search.get_dict()
        mode3_data = []

        kg = results.get("knowledge_graph", {})
        if kg:
            img_url = "Không có"
            header_imgs = kg.get("header_images")
            if header_imgs and isinstance(header_imgs, list) and len(header_imgs) > 0:
                first_img = header_imgs[0]
                if isinstance(first_img, dict):
                    img_url = first_img.get("image")
                elif isinstance(first_img, str):
                    img_url = first_img
            if img_url == "Không có":
                img_url = kg.get("image")

            mode3_data.append(create_item(
                kg.get("title"), kg.get("address"), kg.get("type"), 
                kg.get("phone"), img_url, kg.get("description"), 
                kg.get("website"), original_query
            ))

        local_pack = results.get("local_results", [])
        if local_pack and isinstance(local_pack, list):
            for item in local_pack:
                if isinstance(item, dict):
                    mode3_data.append(create_item(
                        item.get("title"), item.get("address"), item.get("type"), 
                        item.get("phone"), item.get("thumbnail"), item.get("description"), 
                        "", original_query
                    ))
        
        if mode3_data:
            print(f"      -> ✅ Mode 3 OK: {len(mode3_data)} item.")
            return mode3_data

    except Exception as e:
        print(f"      -> Mode 3 Exception: {e}")

    print("   -> 😢 Bó tay (Cả 3 mode đều thất bại).")
    return []

def create_item(ten, diachi, loai, sdt, anh, mota, web, query):
    local_img = download_image(anh) if anh else "Không có"
    return {
        'Ten': ten, 'Dia chi': diachi, 'Loai': loai, 'So dien thoai': sdt if sdt else "Không có",
        'Hinh anh': local_img, 'Link Anh Goc': anh, 'Gioi thieu': mota if mota else "Không có",
        'Website': web if web else "Không có", 'Lat': '', 'Lng': '', 'Tu khoa goc': query
    }

def parse_results(results, query, limit):
    local_results = results.get("local_results", [])
    if not local_results and results.get("place_results"):
        local_results = [results.get("place_results")]
    
    data = []
    for item in local_results[:limit]:
        try:
            if not isinstance(item, dict): continue
            
            img = item.get('thumbnail')
            if not img and 'photos' in item:
                photos = item.get('photos')
                if isinstance(photos, list) and len(photos) > 0:
                     if isinstance(photos[0], dict):
                        img = photos[0].get('image')

            data.append({
                'Ten': item.get('title'),
                'Dia chi': item.get('address'),
                'Loai': item.get('type'),
                'So dien thoai': item.get('phone', 'Không có'),
                'Hinh anh': download_image(img) if img else "Không có",
                'Link Anh Goc': img,
                'Gioi thieu': item.get('description', 'Không có'),
                'Website': item.get('website', 'Không có'),
                'Lat': item.get('gps_coordinates', {}).get('latitude', '') if item.get('gps_coordinates') else '',
                'Lng': item.get('gps_coordinates', {}).get('longitude', '') if item.get('gps_coordinates') else '',
                'Tu khoa goc': query
            })
        except:
            continue
    return data

def main():
    if not os.path.exists(queries_filename):
        print(f"❌ File '{queries_filename}' không tồn tại.")
        return
    
    with open(queries_filename, "r", encoding="utf-8") as f:
        queries = list(dict.fromkeys([line.strip() for line in f if line.strip()]))

    print(f"🚀 Tổng cộng {len(queries)} truy vấn.")
    print(f"⏭️  Sẽ bắt đầu chạy từ Query {START_FROM_QUERY}...")
    
    file_exists = os.path.exists(raw_filename)
    # Mở mode 'a' để ghi nối tiếp
    with open(raw_filename, 'a', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        if not file_exists:
            headers = ['Ten', 'Dia chi', 'Loai', 'So dien thoai', 'Hinh anh', 'Link Anh Goc', 'Gioi thieu', 'Website', 'Lat', 'Lng', 'Tu khoa goc']
            writer.writerow(headers)

    seen_entries = set()
    if os.path.exists(raw_filename):
        with open(raw_filename, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            next(reader, None)
            for row in reader:
                if len(row) > 1:
                    seen_entries.add((row[0], row[1])) 
    
    print(f"ℹ️ Đã load {len(seen_entries)} địa điểm cũ.")

    for i, query in enumerate(queries):
        # --- LOGIC BỎ QUA CÁC QUERY CŨ ---
        if (i + 1) < START_FROM_QUERY:
            continue
        # ---------------------------------

        print(f"\n--- Query {i+1}/{len(queries)} ---")
        results = get_locations_robust(query)
        
        if results:
            with open(raw_filename, 'a', newline='', encoding='utf-8-sig') as f:
                writer = csv.writer(f)
                count_new = 0
                count_dup = 0
                for item in results:
                    key = (item['Ten'], str(item['Dia chi']))
                    if key not in seen_entries:
                        seen_entries.add(key)
                        headers = ['Ten', 'Dia chi', 'Loai', 'So dien thoai', 'Hinh anh', 'Link Anh Goc', 'Gioi thieu', 'Website', 'Lat', 'Lng', 'Tu khoa goc']
                        writer.writerow([item.get(h) for h in headers])
                        count_new += 1
                    else:
                        count_dup += 1
                print(f"   -> 💾 Ghi mới: {count_new} | ♻️ Trùng: {count_dup}")
        
        time.sleep(1)

    print(f"\n🎉 XONG! File: '{raw_filename}'")

if __name__ == "__main__":
    main()