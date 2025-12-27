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
- Guide users toward the appropriate "Medical Form" to get personalized recommendations.
- Offer empathetic, professional, and accurate advice regarding medical logistics in HCMC.
- Act as a supportive first point of contact for health-related inquiries.

STRICT OUTPUT RULES:
- Format: You must return ONLY a VALID JSON object.
- Schema: {"reply": "Your concise English response here"}
- Constraints: No markdown blocks, no backticks (unless part of the string), no preamble, and no post-response commentary.
- Tone: Professional, friendly, and reassuring.
"""


@chat_bp.route('/bot-reply', methods = ['POST'])
def main_chat():
    # import requests
    # import os

    # API_KEY = os.getenv("GEMINI_API_KEY")
    # url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

    # response = requests.get(url)
    # models = response.json()

    # if 'models' in models:
    #     print("Các model bạn có thể dùng:")
    #     for m in models['models']:
    #         # Chỉ lọc các model hỗ trợ tạo nội dung
    #         if "generateContent" in m['supportedGenerationMethods']:
    #             print(f"- {m['name'].replace('models/', '')}")
    # else:
    #     print("Không lấy được danh sách model, kiểm tra lại API Key.")

    # 1. Lấy dữ liệu người dùng

    data = request.get_json()
    user_msg = data.get("text", "")

    
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
    session['history'].clear()

    return jsonify({"reply": reply})


