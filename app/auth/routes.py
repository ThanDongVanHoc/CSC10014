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
from werkzeug.security import generate_password_hash
import time
from .mail import send_verification_mail
from .utils import (
    login_is_required,
    signup_info_required,
    reset_pass_info_required,
    login_user_session,
    logout_user_session,
    get_user_by_email,
    get_user_by_google_sub_or_email,
    verify_user_password,
    create_google_user,
    create_local_user,
    get_session_data,
    clear_auth_session
)

load_dotenv()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
client_secrets_file = os.path.join(pathlib.Path(__file__).parent, "client_secrets.json")
# Chỉ dùng cho development, không dùng "1" trên production
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1" 

flow = Flow.from_client_secrets_file(
    client_secrets_file=client_secrets_file,
    scopes=["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email", "openid"],
    redirect_uri="http://127.0.0.1:5000/auth/callback"
)

@auth_bp.route('/googlelogin')
@clear_auth_session
def google_login():
    if "user_id" in session:
        return redirect(url_for('home_page'))
    authorization_url, state = flow.authorization_url()
    session["state"] = state
    return redirect(authorization_url)

@auth_bp.route('/callback')
def callback():
    if "user_id" in session:
        return redirect(url_for('home_page'))
    
    try:
        flow.fetch_token(authorization_response=request.url)

        if "state" not in session or session["state"] != request.args["state"]:
            abort(500) # Lỗi state mismatch

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

        user = get_user_by_google_sub_or_email(google_sub_id, google_email)

        if user:
            login_user_session(user)
            session.pop('google_signup_data', None) # Dọn dẹp
            return redirect(url_for('home_page'))
        else:
            # User chưa có tài khoản, lưu thông tin để điền form bổ sung
            session["google_signup_data"] = {
                'sub' : google_sub_id, 
                'fullname' : id_info.get('name'),
                'email': id_info.get('email'),
                'picture': id_info.get('picture'),
                'expires_at': time.time() + 300 # 5 phút để hoàn tất
            }
            return redirect(url_for('.signupforgoogle')) 
            
    except Exception as e:
        print(f"Lỗi khi xác thực Google: {e}")
        flash("Google authentication failed. Please try again.", "danger")
        return redirect(url_for('.signup_page'))

@auth_bp.route('/signupforgoogle', methods=['GET', 'POST'])
def signupforgoogle():
    if "user_id" in session:
        session.pop('google_signup_data', None)
        return redirect(url_for('home_page'))
    
    errors = {} 
    signup_data = get_session_data('google_signup_data') 

    if not signup_data:
        flash("Registration session has expired or is invalid. Please sign in again using Google.", "danger")
        return redirect(url_for('.signup_page'))

    if request.method == 'POST':
        phone = request.form.get('phone')
        lang = request.form.get('lang')
        password = request.form['password']
        confirm = request.form['confirm']

        if password and confirm and password != confirm:
            errors['confirm'] = 'Passwords do not match!'
            
        if errors:
            form_data = {'phone': phone, 'lang': lang}
            return render_template('signupforgoogle.html', errors=errors, form_data=form_data, signup_data=signup_data)
        
        new_user = create_google_user(
            data=signup_data, 
            password=password, 
            phone=phone, 
            lang=lang
        )

        session.pop('google_signup_data', None)
        login_user_session(new_user) 

        flash('Account created successfully!', 'success')
        return redirect(url_for('home_page')) 

    else:
        return render_template('signupforgoogle.html', errors={}, form_data={}, signup_data=signup_data)

@auth_bp.route('/signin', methods=['GET', 'POST'])
@clear_auth_session
def signin_page():
    if "user_id" in session:
        return redirect(url_for('home_page'))
    
    errors = {}
    form_data = {}

    if request.method == 'POST':
        email = request.form.get("email")
        password = request.form.get("password")
        form_data['email'] = email if email else ''

        if not errors:
            user = get_user_by_email(email)
            
            if not user:
                errors['email'] = 'This Email account does not exist.'
            elif not verify_user_password(user, password):
                errors['password'] = 'Incorrect password.'

            if not errors:
                login_user_session(user) 
                return redirect(url_for('home_page'))
        return render_template('signin.html', errors=errors, form_data=form_data)
    else:
        return render_template('signin.html', errors=errors, form_data=form_data)

