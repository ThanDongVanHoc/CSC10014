from flask import redirect, render_template, url_for, session, request, jsonify
from . import chat_bp
import requests, os, json

API_KEY = os.getenv("GEMINI_API_KEY")
# Sửa dòng này
BASE_MODEL_NAME = "gemini-2.5-flash-lite"

system_prompt = r"""
ROLE:
You are the "HCMC International Healthcare Navigator," a specialized AI assistant developed by Phạm Hữu Nam, Thắng, Lĩnh, Tính, and Khương.
Your mission is to assist foreign residents in Ho Chi Minh City in navigating the local healthcare system efficiently.

CONTEXT & CAPABILITIES:
Your ecosystem provides the following services:
1. Hospital Recommendations: Matching users with suitable hospitals based on maps, routes, and transparent pricing.
2. Medical Card: A digital card designed to bridge the communication gap between foreigners and local medical staff (receptionists/doctors).
3. Communication Tools: Integrated Speech-to-Text and real-time translation services.

OPERATIONAL GOALS:
- Tell people to update their information in profile (gender, allergic, etc.)
- Guide users toward the appropriate "Medical Form" on the top chat to get personalized recommendations.
- Offer empathetic, professional, and accurate advice regarding medical logistics in HCMC.
- Act as a supportive first point of contact for health-related inquiries.

STRICT OUTPUT RULES:
- Format: You must return ONLY a VALID JSON object.
- Schema: {"reply": "Your concise English response here"}
- Constraints: No markdown blocks, no links, no backticks (unless part of the string), no preamble, and no post-response commentary.
- Tone: Professional, friendly, and reassuring.
"""

@chat_bp.route('/bot-reply', methods=['POST'])
def main_chat():
    # 1. Kiểm tra API Key
    if not API_KEY:
        return jsonify({"reply": "Lỗi cấu hình: Không tìm thấy GEMINI_API_KEY."})

    # 2. Lấy dữ liệu người dùng
    data = request.get_json()
    user_msg = data.get("text", "")

    if not user_msg:
        return jsonify({"reply": "Bạn chưa nhập gì cả."})

    # 3. Quản lý Session History
    if "history" not in session:
        session["history"] = []

    session["history"].append({"role": "user", "content": user_msg})

    # Tạo payload history cho Gemini
    # API Gemini yêu cầu role là 'user' hoặc 'model'
    history_parts = [
        {
            "role": "user" if h["role"] == "user" else "model",
            "parts": [{"text": h["content"]}]
        } 
        for h in session["history"]
    ]

    base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{BASE_MODEL_NAME}:generateContent"

    headers = {
        "Content-Type": "application/json"
    }

    payload = {
        "contents": history_parts,
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "generationConfig": {
            "temperature": 0.5,
            "responseMimeType": "application/json" # Bắt buộc Gemini trả về JSON
        }
    }

    try:
        # Truyền headers vào request
        response = requests.post(base_url, json=payload, headers=headers, params={"key": API_KEY})
        
        # Xử lý lỗi HTTP
        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", "Lỗi API không rõ.")
            # Xóa tin nhắn lỗi của user để không hỏng context sau này
            session["history"].pop()
            session.modified = True
            return jsonify({"reply": f"Lỗi API Gemini ({response.status_code}): {error_msg}"})

        data = response.json()
        candidates = data.get("candidates")

        if not candidates:
            reason = data.get("promptFeedback", {}).get("blockReason", "UNKNOWN")
            session["history"].pop()
            session.modified = True
            return jsonify({"reply": f"Lỗi: Phản hồi bị chặn ({reason})."})

        # Lấy text thô từ Gemini
# ... (Previous code remains the same) ...

        # Extract Raw Text
        gemini_raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text")

        if not gemini_raw_text:
            return jsonify({"reply": "Error: Gemini returned empty content."})

        # --- IMPROVED JSON PARSING LOGIC ---
        try:
            # 1. robust cleaning: Extract only the substring between the first '{' and last '}'
            start_idx = gemini_raw_text.find('{')
            end_idx = gemini_raw_text.rfind('}')

            if start_idx != -1 and end_idx != -1:
                # Slice the string to keep only the valid JSON part
                clean_text = gemini_raw_text[start_idx : end_idx + 1]
            else:
                # Fallback if no braces are found (e.g., plain text response)
                clean_text = gemini_raw_text

            # 2. Parse JSON
            parsed_data = json.loads(clean_text)
            
            # 3. Extract the 'reply' field
            if isinstance(parsed_data, dict) and "reply" in parsed_data:
                reply = parsed_data["reply"]
            else:
                reply = str(parsed_data) # Fallback if structure is unexpected

        except json.JSONDecodeError:
            # Fallback: If parsing still fails, use the raw text as the reply
            # This prevents the app from crashing due to bad formatting
            reply = gemini_raw_text.replace('{"reply": "', '').replace('"}', '') # Simple cleanup attempt
            print(f"JSON Decode Error. Raw text: {gemini_raw_text}")
        except Exception as e:
            reply = f"Data Processing Error: {e}"

    except requests.exceptions.RequestException as e:
        reply = f"Lỗi kết nối: {e}"
    except Exception as e:
        reply = f"Lỗi hệ thống: {e}"
    
    # Lưu câu trả lời của Bot vào lịch sử
    session["history"].append({"role": "model", "content": reply})
    
    
    # ĐÃ XÓA dòng session['history'].clear() để bot nhớ được ngữ cảnh

    return jsonify({"reply": reply})