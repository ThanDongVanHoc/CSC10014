# app/chat/services.py

from sqlalchemy import select
from sqlalchemy.sql import func
from app.db import db
from app.db.models import User, Conversation, Message

# USER SERVICES

def get_user(email):
    """
    Tìm user theo email.
    Trả về: User Object hoặc None nếu không tìm thấy.
    """
    stmt = select(User).where(User.email == email)
    return db.session.scalar(stmt)

# CONVERSATION SERVICES

def list_conversations(email):
    """
    Lấy danh sách cuộc trò chuyện của user.
    """
    user = get_user(email)
    
    # Nếu không tìm thấy user, trả về danh sách rỗng
    if not user:
        return []
    
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
    )
    
    conversations = db.session.scalars(stmt).all()

    return [
        {
            "id": c.id,
            "title": c.title or "New chat",
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in conversations
    ]

def create_conversation(email, title="New chat"):
    """Tạo một cuộc hội thoại mới."""
    user = get_user(email)
    
    # Nếu user không tồn tại, không thể tạo hội thoại -> Trả về None
    if not user:
        return None

    new_convo = Conversation(title=title, user=user)
    
    db.session.add(new_convo)
    db.session.commit()
    
    return {
        "id": new_convo.id,
        "title": new_convo.title,
        "created_at": new_convo.created_at.isoformat() if new_convo.created_at else None,
        "updated_at": new_convo.updated_at.isoformat() if new_convo.updated_at else None
    }

def rename_conversation(email, convo_id, new_title):
    """Đổi tên cuộc hội thoại."""
    user = get_user(email)
    if not user:
        return False
    
    stmt = select(Conversation).where(
        Conversation.id == convo_id,
        Conversation.user_id == user.id
    )
    convo = db.session.scalar(stmt)
    
    if convo:
        convo.title = new_title
        db.session.commit()
        return True
    return False

def delete_conversation(email, convo_id):
    """Xóa cuộc hội thoại."""
    user = get_user(email)
    if not user:
        return False
    
    stmt = select(Conversation).where(
        Conversation.id == convo_id,
        Conversation.user_id == user.id
    )
    convo = db.session.scalar(stmt)
    
    if convo:
        db.session.delete(convo)
        db.session.commit()
        return True
    return False

# MESSAGE SERVICES

def save_message(email, role, content, conversation_id):
    """Lưu tin nhắn mới."""
    user = get_user(email)
    if not user:
        return False
    
    stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user.id
    )
    conversation = db.session.scalar(stmt)
    
    if not conversation:
        return False

    new_message = Message(role=role, content=content)
    new_message.conversation = conversation
    
    # Update thời gian cho conversation
    conversation.updated_at = func.now()

    db.session.add(new_message)
    db.session.commit()
    
    return True

def get_messages(email, conversation_id):
    """Lấy danh sách tin nhắn."""
    user = get_user(email)
    if not user:
        return []
    
    stmt_check = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user.id
    )
    conversation = db.session.scalar(stmt_check)

    if not conversation:
        return []

    stmt_msgs = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    
    messages = db.session.scalars(stmt_msgs).all()

    return [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        } 
        for msg in messages
    ]