from sqlalchemy.orm import mapped_column
from . import db
from sqlalchemy import Index

class User(db.Model):
    id = db.mapped_column(db.Integer, primary_key=True)
    fullname = db.mapped_column(db.String(100), nullable=False)
    email = db.mapped_column(db.String(120), nullable=False)
    phone = db.mapped_column(db.String(20), nullable=True)
    lang = db.mapped_column(db.String(10), nullable=True)
    password_hash = db.mapped_column(db.String(200), nullable=False)
    avatar_url = db.mapped_column(db.String(255), nullable=True) 
    google_sub = db.mapped_column(db.String(255), nullable=True)

    # Thêm __table_args__ để định nghĩa và ĐẶT TÊN cho các ràng buộc
    __table_args__ = (
        db.UniqueConstraint('email', name='uq_user_email'),
        db.UniqueConstraint('google_sub', name='uq_user_google_sub'),
        # Thêm Index (chỉ mục) giúp tìm kiếm email và google_sub nhanh hơn
        Index('ix_user_email', 'email'),
        Index('ix_user_google_sub', 'google_sub'),
    )