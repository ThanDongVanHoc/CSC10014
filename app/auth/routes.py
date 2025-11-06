from flask import redirect, render_template, url_for, session, request, abort, flash
from . import auth_bp
import os
from dotenv import load_dotenv
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from pip._vendor import cachecontrol
import google.auth.transport.requests
import pathlib
import requests
from app.db import db
from app.db.models import User
from sqlalchemy import select
from werkzeug.security import generate_password_hash, check_password_hash
import time


load_dotenv()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
client_secrets_file = os.path.join(pathlib.Path(__file__).parent, "client_secrets.json")
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

flow = Flow.from_client_secrets_file(
    client_secrets_file=client_secrets_file,
    scopes=["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email", "openid"],
    redirect_uri="http://127.0.0.1:5000/auth/callback"
)

def login_is_required(function):
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for('auth.signin_page'))
        else:
            return function(*args, **kwargs)
    return wrapper

@auth_bp.route('/googlelogin')
def google_login():
    if "user_id" in session:
        return redirect(url_for('home_page'))
    authorization_url, state = flow.authorization_url()
    session["state"] = state
    session.pop('signup_info', None)
    return redirect(authorization_url)

@auth_bp.route('/callback')
def callback():
    if "user_id" not in session: 
        try:
            flow.fetch_token(authorization_response=request.url)

            if not session["state"] == request.args["state"]:
                abort(500) 

            credentials = flow.credentials
            
            request_session = requests.session()
            cached_session = cachecontrol.CacheControl(request_session)
            token_request = google.auth.transport.requests.Request(session=cached_session)

            id_info = id_token.verify_oauth2_token(
                id_token=credentials._id_token,
                request=token_request,
                audience=GOOGLE_CLIENT_ID
            )
            
            google_sub_id = id_info.get("sub")

            #Query trên cột 'google_sub'
            stmt = select(User).where(User.google_sub == google_sub_id)
            user = db.session.scalars(stmt).first()

            if user:
                session["user_id"] = user.id 
                session["fullname"] = user.fullname 
                session["avatar"] = user.avatar_url
                session.pop('google_signup_data', None)
                return redirect(url_for('home_page'))
            else:
                session["google_signup_data"] = {
                    'sub' : google_sub_id, 
                    'fullname' : id_info.get('name'),
                    'email': id_info.get('email'),
                    'picture': id_info.get('picture'),
                    'expires_at': time.time() + 300  # Dữ liệu hết hạn sau 5 phút (5 giây)
                }
                return redirect(url_for('.signupforgoogle')) 
                
        except Exception as e:
            print(f"Lỗi khi xác thực: {e}")
            flash("Lỗi xác thực Google. Vui lòng thử lại.", "danger")
            return redirect(url_for('.signin_page'))
            
    else:
        return redirect(url_for('home_page'))

@auth_bp.route('/signupforgoogle', methods=['GET', 'POST'])
def signupforgoogle():
    if "user_id" in session:
        session.pop('google_signup_data', None)
        return redirect(url_for('home_page'))
    
    # Lấy data từ session
    signup_data = session.get('google_signup_data')
    
    if signup_data and 'expires_at' in signup_data and time.time() > signup_data['expires_at']:
        session.pop('google_signup_data', None)
        flash("Phiên đăng ký đã hết hạn. Vui lòng đăng nhập lại bằng Google.", "danger")
        return redirect(url_for('.signup_page'))

    # Nếu không có data (vào thẳng URL) thì đá về trang đăng nhập
    if not signup_data:
        flash("Vui lòng đăng nhập bằng Google trước.", "info")
        return redirect(url_for('.signin_page'))

    if request.method == 'POST':
        phone = request.form.get('phone')
        lang = request.form.get('lang')
        password = request.form['password']
        confirm = request.form['confirm']

        if password != confirm:
            flash('Mật khẩu không khớp!', 'danger')
            return redirect(url_for('.signupforgoogle'))

        hashed_pw = generate_password_hash(password)
        
        new_user = User(
            fullname=signup_data['fullname'],
            email=signup_data['email'],
            phone=phone, 
            lang=lang, 
            password_hash=hashed_pw,
            google_sub=signup_data['sub'],
            avatar_url=signup_data['picture']
        )
        
        db.session.add(new_user)
        db.session.commit()

        session.pop('google_signup_data', None)

        session['user_id'] = new_user.id
        session['fullname'] = new_user.fullname
        session['avatar'] = new_user.avatar_url

        flash('Tạo tài khoản thành công!', 'success')
        return redirect(url_for('home_page')) 

    else:
        return render_template('signupforgoogle.html')

@auth_bp.route('/signin', methods = ['GET', 'POST'])
def signin_page():
    if request.method == 'POST':
        email = request.form["email"]
        password = request.form["password"]
        stmt = select(User).where(User.email == email)
        user = db.session.scalars(stmt).first()
        if not user or not check_password_hash(user.password_hash, password):
            flash('Email hoặc mật khẩu không chính xác.')
            return redirect(url_for('.signin_page'))
            
        session['user_id'] = user.id
        session['fullname'] = user.fullname
        session['avatar'] = user.avatar_url
        return redirect(url_for('home_page'))
    else:
        return render_template('signin.html')

@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup_page():
    if "user_id" in session:
        return render_template('index.html')
    
    return render_template('signup.html')

@auth_bp.route('/logout')
def logout():   
    session.pop('user_id', None)
    session.pop('fullname', None)
    session.pop('avatar', None)
    return redirect(url_for('home_page'))

'''
@auth_bp.route('/verification', methods = ['GET', 'POST'])
def verification():
    if "user_id" in session:
        return render_template('index.html')
    if "email" not in session:
        return redirect(url_for('.signup_page'))
    if request.method == 'POST':
        
    else:
        return render_template('verificationcode.html')
'''

