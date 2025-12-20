from flask import render_template, request, jsonify, session
from . import translate_bp
from .utils import (
    list_translate_conversations,
    create_translate_conversation,
    rename_translate_conversation,
    delete_translate_conversation,
    save_translate_message,
    get_translate_messages
)

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

@translate_bp.route('/conversations/<int:id>/messages', methods=['POST'])
def save_message(id):
    """
    Lưu tin nhắn mới vào database.
    Frontend cần gửi JSON:
    {
        "speaker_role": "patient" | "doctor",
        "content": "Nội dung tin nhắn",
        "role": "user" (mặc định) | "model"
    }
    """
    user_email = session.get("user_email")
    if not user_email:
        return jsonify({"error": "not_logged_in"}), 401
    
    data = request.get_json() or {}
    
    speaker_role = data.get("speaker_role") 
    content = data.get("content")
    role = data.get("role", "user")

    if not speaker_role or not content:
        return jsonify({"error": "Missing speaker_role or content"}), 400
        
    success = save_translate_message(user_email, id, speaker_role, content, role)
    
    if success:
        return jsonify({"status": "success"}), 201
    return jsonify({"error": "Failed to save message"}), 500

@translate_bp.route('/auth_status')
def auth_status():
    """Kiểm tra trạng thái đăng nhập."""
    return jsonify({"logged_in": bool(session.get("user_email"))})