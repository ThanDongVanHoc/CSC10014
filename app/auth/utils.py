import time
from functools import wraps
from flask import session, redirect, url_for, render_template, flash
from app.db import db
from app.db.models import User
from sqlalchemy import select, or_
from werkzeug.security import generate_password_hash, check_password_hash
from .gravatar_url import generate_gravatar_url

def login_is_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            flash("You must be logged in to view this page.", "info")
            return redirect(url_for('auth.signin_page'))
        return function(*args, **kwargs)
    return wrapper

def signup_info_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        if "user_id" in session:
            return redirect(url_for('home_page'))
        
        signup_info = get_session_data('signup_info')
        
        if not signup_info:
            session.pop("verification", None)
            flash("Your registration session could not be found. Please start over.", "danger")
            return redirect(url_for('.signup_page'))
        
        return function(*args, **kwargs)
    return wrapper

def reset_pass_info_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        if "user_id" in session:
            return redirect(url_for('home_page'))

        reset_info = get_session_data('reset_pass_info') 
        
        if not reset_info:
            session.pop("verification", None) # Dọn dẹp
            flash("Your password reset session could not be found or has expired. Please start over.", "danger")
            return redirect(url_for('.reset_pass'))
        
        return function(*args, **kwargs)
    return wrapper

def login_user_session(user: User):
    session["user_id"] = user.id
    session["fullname"] = user.fullname
    session["avatar"] = user.avatar_url

def logout_user_session():
    session.pop("user_id", None)
    session.pop("fullname", None)
    session.pop("avatar", None)

def get_user_by_email(email: str) -> User | None:
    stmt = select(User).where(User.email == email)
    return db.session.scalars(stmt).first()

def get_user_by_google_sub_or_email(google_sub: str, email: str) -> User | None:
    stmt = select(User).where(
        or_(User.google_sub == google_sub, User.email == email)
    )
    return db.session.scalars(stmt).first()

def verify_user_password(user: User, password: str) -> bool:
    if not user:
        return False
    return check_password_hash(user.password_hash, password)

def create_google_user(data: dict, password: str, phone: str, lang: str) -> User:
    hashed_pw = generate_password_hash(password)
    new_user = User(
        fullname=data['fullname'],
        email=data['email'],
        phone=phone, 
        lang=lang, 
        password_hash=hashed_pw,
        google_sub=data['sub'],
        avatar_url=data['picture']  
    )
    db.session.add(new_user)
    db.session.commit()
    return new_user

def create_local_user(data: dict) -> User:
    avatar_url = generate_gravatar_url(data["email"])
    new_user = User(
        fullname=data['fullname'],
        email=data['email'],
        phone=data["phone"], 
        lang=data["lang"], 
        password_hash=data["password_hash"],
        google_sub=None,
        avatar_url=avatar_url
    )
    db.session.add(new_user)
    db.session.commit()
    return new_user

def get_session_data(session_key: str) -> dict | None:
    session_data = session.get(session_key)
    if not session_data:
        return None 
    
    expires_at = session_data.get('expires_at')
    if not expires_at:
        return session_data 
        
    if time.time() > expires_at:
        session.pop(session_key, None) 
        return None
    
    return session_data

def clear_signup_signin_session():
    session.pop("verification", None)
    session.pop("verification_last_sent", None)
    session.pop('signup_info', None) 
    session.pop('google_signup_data', None) 
    session.pop("reset_pass_info", None)