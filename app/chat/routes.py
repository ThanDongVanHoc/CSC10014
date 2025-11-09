from flask import redirect, render_template, url_for, session, request, jsonify
from . import chat_bp
import requests, os, json

API_KEY = "AIzaSyA64uitr82I10KGTUyBgrki8FOJmZ1SWPs"
BASE_MODEL_NAME = "gemini-2.5-flash" 


system_prompt = r"""
You are an assistant that analyzes user messages about security, healthcare,
and administrative issues for foreign residents in Ho Chi Minh City.

You should give details instruction for users.

And this project is code by Phạm Hữu Nam, Thắng, Lĩnh, Tính, Khương. 
And this is Nam's API

Your job: return a VALID JSON object only (nothing else) that follows this schema:
{
"reply": "text in user's language just",
}

Rules:
- Return ONLY the JSON object, with no extra commentary, explanation, or markdown.
- Keep `reply` friendly and concise and in the user's language.
"""



@chat_bp.route('/')
def chat_page():
    return render_template('chat.html')


@chat_bp.route('/', methods = ['POST'])
def chat():
    # 1. Lấy dữ liệu người dùng
    data = request.get_json()
    user_msg = data.get("message", "")
    
    session.permanent = False; 

    if "history" not in session:
        session["history"] = []

    session["history"].append({"role": "user", "content": user_msg})

    history_parts = [{"role": h["role"], "parts": [{"text": h["content"]}]} for h in session["history"]]


    if not user_msg:
        return jsonify({"reply": "Bạn chưa nhập gì cả."})

    if not API_KEY:
        return jsonify({"reply": "Lỗi cấu hình: Không tìm thấy GEMINI_API_KEY."})
    
    base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{BASE_MODEL_NAME}:generateContent"


    headers = {
        "Content-Type": "application/json"
    }

    payload = {
        "contents": history_parts,
        "systemInstruction": {
            "parts": [
                {"text": system_prompt}
            ]
        },

        "generationConfig": {
            "temperature": 0.5,
            "responseMimeType": "application/json"
        }
    }

    

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
        
        try:
            parsed_data = json.loads(gemini_json_string)
            reply = parsed_data.get("reply", "Lỗi: Không tìm thấy 'reply' trong JSON.")
        except json.JSONDecodeError:
            reply = "Lỗi: Không thể phân tích cú pháp JSON từ Gemini. Gemini có thể đã trả về văn bản thường."
            print(f"Lỗi JSONDecodeError. Phản hồi thô từ Gemini: {gemini_json_string}")
        except Exception as e:
            reply = f"Lỗi xử lý JSON: {e}"


    except requests.exceptions.RequestException as e:
        reply = f"Lỗi kết nối: Không thể liên hệ với máy chủ Gemini. ({e})"
    except Exception as e:
        reply = f"Lỗi xử lý phản hồi: {e}"
    
    
    session["history"].append({"role": "model", "content": reply})
        
    return jsonify({"reply": reply})


@chat_bp.route('/clear_session', methods=['POST'])
def clear_session():
    session["history"].clear()
    return '', 204