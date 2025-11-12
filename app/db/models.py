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