@auth_bp.route('/signup', methods=['GET', 'POST'])
@clear_auth_session
def signup_page():
    if "user_id" in session:
        return redirect(url_for('home_page'))
    
    errors = {} 

    if request.method == 'POST':
        fullname = request.form['fullname']
        email = request.form['email']
        phone = request.form.get('phone')
        lang = request.form.get('lang')
        password = request.form['password']
        confirm = request.form['confirm']

        if password and confirm and password != confirm:
            errors['confirm'] = 'Passwords do not match!'

        if not errors.get('email'): 
            existing_user = get_user_by_email(email)
            if existing_user:
                errors['email'] = 'This email is already in use!'
        
        if errors:
            form_data = {
                'fullname': fullname, 'email': email, 'phone': phone, 
                'lang': lang, 'password': password, 'confirm': confirm
            }
            return render_template('signup.html', errors=errors, form_data=form_data)
        
        hashed_pw = generate_password_hash(password)

        session["signup_info"] = {
            "fullname": fullname,
            "email": email,
            "phone": phone,
            "lang": lang,
            "password_hash": hashed_pw,
            "expires_at": time.time() + 600, # 10 phút để xác minh
            "errors": {} # Thêm một key để chứa lỗi xác minh
        }
        
        if send_verification_mail(email):
            session["verification_last_sent"] = time.time() # Chống spam resend
            return redirect(url_for('.handle_verify_signup'))
        else:
            errors['email'] = 'Failed to send verification email. Please check the address and try again.'
            form_data = {
                'fullname': fullname, 'email': email, 'phone': phone, 
                'lang': lang, 'password': password, 'confirm': confirm
            }
            session.pop("signup_info", None) # Xóa session nếu gửi mail lỗi
            return render_template('signup.html', errors=errors, form_data=form_data)
    else:
        return render_template('signup.html', errors={}, form_data={})

@auth_bp.route('/logout')
@login_is_required
def logout():
    logout_user_session() 
    flash("You have been logged out.", "success")
    return redirect(url_for('home_page'))

@auth_bp.route('/handle_verify_signup')
@signup_info_required 
def handle_verify_signup():
    signup_info = session["signup_info"]
    # Lấy lỗi từ session (nếu có) và sau đó xóa đi
    errors = signup_info.get("errors", {})
    if "errors" in session["signup_info"]:
         session["signup_info"]["errors"] = {} 
         session.modified = True
         
    email = signup_info["email"]

    return render_template('verify.html', action_url=url_for('.verify_signup'), resend_url=url_for('.resendcode_verify'), previous_url=url_for('.signup_page'), email=email, errors=errors)

@auth_bp.route('/verify_signup', methods = ['POST'])
@clear_auth_session
@signup_info_required 
def verify_signup():
    signup_info = session["signup_info"]
    email = signup_info["email"]
    errors = {}

    verification_data = get_session_data('verification')

    if not verification_data:
        errors["code"] = "Code has expired. Please request a new one."
    
    if not errors:
        verification_code = verification_data.get("code")
        if not verification_code or request.form.get("code") != verification_code:
            errors["code"] = "Code does not match. Please try again."

    if errors:
        # Lưu lỗi vào session và redirect về trang handle để hiển thị
        session["signup_info"]["errors"] = errors
        session.modified = True
        return redirect(url_for('.handle_verify_signup'))

    # Nếu không lỗi -> Tạo user
    new_user = create_local_user(signup_info)

    login_user_session(new_user)
    
    flash("Your account has been successfully verified and created!", "success")
    return redirect(url_for('home_page'))

@auth_bp.route('/resendcode_verify')
@signup_info_required 
def resendcode_verify():
    last_sent_time = session.get("verification_last_sent", 0)
    current_time = time.time()
    wait_time = 10 # Chờ 10 giây
    
    if current_time - last_sent_time < wait_time:
        seconds_left = int(wait_time - (current_time - last_sent_time))
        flash(f"Please wait {seconds_left} more seconds before resending.", "info")
        return redirect(url_for('.handle_verify_signup'))

    signup_info = session["signup_info"]    
    if send_verification_mail(signup_info['email']):
        session["verification_last_sent"] = time.time()
        flash("A new verification code has been sent.", "success")
    else:
        flash("Failed to send email. Please try again later.", "danger")

    return redirect(url_for('.handle_verify_signup'))

@auth_bp.route('/reset_pass', methods = ['GET', 'POST'])
@clear_auth_session
def reset_pass():
    if "user_id" in session:
        return redirect(url_for('home_page'))

    errors = {}
    form_data = {}

    if request.method == 'POST':
        email = request.form.get("email")
        password = request.form.get("password")
        cf_password = request.form.get("confirm")
        form_data['email'] = email if email else ''

        user = None 
        if not errors:
            user = get_user_by_email(email)
            
            if not user:
                errors['email'] = 'This Email account does not exist.'
            elif password and cf_password and password != cf_password:
                errors['confirm'] = 'Passwords do not match!'
        
        if errors:
            form_data = {"email":email}
            return render_template('resetpass.html', form_data = form_data, errors = errors)
        else:
            hashed_pw = generate_password_hash(password)
            session["reset_pass_info"] = {
                "email": user.email, 
                "new_password_hash": hashed_pw,
                "expires_at": time.time() + 600, 
                "errors": {}
            }
            
            if send_verification_mail(email):
                session["verification_last_sent"] = time.time() 
                return redirect(url_for('.handle_reset_pass'))
            else:
                errors['email'] = 'Failed to send verification email. Please check the address and try again.'
                form_data = {"email":email}
                session.pop("reset_pass_info", None)
                return render_template('resetpass.html', form_data = form_data, errors = errors)
            
    else:
        return render_template('resetpass.html', form_data = {}, errors = {})
    
@auth_bp.route('/handle_reset_pass')
@reset_pass_info_required 
def handle_reset_pass():
    reset_pass_info = session["reset_pass_info"]
    errors = reset_pass_info.get("errors", {})
    if "errors" in session["reset_pass_info"]:
         session["reset_pass_info"]["errors"] = {} 
         session.modified = True
         
    email = reset_pass_info["email"]

    return render_template('verify.html', action_url=url_for('.verify_reset_pass'), resend_url=url_for('.resendcode_resetpass'), previous_url=url_for('.reset_pass'), email=email, errors=errors)

@auth_bp.route('/verify_reset_pass', methods=['POST']) 
@reset_pass_info_required 
@clear_auth_session
def verify_reset_pass():
    reset_pass_info = session["reset_pass_info"]
    email = reset_pass_info["email"]
    errors = {}

    verification_data = get_session_data('verification')

    if not verification_data:
        errors["code"] = "Code has expired. Please request a new one."
    
    if not errors:
        verification_code = verification_data.get("code")
        if not verification_code or request.form.get("code") != verification_code:
            errors["code"] = "Code does not match. Please try again."

    if errors:
        session["reset_pass_info"]["errors"] = errors
        session.modified = True
        return redirect(url_for('.handle_reset_pass'))

    user = get_user_by_email(reset_pass_info["email"]) 
    if user:
        user.password_hash = reset_pass_info["new_password_hash"]
        db.session.commit()
    
    flash("You have changed password successfully", "success")
    return redirect(url_for('.signin_page'))

@auth_bp.route('/resendcode_resetpass')
@reset_pass_info_required 
def resendcode_resetpass():
    last_sent_time = session.get("verification_last_sent", 0)
    current_time = time.time()
    wait_time = 10 # Chờ 10 giây
    
    if current_time - last_sent_time < wait_time:
        seconds_left = int(wait_time - (current_time - last_sent_time))
        flash(f"Please wait {seconds_left} more seconds before resending.", "info")
        return redirect(url_for('.handle_reset_pass'))

    reset_info = session["reset_pass_info"]    
    if send_verification_mail(reset_info['email']):
        session["verification_last_sent"] = time.time()
        flash("A new verification code has been sent.", "success")
    else:
        flash("Failed to send email. Please try again later.", "danger")
    return redirect(url_for('.handle_reset_pass'))