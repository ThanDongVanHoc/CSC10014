from flask import Flask, render_template, request, redirect, flash, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from .auth import auth_bp
from .db import init_app
import os
import pathlib

# Xác định thư mục cơ sở (nơi chứa app.py)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Xây dựng đường dẫn tuyệt đối đến thư mục 'static' (BASE_DIR + ../ + static)
STATIC_FOLDER_PATH = os.path.join(BASE_DIR, '..', 'static')

#Factory Pattern
def create_app(test_config = None):
    app = Flask(__name__, instance_relative_config=True, static_folder=STATIC_FOLDER_PATH)
    app.config.from_pyfile('config.py', silent=True)
    app.config.from_mapping(SECRET_KEY = 'dev') 
    
    #Tao instance path, neu da co roi thi thoi
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///client.db'

    app.permanent_session_lifetime = timedelta(days = 1)

    #Đăng kí auth
    app.register_blueprint(auth_bp)
    #
    init_app(app)
    '''
    


    @app.route('/signup', methods=['POST'])
    def signup_post():
        fullname = request.form['fullname']
        email = request.form['email']
        phone = request.form.get('phone')
        lang = request.form.get('lang')
        password = request.form['password']
        confirm = request.form['confirm']

        if not fullname or not email or not password:
            flash('Please fill in all required fields.')
            return redirect(url_for('signup_page'))

        if password != confirm:
            flash('Passwords do not match!')
            return redirect(url_for('signup_page'))

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email already exists!')
            return redirect(url_for('signup_page'))

        hashed_pw = generate_password_hash(password)
        new_user = User(fullname=fullname, email=email, phone=phone, lang=lang, password_hash=hashed_pw)
        db.session.add(new_user)
        db.session.commit()

        session['user_id'] = new_user.id
        session['fullname'] = new_user.fullname

        flash('Account created successfully!')
        return redirect(url_for('chat_page'))


    @app.route('/signin')
    def signin():
        return render_template('signin.html') 

    @app.route('/signin', methods = ['POST'])
    def signin_page():
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email = email).first()

        if not user or not check_password_hash(user.password_hash, password):
            flash('Email hoặc mật khẩu không chính xác.')
            return redirect(url_for('signin_page'))
        
        session['user_id'] = user.id
        session['fullname'] = user.fullname

        return redirect(url_for('chat_page'))
    '''

    @app.route('/chat')
    def chat_page():
        '''
        return render_template('chat.html')
        '''
        pass
    '''
    @app.route('/show-users')
    def show_users():
        users = User.query.all()
        output = ""
        for u in users:
            output += f"{u.id} - {u.fullname} - {u.email}<br>"
        return output
    '''

    @app.route('/')
    def home_page():
        return render_template('index.html')
    return app

