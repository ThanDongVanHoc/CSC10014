from typing import List
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.sql import func
from sqlalchemy import Index
from . import db

# 1. USER MODEL
class User(db.Model):
    __tablename__ = 'user' # Định danh rõ tên bảng
    id = db.mapped_column(db.Integer, primary_key=True)
    fullname = db.mapped_column(db.Text, nullable=False)
    email = db.mapped_column(db.Text, nullable=False)
    phone = db.mapped_column(db.Text, nullable=True)
    lang = db.mapped_column(db.Text, nullable=True)
    password_hash = db.mapped_column(db.Text, nullable=False)
    avatar_url = db.mapped_column(db.Text, nullable=True) 
    google_sub = db.mapped_column(db.Text, nullable=True)
    media = db.mapped_column(db.Text, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('email', name='uq_user_email'),
        db.UniqueConstraint('google_sub', name='uq_user_google_sub'),
        Index('ix_user_email', 'email'),
        Index('ix_user_google_sub', 'google_sub'),
    )
    
    # --- Quan hệ Chat AI ---
    conversations: Mapped[List["Chat_Conversation"]] = relationship(
        "Chat_Conversation", 
        back_populates="user", 
        cascade="all, delete-orphan"
    )

    search_histories : Mapped[List["SearchHistory"]] = relationship(
        "SearchHistory",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    # --- Quan hệ Translate ---
    translate_conversations: Mapped[List["Translate_Conversation"]] = relationship(
        "Translate_Conversation",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns if c.name != 'password_hash'}

# 2. PLACE MODEL
class Place(db.Model):
    __tablename__ = 'place'
    id = db.mapped_column(db.Integer, primary_key=True)
    name = db.mapped_column(db.Text, nullable=False)
    location = db.mapped_column(db.Text, nullable=False)
    lat = db.mapped_column(db.Float, nullable=False)
    lng = db.mapped_column(db.Float, nullable=False)
    img = db.mapped_column(db.Text, nullable=False)
    original_keyword = db.mapped_column(db.Text, nullable=False)
    intro = db.mapped_column(db.Text, nullable=False)
    phone_number = db.mapped_column(db.Text, nullable=True)
    website = db.mapped_column(db.Text, nullable=True)
    query_kw = db.mapped_column(db.Text, nullable=False) 

    __table_args__=(
        Index('ix_place_lat_lng', 'lat', 'lng'),
        Index('ix_query_kw', 'query_kw')
    )

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

# 3. CHAT CONVERSATION MODEL
class Chat_Conversation(db.Model):
    __tablename__ = 'chat_conversation' 
    id = db.mapped_column(db.Integer, primary_key=True)
    title = db.mapped_column(db.Text, nullable=False, default="New Chat")
    
    user_id = db.mapped_column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    created_at = db.mapped_column(db.DateTime, server_default=func.now())
    updated_at = db.mapped_column(db.DateTime, server_default=func.now(), onupdate=func.now())
    context_data = db.mapped_column(db.Text, nullable=True)
    
    user: Mapped["User"] = relationship('User', back_populates='conversations')

    messages: Mapped[List["Chat_Message"]] = relationship(
        'Chat_Message', 
        back_populates='conversation', 
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

# 4. CHAT MESSAGE MODEL
class Chat_Message(db.Model):
    __tablename__ = 'chat_message'
    id = db.mapped_column(db.Integer, primary_key=True)
    
    conversation_id = db.mapped_column(db.Integer, db.ForeignKey('chat_conversation.id'), nullable=False)
    
    role = db.mapped_column(db.Text, nullable=False) 
    guide_data = db.mapped_column(db.Text, nullable=True)
    content = db.mapped_column(db.Text, nullable=False)
    created_at = db.mapped_column(db.DateTime, server_default=func.now())

    conversation: Mapped["Chat_Conversation"] = relationship('Chat_Conversation', back_populates='messages')

    def to_dict(self):
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "guide_data": self.guide_data,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

# 5. SEARCH HISTORY MODEL
class SearchHistory(db.Model):   
    __tablename__ = 'search_history'
    id = db.mapped_column(db.Integer, primary_key=True)
    user_id = db.mapped_column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    keyword = db.mapped_column(db.Text, nullable=False)
    created_at = db.mapped_column(db.DateTime, server_default=func.now())
    user = relationship("User", back_populates="search_histories")

    def to_dict(self):
        return {
            "id": self.id,
            "keyword": self.keyword,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Translate_Conversation(db.Model):
    __tablename__ = 'translate_conversation'
    
    id = db.mapped_column(db.Integer, primary_key=True)
    title = db.mapped_column(db.Text, nullable=False, default="New Translation") 
    
    user_id = db.mapped_column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    created_at = db.mapped_column(db.DateTime, server_default=func.now())
    updated_at = db.mapped_column(db.DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship('User', back_populates='translate_conversations')

    messages: Mapped[List["Translate_Message"]] = relationship(
        'Translate_Message',
        back_populates='conversation',
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Translate_Message(db.Model):
    __tablename__ = 'translate_message'
    
    id = db.mapped_column(db.Integer, primary_key=True)
    
    conversation_id = db.mapped_column(db.Integer, db.ForeignKey('translate_conversation.id'), nullable=False)

    speaker_role = db.mapped_column(db.Text, nullable=False) 
    
    role = db.mapped_column(db.Text, nullable=False)
    content = db.mapped_column(db.Text, nullable=False)
    
    created_at = db.mapped_column(db.DateTime, server_default=func.now())

    conversation: Mapped["Translate_Conversation"] = relationship('Translate_Conversation', back_populates='messages')

    def to_dict(self):
        return {
            "id": self.id,
            "speaker_role": self.speaker_role, 
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }