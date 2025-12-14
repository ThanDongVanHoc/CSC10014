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

API_KEY = os.getenv("GEMINI_API_KEY")
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
current_data = {}

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
        questions = ''.join(questions)
        bot_reply = questions if questions else "Tôi cần thêm thông tin."
    
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

        with open(filename, 'r', encoding='utf-8') as file:
            current_data = json.load(file)

        return guide_data




def build_issue_prompt(scenario_title, steps_done, user_issue, step_stuck_content):
    """Creates a detailed prompt string for the Gemini model."""
    
    # 1. System Role and Core Context
    prompt = "You are a smart guide assistant specialized in providing quick, practical solutions for user issues encountered during public service procedures. "
    prompt += f"The user is executing the detailed scenario: '{scenario_title}'.\n\n"
    
    # 2. Completed Steps Context
    if steps_done:
        done_list = "\n".join([f"- Step {s.get('id')}: {s.get('title')}" for s in steps_done])
        prompt += f"The steps successfully completed so far are:\n{done_list}\n\n"
    else:
        prompt += "The user is encountering an issue at the very beginning.\n\n"
        
    # 3. Current Stuck Step Info (Using the content provided)
    # Renaming step_stuck to step_stuck_content for clarity in the prompt body
    prompt += "The user is currently stuck at the following instruction/step content:\n"
    prompt += f"**[STUCK STEP]**\n---\n{step_stuck_content}\n---\n\n"

    # 4. The User's Problem
    prompt += f"The exact problem the user reported is: **'{user_issue}'**.\n\n"
    
    # 5. Instruction and Output Request
    prompt += "Based on the completed steps and the current instruction, provide a **detailed, HELPFUL, and PRACTICAL SOLUTION** (only the answer text). Ensure the solution is contextually relevant. If the problem is minor or requires human intervention (e.g., asking a guard), keep the answer brief and polite. DO NOT repeat the step content or the user's question."
    
    return prompt

@chat_bp.route('/chat_issue', methods = ['POST'])
def chat_issue():
    data = request.get_json()
    
    steps_done = data.get('done', [])        # Danh sách các bước đã hoàn thành (List of dicts: id, title)
    user_issue = data.get('issue', "")       # Vấn đề người dùng
    step_stuck = data.get('step_stuck', None)   # ID bước bị kẹt
    scenario_title = data.get('title', None) # Tiêu đề kịch bản/Địa điểm
    
    print(scenario_title)
    print(step_stuck)

    if not scenario_title or not step_stuck:
        return jsonify({"text": "Lỗi: Thiếu thông tin kịch bản/bước để tra cứu.", 
                        "newLat": None, "newLng": None})
    
        

    result = {
        "text": "Tôi hiểu vấn đề này. Hãy thử hỏi nhân viên bảo vệ hoặc bàn hướng dẫn gần đó.",
        "newLat": None,
        "newLng": None
    }


    prompt = build_issue_prompt(scenario_title, steps_done, user_issue, step_stuck)

    base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{BASE_MODEL_NAME}:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
            "parts": [
                {"text": f"{user_issue}"} 
                ]
            }
        ],

        "systemInstruction": {"parts": [{"text": prompt}]},
        "generationConfig": {
            "temperature": 0.5,
            "responseMimeType": "application/json"
        }
    }

# 3. Gọi API
    try:
        # Lấy API key từ biến môi trường
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
             raise ValueError("GEMINI_API_KEY is not set.")
             
        response = requests.post(base_url, json=payload, params={"key": api_key})
        data = response.json()
        
        # 4. Xử lý lỗi HTTP và Phản hồi Bị chặn
        if response.status_code != 200:
            error_msg = data.get("error", {}).get("message", "Lỗi API không rõ.")
            result["text"] = f"Lỗi API Gemini (HTTP {response.status_code}): {error_msg}"
            return jsonify(result)

        candidates = data.get("candidates")
        if not candidates:
            reason = data.get("promptFeedback", {}).get("blockReason", "UNKNOWN")
            result["text"] = f"Lỗi: Phản hồi bị chặn do chính sách an toàn ({reason})."
            return jsonify(result)
        
        # 5. Trích xuất văn bản phản hồi
        # Lấy văn bản từ vị trí tiêu chuẩn của Gemini API
        gemini_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text")
        
        if gemini_text:
            # Loại bỏ các ký tự markdown thừa (**, #)
            result["text"] = gemini_text.replace('**', '').replace('*', '').replace('#', '').strip()
        else:
            result["text"] = "Lỗi: Gemini trả về phản hồi rỗng."

    except requests.exceptions.RequestException as e:
        # Lỗi mạng
        result["text"] = f"Lỗi kết nối: Không thể liên hệ với máy chủ Gemini. ({e})"
    except Exception as e:
        # Lỗi xử lý khác (ví dụ: KeyError, ValueError)
        result["text"] = f"Lỗi xử lý phản hồi: {e}"

    # 6. Trả về kết quả cuối cùng (có thể là giải pháp AI hoặc thông báo lỗi)
    return jsonify(result)

@chat_bp.route('/chat_for_fun', methods = ['POST'])   
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
