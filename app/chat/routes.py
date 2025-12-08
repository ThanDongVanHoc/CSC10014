from flask import redirect, render_template, url_for, session, request, jsonify
from . import chat_bp
import requests, os, json
from .utilis import (
    get_messages,
    save_message,
    list_conversations,
    create_conversation,
    rename_conversation,
    delete_conversation,
)

from .ChatPro import ChatPro

os.makedirs("outputs", exist_ok=True)

assistant = ChatPro(
    search_model_url="http://localhost:8001/recommend",
    interact_model_url="http://localhost:8000"
)

API_KEY = "AIzaSyAkteio2f4Is6odTtvwLGwem_ZJboG8hxg"
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

@chat_bp.route('/', methods=['POST'])
def chat():
    data = request.get_json()
    user_msg = data.get("message", "")
    user_lat = data.get("user_lat")
    user_lng = data.get("user_lng")
    
    # Lấy context từ session
    current_info = session.get("collected_info", {})

    # BƯỚC 1: Phân tích yêu cầu (Dùng method của Class)
    analysis_result = assistant.analyze_query(user_msg, current_info)
    
    # Cập nhật session
    session["collected_info"] = analysis_result.get("collected_info", {})
    is_complete = analysis_result.get("is_complete", False)

    # TRƯỜNG HỢP A: Chưa đủ thông tin -> Hỏi tiếp
    if not is_complete:
        questions = analysis_result.get("questions", [])
        bot_reply = questions[0] if questions else "Tôi cần thêm thông tin."
    
        print(current_info)
        return jsonify({
            "reply": bot_reply,
            "action": "clarify",
            "locations": []
        })

    # TRƯỜNG HỢP B: Đủ thông tin -> Tìm kiếm & Hướng dẫn
    else:
        # Tự động tạo query tìm kiếm
        collected_info = session["collected_info"]
        search_query = f"{collected_info.get('problem_category', '')} in {collected_info.get('current_location', '')}"
        
        print(session["collected_info"])

        # Gọi các method xử lý logic
        locations = assistant.search_locations(search_query, user_lat, user_lng)
        guide_data = assistant.generate_guide(user_msg, locations, collected_info)

        print(guide_data)

        guide_data['locations'] =  locations

        
        filename = f"outputs/guide.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(guide_data, f, ensure_ascii=False, indent=2)
        
        return guide_data
    
def chat_prepare():
    data = request.get_json()
    user_msg = data.get("message", "")
    convo_id = data.get("convo_id")   # nhận conversation id từ frontend
    
    user_lat = data.get("user_lat") 
    user_lng = data.get("user_lng")

    # 2. Xử lý Session
    session.permanent = False 

    if "history" not in session:
        session["history"] = []

    session["history"].append({"role": "user", "content": user_msg})
    history_parts = [{"role": h["role"], "parts": [{"text": h["content"]}]} for h in session["history"]]

    for h in session["history"]:
         print(h["content"]); 

    # 3. Kiểm tra đầu vào
    if not user_msg:
        session["history"].pop() # Xóa tin nhắn rỗng khỏi lịch sử
        return jsonify({"reply": "Bạn chưa nhập gì cả.", "locations": []})
    

    # kiểm tra user đăng nhập chưa
    user_email = session.get("user_email", None)

    if user_email:
        if not convo_id:
            convo = create_conversation(user_email, title=user_msg[:40] or "New chat")
            convo_id = convo["id"]

        # lấy lịch sử messages theo conversation
        history = get_messages(user_email, convo_id)
        # lưu tin nhắn user
        save_message(user_email, "user", user_msg, convo_id)
        history.append({"role": "user", "content": user_msg})
    else:
        history = session["history"]

    # chuẩn bị dữ liệu gửi lên Gemini
    history_parts = [{"role": h["role"], "parts": [{"text": h["content"]}]} for h in history]

    if not API_KEY:
        return jsonify({"reply": "Lỗi cấu hình: Không tìm thấy GEMINI_API_KEY.", "locations": []})

    # 4. Chuẩn bị gọi Gemini
    base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{BASE_MODEL_NAME}:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": history_parts,
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "temperature": 0.5,
            "responseMimeType": "application/json"
        }
    }

    model_locations = []
    gemini_reply_clean = ""
    gemini_reply_to_user = "" 

    # 5. Gọi API
    try:
        response = requests.post(base_url, json=payload, params={"key": API_KEY})
        data = response.json()
        if response.status_code != 200:
            error_msg = data.get("error", {}).get("message", "Lỗi API không rõ.")
            return jsonify({"reply": f"Lỗi API Gemini: {error_msg}"})

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
    
    
    # 7. LƯU MESSAGE CỦA BOT
    if user_email:
        # user đã login: lưu vào DB theo conversation
        save_message(user_email, "model", gemini_reply_clean, convo_id)
    else:
        # guest: lưu vào session như cũ
        session["history"].append({"role": "model", "content": gemini_reply_clean})

    # 8. Trả về
    return jsonify({
        "reply": gemini_reply_to_user, # Gửi phản hồi (có thể có lỗi) cho user
        "locations": model_locations 
    })


@chat_bp.route('/clear_session', methods=['POST'])
def clear_session():
    if "history" in session:
        session["history"].clear()
    return '', 204

# ============= Conversation API cho user đã login =============

@chat_bp.route('/messages', methods=['GET'])
def get_conversations():
    """Trả về toàn bộ list conversation của user (dùng cho sidebar)."""
    user_email = session.get("user_email")
    if not user_email:
        # cho guest: trả [] để logic.js biết là chưa login
        return jsonify([])

    convs = list_conversations(user_email)
    return jsonify(convs)


@chat_bp.route('/messages/<int:convo_id>', methods=['GET'])
def get_chat_history(convo_id):
    """Trả lịch sử chat của 1 conversation cụ thể."""
    user_email = session.get("user_email")
    if not user_email:
        return jsonify([])

    msgs = get_messages(user_email, convo_id)
    return jsonify(msgs)


@chat_bp.route('/messages', methods=['POST'])
def create_convo():
    """Tạo conversation mới."""
    user_email = session.get("user_email")
    if not user_email:
        return jsonify({"error": "not_logged_in"}), 401

    data = request.get_json() or {}
    title = data.get("title") or "New chat"
    convo = create_conversation(user_email, title)
    return jsonify(convo), 201


@chat_bp.route('/messages/<int:convo_id>', methods=['PUT'])
def rename_convo(convo_id):
    """Đổi tên conversation."""
    user_email = session.get("user_email")
    if not user_email:
        return jsonify({"error": "not_logged_in"}), 401

    data = request.get_json() or {}
    new_title = data.get("title")
    if not new_title:
        return jsonify({"error": "missing_title"}), 400

    rename_conversation(user_email, convo_id, new_title)
    return jsonify({"status": "ok"})


@chat_bp.route('/messages/<int:convo_id>', methods=['DELETE'])
def delete_convo(convo_id):
    """Xóa conversation + message."""
    user_email = session.get("user_email")
    if not user_email:
        return jsonify({"error": "not_logged_in"}), 401

    delete_conversation(user_email, convo_id)
    return jsonify({"status": "ok"})

@chat_bp.route('/auth_status')
def auth_status():
    return jsonify({"logged_in": bool(session.get("user_email"))})
