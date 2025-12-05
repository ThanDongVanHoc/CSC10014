# inference.py
import torch
import os
import json
import re
import csv
import math
import time


# Thư viện cho Gemini API
from dotenv import load_dotenv
import google.generativeai as genai
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline

# ----------------- CẤU HÌNH CỤC BỘ -----------------
MODEL_DIR = "final3"
CORPUS_FILE = "corpus.csv"
CORPUS_DATA = []

# Cấu hình trọng số (Alpha >> Beta)
ALPHA = 0.8 # Trọng số cho Specific Score
BETA = 0.2  # Trọng số cho Distance Score

# CẤU HÌNH MỚI CHO BATCHING
GEMINI_BATCH_SIZE = 20      # Số lượng địa điểm xử lý trong MỘT lần gọi API
GEMINI_SLEEP_PER_BATCH = 3  # Thời gian nghỉ (giây) giữa các batch để tránh rate limit
# ---------------------------------------------------

# ----------------- CẤU HÌNH API GEMINI -----------------
load_dotenv()
GEMINI_API_KEY = 'AIzaSyCpnWjIB6fQvEAj_UAh3Ob8nITX05ykU0s' # Lưu ý: API Key của bạn bị lộ, nên thu hồi
gemini_model = None

if GEMINI_API_KEY:
    # Cảnh báo về việc lộ key
    print("[!] CẢNH BÁO: API Key đang bị hardcode. Hãy thu hồi key này và sử dụng .env an toàn hơn.")
    try:
        # Cấu hình Gemini API
        genai.configure(api_key=GEMINI_API_KEY)
        # Sử dụng model nhanh và hiệu quả cho tác vụ trích xuất/chấm điểm
        gemini_model = genai.GenerativeModel('gemini-2.5-flash') # Đã cập nhật lên 1.5-flash cho hiệu quả
        print("[*] Cấu hình Gemini API thành công (model: gemini-1.5-flash).")
    except Exception as e:
        print(f"[!] LỖI CẤU HÌNH GEMINI: {e}. Vui lòng kiểm tra thư viện.")
else:
    print("[!] CẢNH BÁO: Không tìm thấy GEMINI_API_KEY. Hệ thống Specific Score sẽ bị vô hiệu hóa.")

# ----------------- CẤU HÌNH MÔ HÌNH CATEGORY -----------------

try:
    print(f"[*] Đang tải mô hình phân loại từ thư mục: {MODEL_DIR}...")
    classifier = pipeline(
        "text-classification", 
        model=MODEL_DIR, 
        tokenizer=MODEL_DIR
    )
    print("[*] Tải mô hình thành công.")
except Exception as e:
    print(f"[!] LỖI TẢI MÔ HÌNH: {e}")
    classifier = None

def get_prediction(text: str):
    """Thực hiện dự đoán trên một đoạn văn bản đầu vào."""
    if not classifier:
        return {"error": "Mô hình chưa được tải thành công."}
    
    if not text or not isinstance(text, str):
        return {"error": "Đầu vào không hợp lệ."}

    try:
        result = classifier(text)[0]
        return {
            "label": result['label'],
            "score": result['score']
        }
    except Exception as e:
        return {"error": f"Lỗi trong quá trình dự đoán: {e}"}

# ==================================================
# === CÁC HÀM XỬ LÝ DỮ LIỆU VÀ KHOẢNG CÁCH ===
# ==================================================

