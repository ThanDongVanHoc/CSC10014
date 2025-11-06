from flask import redirect, render_template, url_for, session, request, abort, flash
from . import auth_bp
import os
from dotenv import load_dotenv
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
import cachecontrol
import google.auth.transport.requests
import pathlib
import requests
from app.db import db
from app.db.models import User
from sqlalchemy import select
from werkzeug.security import generate_password_hash, check_password_hash
import time
from .mail import send_verification_mail
from .gravatar_url import generate_gravatar_url

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
            google_email = id_info.get("email")

            #Query trên cột 'google_sub'
            stmt = select(User).where(User.google_sub == google_sub_id or User.email == google_email)
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
                    'expires_at': time.time() + 300  # Dữ liệu hết hạn sau 5 phút 
                }
                return redirect(url_for('.signupforgoogle')) 
                
        except Exception as e:
            print(f"Lỗi khi xác thực: {e}")
            flash("Google authentication failed. Please try again.", "danger")
            return redirect(url_for('.signin_page'))
            
    else:
        return redirect(url_for('home_page'))

@auth_bp.route('/signupforgoogle', methods=['GET', 'POST'])
def signupforgoogle():
    if "user_id" in session:
        session.pop('google_signup_data', None)
        return redirect(url_for('home_page'))
    
    # Initialize dictionary to store specific field errors
    errors = {} 

    # Get data from session
    signup_data = session.get('google_signup_data')
    
    # Check for session expiration
    if signup_data and 'expires_at' in signup_data and time.time() > signup_data['expires_at']:
        session.pop('google_signup_data', None)
        flash("Registration session has expired. Please sign in again using Google.", "danger")
        return redirect(url_for('.signup_page'))

    # If no data (direct URL access), redirect to sign-in
    if not signup_data:
        flash("Please sign in with Google first.", "info")
        return redirect(url_for('.signin_page'))

    if request.method == 'POST':
        phone = request.form.get('phone')
        lang = request.form.get('lang')
        password = request.form['password']
        confirm = request.form['confirm']

        # Check required fields (Password)
        if not password:
            errors['password'] = 'Please enter a password.'
        if not confirm:
            errors['confirm'] = 'Please confirm your password.'

        # Check for password mismatch
        if password and confirm and password != confirm:
            errors['confirm'] = 'Passwords do not match!'
            
        # If there are errors, re-render the template with errors and old data
        if errors:
            # Pass back the old data (phone and lang)
            form_data = {
                'phone': phone, 
                'lang': lang
            }
            # Pass errors and form data to the template
            return render_template('signupforgoogle.html', errors=errors, form_data=form_data, signup_data=signup_data)
        
        # You'll need to ensure generate_password_hash is imported 
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

        flash('Account created successfully!', 'success')
        return redirect(url_for('home_page')) 

    else:
        return render_template('signupforgoogle.html', errors={}, form_data={})

@auth_bp.route('/signin', methods=['GET', 'POST'])
def signin_page():
    if "user_id" in session:
        return redirect(url_for('home_page'))
    
    session.pop('signup_info', None)
    
    errors = {}
    form_data = {}

    if request.method == 'POST':
        email = request.form.get("email")
        password = request.form.get("password")
        
        form_data['email'] = email if email else ''

        # Check for missing required fields
        if not email:
            errors['email'] = 'Please enter your Email or Username.'
        if not password:
            errors['password'] = 'Please enter your password.'

        # If fields are not empty, proceed to check credentials
        if not errors:
            stmt = select(User).where(User.email == email)
            user = db.session.scalars(stmt).first()

            if not user:
                errors['email'] = 'This Email account does not exist.'
            elif not check_password_hash(user.password_hash, password):
                errors['password'] = 'Incorrect password.'

            if not errors:
                session['user_id'] = user.id
                session['fullname'] = user.fullname
                session['avatar'] = user.avatar_url
                return redirect(url_for('home_page'))
        return render_template('signin.html', errors=errors, form_data=form_data)
            
    else:
        return render_template('signin.html', errors=errors, form_data=form_data)

