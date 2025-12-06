from typing import List
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.sql import func
from sqlalchemy import Index
from . import db

# 1. USER MODEL
class User(db.Model):
    id = db.mapped_column(db.Integer, primary_key=True)
    fullname = db.mapped_column(db.String(100), nullable=False)
    email = db.mapped_column(db.String(120), nullable=False)
    phone = db.mapped_column(db.String(20), nullable=True)
    lang = db.mapped_column(db.String(10), nullable=True)
    password_hash = db.mapped_column(db.String(200), nullable=False)
    avatar_url = db.mapped_column(db.String(255), nullable=True) 
    google_sub = db.mapped_column(db.String(255), nullable=True)

    # Định nghĩa ràng buộc và index
    __table_args__ = (
        db.UniqueConstraint('email', name='uq_user_email'),
        db.UniqueConstraint('google_sub', name='uq_user_google_sub'),
        Index('ix_user_email', 'email'),
        Index('ix_user_google_sub', 'google_sub'),
    )
    
    # Quan hệ 1-Nhiều với Conversation
    conversations: Mapped[List["Conversation"]] = relationship(
        'Conversation', 
        back_populates='user', 
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns if c.name != 'password_hash'}

# 2. PLACE MODEL (Giữ nguyên)
class Place(db.Model):
    id = db.mapped_column(db.Integer, primary_key=True)
    name = db.mapped_column(db.String(100), nullable=False)
    location = db.mapped_column(db.String(150), nullable=False)
    lat = db.mapped_column(db.Float, nullable=True)
    lng = db.mapped_column(db.Float, nullable=True)
    original_keyword = db.mapped_column(db.String(100), nullable=False)
    query_kw = db.mapped_column(db.String(100), nullable=False) 
    
    __table_args__=(
        Index('ix_place_lat_lng', 'lat', 'lng'),
        Index('ix_query_kw', 'query_kw')
    )

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

# 3. CONVERSATION MODEL
class Conversation(db.Model):
    id = db.mapped_column(db.Integer, primary_key=True)
    title = db.mapped_column(db.String(500), nullable=False, default="New Chat")
    
    # Foreign Key: Liên kết với bảng user
    user_id = db.mapped_column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Tự động lưu thời gian tạo và cập nhật
    created_at = db.mapped_column(db.DateTime, server_default=func.now())
    updated_at = db.mapped_column(db.DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship ngược về User
    user: Mapped["User"] = relationship('User', back_populates='conversations')

    # Relationship xuống Message (Xóa hội thoại -> Xóa tin nhắn)
    messages: Mapped[List["Message"]] = relationship(
        'Message', 
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

# 4. MESSAGE MODEL (Mới thêm)
class Message(db.Model):
    id = db.mapped_column(db.Integer, primary_key=True)
    
    # Foreign Key: Liên kết với bảng conversation
    conversation_id = db.mapped_column(db.Integer, db.ForeignKey('conversation.id'), nullable=False)
    
    # Vai trò: 'user' hoặc 'model'
    role = db.mapped_column(db.String(20), nullable=False) 
    
    # Nội dung tin nhắn (Text để lưu dài)
    content = db.mapped_column(db.Text, nullable=False)
    
    # Thời gian nhắn (SQL gọi là timestamp, ở đây dùng created_at cho chuẩn Python)
    created_at = db.mapped_column(db.DateTime, server_default=func.now())

    # Relationship ngược về Conversation
    conversation: Mapped["Conversation"] = relationship('Conversation', back_populates='messages')

    def to_dict(self):
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }