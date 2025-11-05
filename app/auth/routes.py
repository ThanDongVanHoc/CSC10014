from flask import redirect, render_template, url_for, session, request, abort
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
    def wrapper(*args, kwargs):
        if "user_id" not in session:
            redirect(url_for('auth.signin'))
        else:
            return function(*args, **kwargs)
    return wrapper

@auth_bp.route('/googlelogin')
def google_login():
    authorization_url, state = flow.authorization_url()
    session["state"] = state
    return redirect(authorization_url)

@auth_bp.route('/callback')
def callback():
    if "user_id" not in session: 
        # Lấy token từ Google
        flow.fetch_token(authorization_response=request.url)
        # KIỂM TRA BẢO MẬT (quan trọng!)
        if not session["state"] == request.args["state"]:
            abort(500)  # Nếu 'state' không khớp, dừng lại ngay!
        # Lấy thông tin xác thực (credentials)
        credentials = flow.credentials
        # ... (Thiết lập session request để xác thực token) ...
        request_session = requests.session()
        cached_session = cachecontrol.CacheControl(request_session)
        token_request = google.auth.transport.requests.Request(session=cached_session)

        # Xác thực ID Token và lấy thông tin người dùng
        id_info = id_token.verify_oauth2_token(
            id_token=credentials._id_token,
            request=token_request,
            audience=GOOGLE_CLIENT_ID
        )
        user_id = id_info.get("sub")
        stmt = select(User).where(User.id == user_id)
        user = db.session.scalars(stmt).first()

        if user:
            session["user_id"] = user_id
            session["fullname"] = id_info.get("name")
            return redirect(url_for('home_page'))
        else:
            session["id_info"] = {
                'user_id' : user_id,
                'fullname' : id_info.get('name'),
                'email': id_info.get('email'),
            }
            return redirect(url_for({'.signupforgoogle'}))
    else:
        return redirect(url_for('home_page'))

@auth_bp.route('/signin', methods = ['GET'])
def signin_page():
    return render_template('signin.html')

@auth_bp.route('/signup', methods=['GET'])
def signup_page():
    if "user_id" in session:
        return render_template('index.html')
    return render_template('signup.html')

@auth_bp.route('/logout')
def logout():   
    session.pop('user_id', None)
    session.pop('fullname', None)
    return redirect(url_for('home_page'))

