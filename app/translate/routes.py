from flask import render_template, request, jsonify, session
from . import translate_bp
import requests
from .utils import (
    list_translate_conversations,
    create_translate_conversation,
    rename_translate_conversation,
    delete_translate_conversation,
    save_translate_message,
    get_translate_messages,
    get_context_for_api,
    determine_languages
)

AI_SERVICE_URL = "http://localhost:8004"

@translate_bp.route('/')
def translate_page():
    """Hiển thị giao diện trang Translate."""
    return render_template('translate.html')

@translate_bp.route('/conversations', methods=['GET'])
def get_conversations():
    """Lấy danh sách các cuộc hội thoại dịch của user."""
    user_email = session.get("user_email")
    if not user_email:
        # Nếu chưa đăng nhập, trả về list rỗng
        return jsonify([])

    convs = list_translate_conversations(user_email)
    return jsonify(convs)

@translate_bp.route('/conversations', methods=['POST'])
def create_conversation():
    """Tạo mới một phiên dịch."""
    user_email = session.get("user_email")
    if not user_email:
        return jsonify({"error": "not_logged_in"}), 401

    data = request.get_json() or {}
    title = data.get("title") or "New Translation"
    
    convo = create_translate_conversation(user_email, title)
    
    if convo is None:
        return jsonify({"error": "Failed to create conversation"}), 400
        
    return jsonify(convo), 201

@translate_bp.route('/conversations/<int:id>', methods=['PUT'])
def rename_conversation(id):
    """Đổi tên phiên dịch."""
    user_email = session.get("user_email")
    if not user_email:
        return jsonify({"error": "not_logged_in"}), 401

    data = request.get_json() or {}
    new_title = data.get("title")
    if not new_title:
        return jsonify({"error": "missing_title"}), 400

    if rename_translate_conversation(user_email, id, new_title):
        return jsonify({"status": "ok"})
    return jsonify({"error": "Failed or not found"}), 404

@translate_bp.route('/conversations/<int:id>', methods=['DELETE'])
def delete_conversation(id):
    """Xóa phiên dịch."""
    user_email = session.get("user_email")
    if not user_email:
        return jsonify({"error": "not_logged_in"}), 401

    if delete_translate_conversation(user_email, id):
        return jsonify({"status": "ok"})
    return jsonify({"error": "Failed or not found"}), 404

@translate_bp.route('/conversations/<int:id>/messages', methods=['GET'])
def get_messages(id):
    """Lấy chi tiết tin nhắn trong một phiên dịch."""
    user_email = session.get("user_email")
    if not user_email:
        return jsonify([])

    msgs = get_translate_messages(user_email, id)
    return jsonify(msgs)

@translate_bp.route('/api/text', methods=['POST'])
def text_translation_proxy():
    user_email = session.get("user_email")
    
    data = request.get_json() or {}
    text = data.get("text")
    conversation_id = data.get("conversation_id")
    speaker_role = data.get("speaker_role")
    
    # Lấy context từ Client gửi lên (Dành cho Guest)
    client_context = data.get("context", [])

    if not text or not speaker_role:
        return jsonify({"error": "Missing text or speaker_role"}), 400

    source_lang, target_lang = determine_languages(speaker_role)

    # 1. Xác định Context
    if user_email and conversation_id:
        final_context = get_context_for_api(user_email, conversation_id)
    else:
        final_context = client_context

    payload = {
        "text": text,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "context": final_context
    }

    try:
        resp = requests.post(f"{AI_SERVICE_URL}/api/translation/text-to-text", data=payload)
        resp_data = resp.json()

        if resp.status_code != 200 or resp_data.get("status") == "error":
            return jsonify(resp_data), 500

        translated_text = resp_data.get("translated_text")

        if user_email and conversation_id:
            save_translate_message(user_email, conversation_id, speaker_role, text, role='user')
            save_translate_message(user_email, conversation_id, speaker_role, translated_text, role='model')

        return jsonify({
            "status": "success",
            "original_text": text,
            "translated_text": translated_text
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@translate_bp.route('/api/speech', methods=['POST'])
def speech_translation_proxy():
    user_email = session.get("user_email")

    if 'audio_file' not in request.files:
        return jsonify({"error": "No audio"}), 400

    audio_file = request.files['audio_file']
    conversation_id = request.form.get("conversation_id")
    speaker_role = request.form.get("speaker_role")
    
    # Lấy context list từ form (cách lấy list trong form data)
    client_context = request.form.getlist("context") 

    if not speaker_role:
        return jsonify({"error": "Missing speaker_role"}), 400

    source_lang, target_lang = determine_languages(speaker_role)
    
    # 1. Xác định Context
    if user_email and conversation_id:
        final_context = get_context_for_api(user_email, conversation_id)
    else:
        final_context = client_context

    files = {'audio_file': (audio_file.filename, audio_file.read(), audio_file.content_type)}
    is_guest_str = "false" if user_email else "true"
    
    # Requests library xử lý list params hơi đặc thù, ta truyền thẳng list vào
    data_payload = {
        'source_lang': source_lang,
        'target_lang': target_lang,
        'context': final_context,
        'is_guest': is_guest_str
    }

    try:
        resp = requests.post(f"{AI_SERVICE_URL}/api/translation/speech-to-speech", files=files, data=data_payload)
        resp_data = resp.json()

        if resp.status_code != 200 or resp_data.get("status") == "error":
            return jsonify(resp_data), 500
        
        in_dur = resp_data.get("input_audio_duration")
        out_dur = resp_data.get("output_audio_duration")

        if user_email and conversation_id:
            save_translate_message(user_email, int(conversation_id), speaker_role, resp_data.get("original_text"), role='user', audio_url=resp_data.get("input_audio_url"), duration_seconds=in_dur)
            save_translate_message(user_email, int(conversation_id), speaker_role, resp_data.get("translated_text"), role='model', audio_url=resp_data.get("output_audio_url"), duration_seconds=out_dur)

        return jsonify(resp_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@translate_bp.route('/auth_status')
def auth_status():
    """Kiểm tra trạng thái đăng nhập."""
    return jsonify({"logged_in": bool(session.get("user_email"))})