def load_corpus(csv_file: str = CORPUS_FILE):
    """Tải dữ liệu từ file corpus.csv vào biến toàn cục CORPUS_DATA."""
    global CORPUS_DATA
    try:
        # Xử lý BOM với utf-8-sig
        with open(csv_file, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            CORPUS_DATA = list(reader)
        print(f"\n[*] Tải thành công {len(CORPUS_DATA)} địa điểm từ {csv_file}.")
    except FileNotFoundError:
        print(f"[!] LỖI: Không tìm thấy file corpus: {csv_file}")
        CORPUS_DATA = []
    except Exception as e:
        print(f"[!] LỖI KHI ĐỌC FILE CSV: {e}")
        CORPUS_DATA = []

def calculate_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách Haversine (đường chim bay) giữa 2 điểm GPS. Trả về khoảng cách bằng km."""
    R = 6371  # Bán kính Trái Đất (km)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def FilterByCate(category_label: str) -> list:
    """Lọc danh sách địa điểm từ CORPUS_DATA dựa trên category_label."""
    if not CORPUS_DATA:
        return []
    
    # Do tên cột trong CSV khớp với label, ta dùng trực tiếp
    filtered_list = []
    for location in CORPUS_DATA:
        if location.get(category_label) == '1':
            filtered_list.append(location.copy()) 
            
    return filtered_list

def Evaluate_Distance(user_lat: float, user_lng: float, locations_list: list) -> list:
    """Chấm điểm distance (Dis_i) cho mỗi địa điểm trong list [0, 1]."""
    if not locations_list:
        return []

    scored_locations = []
    distances = []

    for loc in locations_list:
        try:
            loc_lat = float(loc['Lat'])
            loc_lng = float(loc['Lng'])
            distance_km = calculate_haversine(user_lat, user_lng, loc_lat, loc_lng)
            loc['raw_distance_km'] = distance_km
            distances.append(distance_km)
            scored_locations.append(loc)
        except (ValueError, TypeError):
            pass # Bỏ qua các hàng bị lỗi tọa độ
    
    if not distances:
        return []

    min_dist = min(distances)
    max_dist = max(distances)

    if min_dist == max_dist:
        for loc in scored_locations:
            loc['distance_score'] = 1.0
    else:
        for loc in scored_locations:
            score = (max_dist - loc['raw_distance_km']) / (max_dist - min_dist)
            loc['distance_score'] = score
            
    return scored_locations


# ==================================================
# === HÀM CHẤM ĐIỂM SPECIFIC (GEMINI BATCH ZERO-SHOT) ===
# ==================================================

# ==================================================
# === HÀM CHẤM ĐIỂM SPECIFIC (GEMINI BATCH ZERO-SHOT) ===
# ==================================================

def gemini_batch_score(query: str, category_label: str, locations_for_prompt: list) -> list:
    """
    Chấm điểm Specific cho một BATCH các địa điểm bằng một lệnh gọi API duy nhất.
    locations_for_prompt: list các dict, ví dụ: [{"temp_id": 0, "name": "Lãnh sự quán A"}, ...]
    """
    
    # Fallback nếu model không load được
    if not gemini_model:
        return [{"id": loc['temp_id'], "score": 0.5, "reason": "API not loaded"} for loc in locations_for_prompt]

    # Chuyển danh sách địa điểm thành một chuỗi JSON để đưa vào prompt
    locations_json_string = json.dumps(locations_for_prompt, ensure_ascii=False, indent=2)
    
    # --- PROMPT ĐÃ ĐƯỢC CẢI TIẾN (YÊU CẦU CÓ "REASON") ---
    prompt = f"""
Bạn là một hệ thống AI chuyên đánh giá độ phù hợp (relevance) của các địa điểm.

[NHIỆM VỤ]
Đánh giá TỪNG địa điểm trong [DANH SÁCH ĐỊA ĐIỂM] dựa trên [YÊU CẦU (QUERY)] của người dùng.
Tất cả địa điểm này đều thuộc Bối cảnh (Category) chung là: "{category_label}".

[YÊU CẦU (QUERY)]
"{query}"

[DANH SÁCH ĐỊA ĐIỂM CẦN CHẤM ĐIỂM]
{locations_json_string}

[QUY TẮC ĐÁNH GIÁ]
1. Phân tích QUERY để tìm các yếu tố then chốt (ví dụ: quốc tịch, tên riêng, chức năng).
2. Với MỖI địa điểm trong danh sách, so sánh "name" của nó với các yếu tố then chốt.
3. Cho điểm từ 0.0 (không liên quan) đến 1.0 (rất liên quan).
   - 1.0: Khớp trực tiếp (ví dụ: query "người Indo" và tên "Lãnh sự quán Indonesia").
   - 0.5: Liên quan chung (ví dụ: query "người Indo" và tên "Lãnh sự quán Thái Lan").
   - 0.1: Không liên quan.
4. Cung cấp một "reason" (lý do) RẤT NGẮN GỌN (tối đa 10 từ) giải thích tại sao bạn cho điểm đó.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC]
Chỉ trả lời bằng một DANH SÁCH JSON (JSON list). Mỗi đối tượng trong danh sách phải có 3 key: 
1. "id" (giống 'temp_id' đầu vào)
2. "score" (điểm số bạn chấm)
3. "reason" (lý do) 

