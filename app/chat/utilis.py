# app/chat/services.py

from sqlalchemy import select, and_
from sqlalchemy.sql import func
from app.db import db
from app.db.models import User, Conversation, Message, Place
import json

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

def save_message(email, role, content, conversation_id, guide_data = None):
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

    if guide_data:
        new_message.guide_data = json.dumps(guide_data, ensure_ascii=False) 
    
    # Update thời gian cho conversation
    conversation.updated_at = func.now()

    db.session.add(new_message)
    db.session.commit()
    
    return True

def get_messages(email, conversation_id):
    """Lấy list messages (bao gồm cả guide_data bên trong message nếu có)"""
    user = get_user(email)
    if not user: return []

    stmt_check = select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    if not db.session.scalar(stmt_check): return []

    stmt_msgs = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    messages = db.session.scalars(stmt_msgs).all()

    results = []
    for msg in messages:
        m_dict = msg.to_dict()
        # Parse JSON string lại thành Dict để frontend dễ dùng
        if m_dict.get("guide_data"):
            try:
                m_dict["guide_data"] = json.loads(m_dict["guide_data"])
            except:
                m_dict["guide_data"] = None
        results.append(m_dict)
    return results

def query_pois_db(query_kw, south, north, east, west):
    stmt = select(Place).where(
    and_(
        Place.query_kw == query_kw,
        Place.lat.between(south, north), 
        Place.lng.between(west, east)   
        )
    )
    return db.session.scalars(stmt).all()

def check_poi_db(max_lat, max_lng, min_lat, min_lng, name):
    candidates = Place.query.filter(
        Place.lat <= max_lat,
        Place.lat >= min_lat,
        Place.lng <= max_lng,
        Place.lng >= min_lng
    ).all() 

    if not candidates:
        return None
    
    input_lat = (max_lat + min_lat) / 2
    input_lng = (max_lng + min_lng) / 2 
    closest_place = None
    min_dist = float('inf')

    search_name_norm = name.lower()

    for place in candidates:
        dist = (place.lat - input_lat)**2 + (place.lng - input_lng)**2
        if dist < 0.0000005:
             return place
        place_name_norm = place.name.lower()
        if place_name_norm in search_name_norm or search_name_norm in place_name_norm:
            return place
        if dist < min_dist:
            min_dist = dist
            closest_place = place   
    return closest_place

def update_conversation_context(email, convo_id, context_dict):
    """
    Lưu collected_info (dictionary) vào database dưới dạng JSON string.
    """
    user = get_user(email)
    if not user: return False
    
    stmt = select(Conversation).where(
        Conversation.id == convo_id,
        Conversation.user_id == user.id
    )
    convo = db.session.scalar(stmt)
    
    if convo:
        # Chuyển Dict -> JSON String để lưu vào cột Text
        convo.context_data = json.dumps(context_dict, ensure_ascii=False)
        convo.updated_at = func.now()
        db.session.commit()
        return True
    return False

def get_conversation_context(email, convo_id):
    """
    Lấy context (collected_info) từ database, chuyển ngược lại thành Dict.
    """
    user = get_user(email)
    if not user: return {}
    
    stmt = select(Conversation).where(
        Conversation.id == convo_id,
        Conversation.user_id == user.id
    )
    convo = db.session.scalar(stmt)
    
    if convo and convo.context_data:
        try:
            return json.loads(convo.context_data)
        except:
            return {}
    return {}

def get_latest_bot_reply(email, convo_id):
    """Lấy tin nhắn bot cuối cùng để feed cho AI context."""
    user = get_user(email)
    if not user: return None
    
    stmt = (
        select(Message)
        .where(
            Message.conversation_id == convo_id,
            Message.role == 'model'
        )
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    msg = db.session.scalar(stmt)
    return msg.content if msg else None

def get_latest_guide_context(email, convo_id):
    """
    Tìm ngược từ dưới lên, lấy tin nhắn gần nhất CÓ chứa guide_data.
    Dùng để feed cho AI khi user hỏi follow-up.
    """
    user = get_user(email)
    if not user: return {}
    
    # Tìm message có guide_data != None, sắp xếp mới nhất trước
    stmt = (
        select(Message)
        .where(
            Message.conversation_id == convo_id,
            Message.guide_data.is_not(None)
        )
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    msg = db.session.scalar(stmt)
    
    if msg and msg.guide_data:
        try:
            return json.loads(msg.guide_data)
        except:
            return {}
    return {}