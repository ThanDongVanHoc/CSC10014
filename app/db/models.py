from sqlalchemy.orm import mapped_column
from . import db

class User(db.Model):
    id = db.mapped_column(db.Integer, primary_key=True)
    fullname = db.mapped_column(db.String(100), nullable=False)
    email = db.mapped_column(db.String(120), unique=True, nullable=False)
    phone = db.mapped_column(db.String(20))
    lang = db.mapped_column(db.String(10))
    password_hash = db.mapped_column(db.String(200), nullable=False)
    avatar_url = db.Column(db.String(255), nullable=True)