from sqlalchemy import select, desc
from sqlalchemy.sql import func
from app.db import db
from app.db.models import User, Translate_Conversation, Translate_Message

def get_user(email):
    """
    Tìm user theo email.
    Trả về: User Object hoặc None nếu không tìm thấy.
    """
    if not email: return None
    stmt = select(User).where(User.email == email)
    return db.session.scalar(stmt)

def list_translate_conversations(email):
    """
    Lấy danh sách lịch sử dịch thuật của user.
    Sắp xếp theo thời gian cập nhật mới nhất.
    """
    user = get_user(email)
    if not user: return []
    
    stmt = (
        select(Translate_Conversation)
        .where(Translate_Conversation.user_id == user.id)
        .order_by(desc(Translate_Conversation.updated_at))
    )
    
    convos = db.session.scalars(stmt).all()

    return [
        {
            "id": c.id,
            "title": c.title or "New Translation",
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in convos
    ]

def create_translate_conversation(email, title="New Translation"):
    """Tạo một phiên dịch mới."""
    user = get_user(email)
    
    try:
        new_convo = Translate_Conversation(title=title, user=user)
        
        db.session.add(new_convo)
        db.session.commit()
        
        return {
            "id": new_convo.id,
            "title": new_convo.title,
            "created_at": new_convo.created_at.isoformat() if new_convo.created_at else None,
            "updated_at": new_convo.updated_at.isoformat() if new_convo.updated_at else None
        }
    except Exception as e:
        print(f"❌ DB Error (Create Translate): {e}")
        db.session.rollback()
        return None

def rename_translate_conversation(email, convo_id, new_title):
    """Đổi tên phiên dịch."""
    user = get_user(email)
    if not user: return False
    
    stmt = select(Translate_Conversation).where(
        Translate_Conversation.id == convo_id,
        Translate_Conversation.user_id == user.id
    )
    convo = db.session.scalar(stmt)
    
    if convo:
        convo.title = new_title
        db.session.commit()
        return True
    return False

def delete_translate_conversation(email, convo_id):
    """Xóa phiên dịch."""
    user = get_user(email)
    if not user: return False
    
    stmt = select(Translate_Conversation).where(
        Translate_Conversation.id == convo_id,
        Translate_Conversation.user_id == user.id
    )
    convo = db.session.scalar(stmt)
    
    if convo:
        db.session.delete(convo)
        db.session.commit()
        return True
    return False


def save_translate_message(email, conversation_id, speaker_role, content, role='user'):
    """
    Lưu tin nhắn dịch.
    Params:
        - speaker_role: 'patient' hoặc 'doctor' (QUAN TRỌNG: để UI biết vẽ vào ô nào)
        - content: Nội dung text
        - role: 'user' (người nói) hoặc 'model' (bản dịch của máy)
    """
    user = get_user(email)
    if not user: return False
    
    # Kiểm tra quyền sở hữu conversation
    stmt = select(Translate_Conversation).where(
        Translate_Conversation.id == conversation_id,
        Translate_Conversation.user_id == user.id
    )
    convo = db.session.scalar(stmt)
    
    if not convo:
        return False

    # Tạo message mới theo model Translate_Message
    new_message = Translate_Message(
        conversation_id=conversation_id,
        speaker_role=speaker_role,
        role=role,
        content=content
    )
    
    # Update thời gian cho conversation để nó nổi lên đầu list
    convo.updated_at = func.now()

    try:
        db.session.add(new_message)
        db.session.commit()
        return True
    except Exception as e:
        print(f"❌ DB Error (Save Translate Msg): {e}")
        db.session.rollback()
        return False

def get_translate_messages(email, conversation_id):
    """
    Lấy toàn bộ tin nhắn của một phiên dịch.
    """
    user = get_user(email)
    if not user: return []

    # Kiểm tra quyền sở hữu
    stmt_check = select(Translate_Conversation).where(
        Translate_Conversation.id == conversation_id, 
        Translate_Conversation.user_id == user.id
    )
    if not db.session.scalar(stmt_check): return []

    # Lấy tin nhắn, sắp xếp cũ nhất -> mới nhất
    stmt_msgs = (
        select(Translate_Message)
        .where(Translate_Message.conversation_id == conversation_id)
        .order_by(Translate_Message.created_at.asc())
    )
    messages = db.session.scalars(stmt_msgs).all()

    # Convert sang dict
    return [msg.to_dict() for msg in messages]