from flask import redirect, render_template, url_for, session, request, jsonify
from . import chat_bp
import requests, os, json

API_KEY = "AIzaSyA64uitr82I10KGTUyBgrki8FOJmZ1SWPs"
BASE_MODEL_NAME = "gemini-2.5-flash" 


system_prompt = r"""
This project is code by Phạm Hữu Nam, Thắng, Lĩnh, Tính, Khương. 

You are an assistant that analyzes user messages about security, healthcare,
and administrative issues for foreign residents in Ho Chi Minh City.
You should give details instruction for users.

Your job: return a VALID JSON object only (nothing else) that follows this schema:
{
"reply": "text in user's language !",
"action": "none" or "search_location",
"search_query": "the search term in Vietnamese (e.g., 'hospital', 'police station', 'embassy')"
}

Rules:
- If the user is asking for a location (like a hospital, police, etc.), set "action" to "search_location" and "search_query" to the appropriate keyword.
- Otherwise, set "action" to "none" and "search_query" to "null".
- Return ONLY the JSON object.
"""

MODEL_API_ENDPOINT = "http://127.0.0.1:8000/recommend"

@chat_bp.route('/')
def chat_page():
    return render_template('chat.html')


@chat_bp.route('/', methods = ['POST'])
def chat():
    # 1. Lấy dữ liệu người dùng
    data = request.get_json()
    user_msg = data.get("message", "")
    
    user_lat = data.get("user_lat") 
    user_lng = data.get("user_lng")

    # 2. Xử lý Session
    session.permanent = False 

    if "history" not in session:
        session["history"] = []

    session["history"].append({"role": "user", "content": user_msg})
    history_parts = [{"role": h["role"], "parts": [{"text": h["content"]}]} for h in session["history"]]

    # (Debug print, bạn có thể giữ lại)
    for h in session["history"]:
         print(h["content"]); 

    # 3. Kiểm tra đầu vào
    if not user_msg:
        session["history"].pop() # Xóa tin nhắn rỗng khỏi lịch sử
        return jsonify({"reply": "Bạn chưa nhập gì cả.", "locations": []})
    
    # Sửa: Dùng `is None` an toàn hơn cho tọa độ 0
    if user_lat is None or user_lng is None:
        return jsonify({"reply": "Không nhận được vị trí (lat/lng) từ trình duyệt.", "locations": []})

    if not API_KEY:
        return jsonify({"reply": "Lỗi cấu hình: Không tìm thấy GEMINI_API_KEY.", "locations": []})

    # 4. Chuẩn bị gọi Gemini
    base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{BASE_MODEL_NAME}:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": history_parts,
        "systemInstruction": { "parts": [{"text": system_prompt}] },
        "generationConfig": {
            "temperature": 0.5,
            "responseMimeType": "application/json"
        }
    }

    model_locations = []
    gemini_reply_clean = "" # Biến để lưu phản hồi SẠCH
    gemini_reply_to_user = "" # Biến để gửi cho người dùng (có thể có lỗi)

    # 5. Gọi API
    try:
        response = requests.post(base_url, json=payload, params={"key": API_KEY})
        data = response.json()
        
        if response.status_code != 200:
            error_msg = data.get("error", {}).get("message", "Lỗi API không rõ.")
            return jsonify({"reply": f"Lỗi API Gemini: Mã {response.status_code} - {error_msg}"})
        
        candidates = data.get("candidates")
        if not candidates:
            reason = data.get("promptFeedback", {}).get("blockReason", "UNKNOWN")
            return jsonify({"reply": f"Lỗi: Phản hồi bị chặn do chính sách an toàn ({reason})."})
        
        gemini_json_string = candidates[0].get("content", {}).get("parts", [{}])[0].get("text")
        if not gemini_json_string:
            return jsonify({"reply": "Lỗi: Gemini trả về phản hồi rỗng."})
        

        # 6. Xử lý JSON từ Gemini
        try:
            parsed_data = json.loads(gemini_json_string)
            
            # LƯU Ý: Lưu phản hồi SẠCH ngay lập tức
            gemini_reply_clean = parsed_data.get("reply", "Lỗi: Không tìm thấy 'reply' trong JSON.")
            gemini_reply_to_user = gemini_reply_clean # Mặc định, gửi phản hồi sạch
            
            action = parsed_data.get("action", "none")
            search_query = parsed_data.get("search_query")

            if action == "search_location" and search_query:
                try:
                    model_payload = {
                        "query": search_query,
                        "lat": user_lat,
                        "lng": user_lng
                    }
                    
                    model_response = requests.post(MODEL_API_ENDPOINT, json=model_payload, timeout=20)

                    if model_response.status_code == 200:
                        model_data = model_response.json()
                        model_locations = model_data.get("results", [])
                        # (Đã xóa dòng thêm status, client JS sẽ tự xử lý)
                    else:
                        # THAY ĐỔI: Chỉ thêm lỗi vào biến gửi cho user
                        gemini_reply_to_user += f"\n (Lỗi khi gọi model tìm kiếm: {model_response.status_code})"

                except requests.exceptions.RequestException as e:
                    gemini_reply_to_user += f"\n (Lỗi kết nối đến model tìm kiếm: {e})"
                except Exception as e:
                    gemini_reply_to_user += f"\n (Lỗi xử lý model: {e})"

        except json.JSONDecodeError:
            gemini_reply_clean = "Lỗi: Không thể phân tích cú pháp JSON từ Gemini."
            gemini_reply_to_user = gemini_reply_clean
            print(f"Lỗi JSONDecodeError. Phản hồi thô từ Gemini: {gemini_json_string}")
        except Exception as e:
            gemini_reply_clean = f"Lỗi xử lý JSON: {e}"
            gemini_reply_to_user = gemini_reply_clean


    except requests.exceptions.RequestException as e:
        gemini_reply_clean = f"Lỗi kết nối: Không thể liên hệ với máy chủ Gemini. ({e})"
        gemini_reply_to_user = gemini_reply_clean
    except Exception as e:
        gemini_reply_clean = f"Lỗi xử lý phản hồi: {e}"
        gemini_reply_to_user = gemini_reply_clean
    
    
    session["history"].append({"role": "model", "content": gemini_reply_clean})
        
    # 8. Trả về
    return jsonify({
        "reply": gemini_reply_to_user, # Gửi phản hồi (có thể có lỗi) cho user
        "locations": model_locations 
    })


@chat_bp.route('/clear_session', methods=['POST'])
def clear_session():
    session.clear()           # Xóa toàn bộ session
    session.modified = True

    return '', 204