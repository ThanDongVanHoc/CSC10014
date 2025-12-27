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
    gender = db.mapped_column(db.Text, nullable=True)
    lang = db.mapped_column(db.Text, nullable=True)
    password_hash = db.mapped_column(db.Text, nullable=False)
    avatar_url = db.mapped_column(db.Text, nullable=True) 
    dob = db.Column(db.Date, nullable=True)
    google_sub = db.mapped_column(db.Text, nullable=True)
    media = db.mapped_column(db.Text, nullable=True)
    blood_type = db.mapped_column(db.String(5), nullable=True) # VD: A+, O-
    allergies = db.mapped_column(db.Text, nullable=True) # Lưu JSON string
    chronic_conditions = db.mapped_column(db.Text, nullable=True) # Lưu JSON string

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
    
    # Quan hệ 1-Nhiều với MedicalRecord
    medical_records: Mapped[List["MedicalRecord"]] = relationship(
        "MedicalRecord", 
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
    audio_url = db.mapped_column(db.Text, nullable=True)
    duration_seconds = db.mapped_column(db.Float, nullable=True)
    
    created_at = db.mapped_column(db.DateTime, server_default=func.now())

    conversation: Mapped["Translate_Conversation"] = relationship('Translate_Conversation', back_populates='messages')

    def to_dict(self):
        return {
            "id": self.id,
            "speaker_role": self.speaker_role, 
            "role": self.role,
            "content": self.content,
            "audio_url": self.audio_url,
            "duration_seconds": self.duration_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
        
        
class MedicalRecord(db.Model):
    __tablename__ = 'medical_record' # Tên bảng trong DB

    id = db.mapped_column(db.Integer, primary_key=True)
    
    # Foreign Key liên kết với User
    user_id = db.mapped_column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Thông tin từ ảnh OCR
    visit_date = db.mapped_column(db.Date, nullable=True)
    hospital_name = db.mapped_column(db.String(255), nullable=True)
    doctor_name = db.mapped_column(db.String(255), nullable=True)
    diagnosis = db.mapped_column(db.Text, nullable=True)
    symptoms = db.Column(db.Text)
    notes = db.Column(db.Text, nullable=True)
    
    # Lưu danh sách thuốc dưới dạng JSON string
    # VD: [{"name": "Augmentin", "dosage": "1g", "quantity": "14"}]
    medications = db.mapped_column(db.Text, nullable=True) 
    
    # URL ảnh minh chứng (lưu trên S3/Cloudinary hoặc local path)
    image_url = db.mapped_column(db.String(500), nullable=True)
    
    # Timestamp
    created_at = db.mapped_column(db.DateTime, server_default=func.now())

    # Relationship ngược về User
    user: Mapped["User"] = relationship('User', back_populates='medical_records')

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "visit_date": self.visit_date.isoformat() if self.visit_date else None,
            "hospital_name": self.hospital_name,
            "doctor_name": self.doctor_name,
            "diagnosis": self.diagnosis,
            "symptoms": self.symptoms,
            "notes": self.notes,
            "medications": json.loads(self.medications) if self.medications else [],
            "image_url": self.image_url,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
        
class EmergencyCard(db.Model):
    __tablename__ = 'emergency_cards'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)

    blood_group = db.Column(db.String(5))
    # Chúng ta sẽ lưu list dưới dạng JSON string (ví dụ: '["Peanuts", "Dust"]')
    allergies = db.Column(db.Text, default='[]') 
    medical_history = db.Column(db.Text, default='[]')

    # Quan hệ với bảng User
    user = db.relationship('User', backref=db.backref('emergency_card', uselist=False))

    def __repr__(self):
        return f'<EmergencyCard for User {self.user_id}>'
    
class Hospital(db.Model):
    __tablename__ = 'hospitals'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)    
    source_id = db.Column(db.String(50), unique=True, nullable=True) 

    name = db.Column(db.String(255), nullable=False) # Cột 'Ten'
    address = db.Column(db.String(500), nullable=False) # Cột 'Dia chi'
    
    # Cột 'Loai'. Nếu dùng MySQL/Postgres nên đổi thành db.JSON để dễ query
    categories = db.Column(db.Text, nullable=True) 
    
    phone_number = db.Column(db.String(50), nullable=True) # Cột 'So dien thoai'
    website = db.Column(db.String(255), nullable=True) # Cột 'Website'
    
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    
    image_url = db.Column(db.String(500), nullable=True) # Cột 'Link Anh'
    description = db.Column(db.Text, nullable=True) # Cột 'Gioi thieu'
    
    query_kw = db.Column(db.String(100), nullable=True) # Từ khóa đã xử lý
    original_keyword = db.Column(db.String(255), nullable=True) # Cột 'Tu khoa goc'

    services: Mapped[List["HospitalService"]] = relationship(
        "HospitalService", 
        back_populates="hospital", 
        cascade="all, delete-orphan"
    )

    # Đánh Index:
    # 1. lat, lng: Tìm kiếm bán kính (Nearby search)
    # 2. name: Tìm kiếm theo tên
    # 3. categories: Lọc theo loại (nếu cần)
    __table_args__ = (
        Index('ix_hospital_lat_lng', 'lat', 'lng'),
        Index('ix_hospital_query_kw', 'query_kw'),
        Index('ix_hospital_name', 'name'), 
    )

    def to_dict(self):
        # Xử lý categories từ chuỗi string sang list nếu cần thiết
        import ast
        cats = []
        if self.categories:
            try:
                # Chuyển string "['a', 'b']" thành list thực python ['a', 'b']
                cats = ast.literal_eval(self.categories) 
            except:
                cats = self.categories

        return {
            "id": self.id,
            "source_id": self.source_id,
            "name": self.name,
            "address": self.address,
            "categories": cats, 
            "phone_number": self.phone_number,
            "website": self.website,
            "lat": self.lat,
            "lng": self.lng,
            "image_url": self.image_url,
            "description": self.description,
            "query_kw": self.query_kw,
            "original_keyword": self.original_keyword
        }
    
class HospitalService(db.Model):
    __tablename__ = 'hospital_services'

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id'), nullable=False)
    
    service_name = db.Column(db.Text, nullable=False)
    price = db.Column(db.Text, nullable=True)       
    
    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="services")

    def to_dict(self):
        return {
            "id": self.id,
            "service_name": self.service_name,
            "price": self.price
        }