@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup_page():
    # If user is already logged in, redirect them to the index page
    if "user_id" in session:
        return render_template('index.html')
    
    session.pop("signup_info", None)

    # Initialize a dictionary to store specific field errors
    errors = {} 

    if request.method == 'POST':
        fullname = request.form['fullname']
        email = request.form['email']
        phone = request.form.get('phone')
        lang = request.form.get('lang')
        password = request.form['password']
        confirm = request.form['confirm']

        # Check for required fields
        if not fullname:
            errors['fullname'] = 'Please enter your full name.'
        if not email:
            errors['email'] = 'Please enter your email.'
        if not password:
            errors['password'] = 'Please enter a password.'

        # Check for password mismatch
        if password and confirm and password != confirm:
            errors['confirm'] = 'Passwords do not match!'

        # Check for existing email (only if email is provided and no previous email error)
        if not errors.get('email'): 
            # Assuming 'User' and 'db' are defined elsewhere
            stmt = select(User).where(User.email == email)
            existing_user = db.session.scalars(stmt).first()
            if existing_user:
                errors['email'] = 'This email is already in use!'
        
        # If there are errors, re-render the template with errors and old data
        if errors:
            # Pass back the original form data so the user doesn't have to re-enter
            form_data = {
                'fullname': fullname, 
                'email': email, 
                'phone': phone, 
                'lang': lang,
                'password': password,
                'confirm': confirm
            }
            return render_template('signup.html', errors=errors, form_data=form_data)
        
        hashed_pw = generate_password_hash(password)

        session["signup_info"] = {
            "fullname": fullname,
            "email": email,
            "phone": phone,
            "lang": lang,
            "password_hash": hashed_pw,
            "expires_at": time.time() + 600
        }
        email = session["signup_info"]["email"]
        if send_verification_mail(email):
            return redirect(url_for('.verification'))
        else:
            errors['email'] = 'Failed to send verification email. Please check the address and try again.'
            form_data = {
                'fullname': fullname, 
                'email': email, 
                'phone': phone, 
                'lang': lang,
                'password': password,
                'confirm': confirm
            }
            return render_template('signup.html', errors=errors, form_data=form_data)
    else:
        return render_template('signup.html', errors={}, form_data={})

@auth_bp.route('/logout')
def logout():   
    session.pop('user_id', None)
    session.pop('fullname', None)
    session.pop('avatar', None)
    return redirect(url_for('home_page'))

@auth_bp.route('/verification', methods = ['GET', 'POST'])
def verification():
    if "user_id" in session:
        return render_template('index.html')
    if "signup_info" not in session:
        return redirect(url_for('.signup_page'))
    if "expires_at" in session["signup_info"] and time.time() > session["signup_info"]["expires_at"]:
        session.pop("signup_info", None)
        session.pop("verification", None)
        flash("Registration session has expired.", "danger")
        return redirect(url_for('signup_page'))
    errors = {}
    email = session["signup_info"]["email"]
    if request.method == "POST":
        if "expires_at" in session["verification"] and time.time() > session["verification"]["expires_at"]:
            errors["code"] = "Code expires. Please resend code"
            return render_template('verificationcode.html', errors=errors, email=email)
        elif request.form.get("code") != session["verification"]["code"]:
            errors["code"] = "Code doesn't match. Please enter again"
            return render_template('verificationcode.html', errors=errors, email=email)
        
        signup_info = session["signup_info"]
        avatar_url = generate_gravatar_url(signup_info["email"])
        new_user = User(
            fullname=signup_info['fullname'],
            email=signup_info['email'],
            phone=signup_info["phone"], 
            lang=signup_info["lang"], 
            password_hash=signup_info["password_hash"],
            google_sub=None,
            avatar_url=avatar_url
        )
        db.session.add(new_user)
        db.session.commit()
        
        session.pop("signup_info", None)
        session.pop("verification", None)

        session["user_id"] = new_user.id
        session["fullname"] = new_user.fullname
        session["avatar"] = new_user.avatar_url

        return redirect(url_for('home_page'))
    else:
        return render_template('verificationcode.html', errors=errors, email=email)

@auth_bp.route('/resendcode')
def resend_code():
    if "user_id" in session:
        return render_template('index.html')
    if "signup_info" not in session:
        return redirect(url_for('.signup_page'))
    if "expires_at" in session["signup_info"] and time.time() > session["signup_info"]["expires_at"]:
        session.pop("signup_info", None)
        session.pop("verification", None)
        flash("Registration session has expired.", "danger")
        return redirect(url_for('signup_page'))

    last_sent_time = session.get("verification_last_sent", 0)
    current_time = time.time()
    wait_time = 10
    
    if current_time - last_sent_time < wait_time:
        seconds_left = int(wait_time - (current_time - last_sent_time))
        flash(f"Please wait {seconds_left} more seconds before resending.", "info")
        return redirect(url_for('.verification'))

    signup_info = session["signup_info"]    
    if send_verification_mail(signup_info['email']):
        session["verification_last_sent"] = time.time()
        flash("A new verification code has been sent.", "success")
    else:
        flash("Failed to send email. Please try again later.", "danger")

    return redirect(url_for('.verification'))
