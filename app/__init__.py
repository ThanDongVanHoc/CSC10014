from flask import Flask, render_template, request, redirect, flash, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from .auth import auth_bp
from .chat import chat_bp
from .db import init_db
import os
import pathlib
from .auth.mail import init_mail

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

    #Register
    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp)
    #
    init_db(app)
    init_mail(app)

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