[VÍ DỤ ĐỊNH DẠNG TRẢ VỀ]
[
  {{"id": 0, "score": 0.9, "reason": "Khớp quốc gia Indonesia"}},
  {{"id": 1, "score": 0.2, "reason": "Sai quốc gia (Thái Lan)"}}
]

BẮT ĐẦU:
"""
    # --------------------------------------------------

    try:
        response = gemini_model.generate_content(prompt)
        text = response.text.strip()
        print(f"[DEBUG GEMINI BATCH RESPONSE] {text}")

        # Dọn dẹp ký tự markdown (```json ... ```) nếu Gemini trả về
        text = re.sub(r'```json\n?|```', '', text)
        
        # Parse danh sách JSON
        data = json.loads(text)
        
        if isinstance(data, list):
            return data
        else:
            print("[Gemini] Lỗi: API không trả về một danh sách JSON. Trả về 0.5 cho batch.")
            return [{"id": loc['temp_id'], "score": 0.5, "reason": "Lỗi định dạng API"} for loc in locations_for_prompt]

    except Exception as e:
        print(f"[Gemini] Lỗi API hoặc JSON parse: {e}")
        # Fallback khi lỗi: trả về điểm 0.5 cho tất cả địa điểm trong batch này
        return [{"id": loc['temp_id'], "score": 0.5, "reason": "Lỗi API/JSON"} for loc in locations_for_prompt]

def Evaluate_Specific(query: str, category_label: str, locations_list: list) -> list:
    """
    Chấm điểm specific (Spec_i) cho mỗi địa điểm bằng Gemini Batch Zero-Shot.
    """
    print(f"\n[Flow 4] Đang chấm điểm Specific (Spec_i) cho {len(locations_list)} địa điểm (theo batch)...")
    
    if not gemini_model:
        print("[Flow 4] API Gemini không khả dụng. Gán Spec_i = 1.0 (chỉ dựa vào khoảng cách).")
        for loc in locations_list:
            loc['spec_score'] = 1.0
            loc['spec_reason'] = "API không khả dụng"
        return locations_list
        
    # Lặp qua danh sách địa điểm theo từng BATCH
    total_batches = math.ceil(len(locations_list) / GEMINI_BATCH_SIZE)
    
    for i in range(0, len(locations_list), GEMINI_BATCH_SIZE):
        # 1. Lấy batch hiện tại (đây là một slice của list gốc)
        batch_locations_slice = locations_list[i:i + GEMINI_BATCH_SIZE]
        
        # 2. Tạo danh sách đầu vào cho prompt (chỉ chứa thông tin cần thiết)
        batch_for_prompt = []
        for j, loc in enumerate(batch_locations_slice):
            batch_for_prompt.append({
                "temp_id": j, 
                "name": loc.get("Ten", "")
            })

        print(f"  -> Đang xử lý batch {i//GEMINI_BATCH_SIZE + 1}/{total_batches} (size: {len(batch_locations_slice)})")

        # 3. Gọi API cho toàn bộ batch
        score_results = gemini_batch_score(query, category_label, batch_for_prompt)
        
        # 4. Map kết quả điểm số trở lại list gốc
        if len(score_results) != len(batch_locations_slice):
            print(f"  [!] LỖI: Số lượng điểm trả về ({len(score_results)}) không khớp với batch size ({len(batch_locations_slice)}). Gán 0.5.")
            for loc in batch_locations_slice:
                loc['spec_score'] = 0.5
                loc['spec_reason'] = "Lỗi khớp batch"
        else:
            for result in score_results:
                temp_id = result.get("id", -1)
                score = result.get("score", 0.5)
                # LẤY THÊM REASON
                reason = result.get("reason", "Không có lý do") 
                
                if 0 <= temp_id < len(batch_locations_slice):
                    # Gán điểm VÀ LÝ DO vào list gốc
                    batch_locations_slice[temp_id]['spec_score'] = score
                    batch_locations_slice[temp_id]['spec_reason'] = reason
                else:
                    print(f"  [!] Lỗi ID không hợp lệ từ Gemini: {temp_id}")

        # 5. Nghỉ giữa các batch
        if total_batches > 1 and (i + GEMINI_BATCH_SIZE) < len(locations_list): # Chỉ nghỉ nếu đây không phải batch cuối
            time.sleep(GEMINI_SLEEP_PER_BATCH)
    
    print("[Flow 4] Chấm điểm Spec_i hoàn tất.")
    return locations_list

# --- Ví dụ minh họa cách sử dụng ---
if __name__ == "__main__":
    
    # Bước 0: Tải corpus lên bộ nhớ
    load_corpus()

    if classifier and CORPUS_DATA:
        
        print("\n" + "="*40)
        print("TEST CASE: TÌM LÃNH SỰ QUÁN INDONESIA (ZERO-SHOT)")
        print(f"Total Score = {ALPHA} * Spec_i + {BETA} * Dis_i")
        print("="*40)
        
        # Query và GPS của người dùng
        test_query = "đĂNG KÍ TẠM TRÚ CHO NGƯỜI INDONESIA Ở TPHCM"
        user_gps = {"lat": 10.7803, "lng": 106.6925} 
        
        print(f"Query của người dùng: '{test_query}'")
        print(f"GPS của người dùng: {user_gps}")

        # 1. Dự đoán Category
        prediction = get_prediction(test_query)
        category_label = prediction.get('label')
        
        if not category_label:
            print(f"Lỗi khi dự đoán: {prediction.get('error')}")
            exit()
        
        print(f"\n[Flow 1] Dự đoán Category: '{category_label}' (Score: {prediction.get('score'):.4f})")
        
        # 2. Lọc địa điểm theo Category
        filtered_locations = FilterByCate(category_label)
        print(f"[Flow 2] Lọc theo Category: Tìm thấy {len(filtered_locations)} địa điểm.")

        # 3. Chấm điểm khoảng cách (Dis_i)
        dist_scored_locations = Evaluate_Distance(user_gps['lat'], user_gps['lng'], filtered_locations)
        print(f"[Flow 3] Chấm điểm khoảng cách (Dis_i) hoàn tất.")

        # 4. Chấm điểm Specific (Spec_i) (Sử dụng Gemini API)
        final_locations = Evaluate_Specific(test_query, category_label, dist_scored_locations)

        # 5. Tính điểm tổng hợp (Total Score)
        print(f"\n[Flow 5] Đang tính điểm tổng hợp...")
        for loc in final_locations:
            spec_score = loc.get('spec_score', 0.5)
            dist_score = loc.get('distance_score', 0)
            
            # Công thức Score_i = alpha * Spec_i + beta * Dis_i
            total_score = (ALPHA * spec_score) + (BETA * dist_score)
            loc['total_score'] = total_score
        
        # 6. Sắp xếp theo Total Score
        sorted_final_list = sorted(final_locations, key=lambda x: x.get('total_score', 0), reverse=True)

        print("\n--- KẾT QUẢ CUỐI CÙNG (ĐÃ XẾP HẠNG THEO TOTAL SCORE) ---")
        
        for i, loc in enumerate(sorted_final_list[:10]): # In top 10
            # Kiểm tra xem Total Score có hợp lý không
            if loc['total_score'] < 0.2 and i > 0: 
                break
                
            print(f"\n  {i+1}. {loc['Ten']}")
            print(f"     -> **Total Score**: {loc['total_score']:.4f}")
            # --- DÒNG MỚI ĐƯỢC THÊM VÀO ---
            print(f"     -> Lý do (Zeroshot): {loc.get('spec_reason', 'N/A')}")
            # ---
            print(f"     -> (Spec_i: {loc['spec_score']:.4f} * {ALPHA}) + (Dis_i: {loc['distance_score']:.4f} * {BETA})")
            print(f"     -> (Cách {loc['raw_distance_km']:.2f} km)")
    else:
        print("\n[!] Không thể chạy test case. Vui lòng kiểm tra mô hình classifier và file corpus.csv.")