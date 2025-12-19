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
    get_latest_bot_reply,
    update_conversation_context,
    get_conversation_context,
    get_latest_guide_context
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
    convo_id = data.get("convo_id")
    
    user_email = session.get("user_email")
    
    # 1. LOAD CONTEXT
    current_info = {}
    last_bot_reply = None

    if user_email and convo_id:
        # USER: Lấy từ Database
        current_info = get_conversation_context(user_email, convo_id)
        save_message(user_email, "user", user_msg, convo_id)
        last_bot_reply = get_latest_bot_reply(user_email, convo_id)
    else:
        # GUEST: Lấy từ Client gửi lên (Stateless)
        current_info = data.get("context", {}) 
        last_bot_reply = data.get("last_bot_reply", None)
    
    intent = assistant.detect_intent_hybrid(user_msg, current_info, last_bot_reply)

    if intent == "greeting":
        # Trả lời ngay lập tức, không gọi API analyze
        return jsonify({
            "reply": "Hello! How can I help you regarding administrative, healthcare, or security issues?", 
            "locations": [], 
            "context": current_info
        })

    status = current_info.get("status", None)
    print(f"🔍 DEBUG Current Status: {status}, Detected Intent: {intent}")

    if current_info.get("status") == "finished":
        last_bot_reply = get_latest_bot_reply(user_email, convo_id) if (user_email and convo_id) else None
        
        if intent == "follow_up":
            # === LẤY GUIDE TỪ TIN NHẮN GẦN NHẤT ===
            saved_guide = {}
            if user_email and convo_id:
                saved_guide = get_latest_guide_context(user_email, convo_id)
            else:
                saved_guide = current_info.get("final_guide", {}) # Fallback session
            
            bot_reply = assistant.chat_with_guide(user_msg, saved_guide)
            
            if user_email and convo_id:
                save_message(user_email, "model", bot_reply, convo_id)

            return jsonify({
                "reply": bot_reply, 
                "action": "none", 
                "locations": [],
                "context": current_info # Trả lại context cũ để client lưu tiếp
            })
        
        elif intent == "greeting":
             return jsonify({"reply": "Hello! How can I help you?", "locations": [], "context": current_info})
        else:
            # New Topic -> Reset Context
            current_info = {}
            if user_email and convo_id:
                update_conversation_context(user_email, convo_id, {})

    # BƯỚC 1: Phân tích yêu cầu (Dùng method của Class)
    analysis_result = assistant.analyze_query(user_msg, current_info)
    # Cập nhật session
    new_info = analysis_result.get("collected_info", {})
    is_complete = analysis_result.get("is_complete", False)

    if user_email and convo_id:
        update_conversation_context(user_email, convo_id, new_info)

    # TRƯỜNG HỢP A: Chưa đủ thông tin -> Hỏi tiếp
    if not is_complete:
        questions = analysis_result.get("questions", [])
        questions = ''.join(questions)
        bot_reply = questions if questions else "I need more information to assist you."

        if user_email and convo_id:
            save_message(user_email, "model", bot_reply, convo_id)
    
        print(current_info)

        return jsonify({
            "reply": bot_reply, 
            "action": "clarify", 
            "locations": [],
            "context": new_info # Gửi context mới về cho Client lưu
        })

    # TRƯỜNG HỢP B: Đủ thông tin -> Tìm kiếm & Hướng dẫn
    else:
        # Tự động tạo query tìm kiếm
        search_query = f"{new_info.get('problem_category', '')} in {new_info.get('current_location', '')}"
        
        print(new_info)

        # Gọi các method xử lý logic
        locations = assistant.search_locations(search_query, user_lat, user_lng)
        guide_data = assistant.generate_guide(user_msg, locations, new_info)

        print(guide_data)

        guide_data['locations'] =  locations
        new_info['status'] = 'finished'
        new_info['final_guide'] = guide_data
        
        if user_email and convo_id:
            # User login: Lưu vào DB (Message table)
            update_conversation_context(user_email, convo_id, new_info)
            save_message(user_email, "model", "I have generated a detailed guide for you.", convo_id, guide_data=guide_data)
        
        filename = f"outputs/guide.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(guide_data, f, ensure_ascii=False, indent=2)

        with open(filename, 'r', encoding='utf-8') as file:
            current_data = json.load(file)

        return jsonify({
            "reply": "I have created a detailed guide for you below.",
            "guide": guide_data, 
            "locations": locations,
            "context": new_info # Client phải lưu cái này
        })




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
        return jsonify({"text": "Error: Missing scenario or step information for lookup.", 
                        "newLat": None, "newLng": None})
    
        

    result = {
        "text": "I understand the issue. Please try asking a nearby security guard or information desk.",
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
            error_msg = data.get("error", {}).get("message", "Unknown API error.")
            result["text"] = f"Gemini API error (HTTP {response.status_code}): {error_msg}"
            return jsonify(result)

        candidates = data.get("candidates")
        if not candidates:
            reason = data.get("promptFeedback", {}).get("blockReason", "UNKNOWN")
            result["text"] = f"Error: Response blocked due to safety policy ({reason})."
            return jsonify(result)
        
        # 5. Trích xuất văn bản phản hồi
        # Lấy văn bản từ vị trí tiêu chuẩn của Gemini API
        gemini_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text")
        
        if gemini_text:
            # Loại bỏ các ký tự markdown thừa (**, #)
            result["text"] = gemini_text.replace('**', '').replace('*', '').replace('#', '').strip()
        else:
            result["text"] = "Error: Gemini returned an empty response."

    except requests.exceptions.RequestException as e:
        # Network error
        result["text"] = f"Connection error: Unable to reach Gemini server. ({e})"
    except Exception as e:
        # Other processing errors (e.g., KeyError, ValueError)
        result["text"] = f"Response processing error: {e}"

    # 6. Trả về kết quả cuối cùng (có thể là giải pháp AI hoặc thông báo lỗi)
    return jsonify(result)

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


# In your Flask application file (e.g., routes.py or app.py)

@chat_bp.route('/admin_helper')
def admin_helper():
    """Serve the administrative helper page"""
    location_name = request.args.get('name', 'Unknown Location')
    location_address = request.args.get('address', 'Address not available')
    location_type = request.args.get('type', 'default')
    lat = request.args.get('lat', '')
    lng = request.args.get('lng', '')
    
    return render_template(
        'admin_helper_page.html',
        location_name=location_name,
        location_address=location_address,
        location_type=location_type,
        lat=lat,
        lng=lng
    )
    
    
 