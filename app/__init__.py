from flask import Flask, render_template, request, redirect, flash, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from .auth import auth_bp
from .chat import chat_bp
from .translate import translate_bp
from .medical_form import medical_form_bp
from .db import init_db
from .map import map_bp 
from .api import api_bp

import os
import pathlib
from .auth.mail import init_mail
from app.chat.utils import get_user

#Factory Pattern
def create_app(test_config = None):
    app = Flask(__name__, instance_relative_config=True)
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
    app.register_blueprint(map_bp)
    app.register_blueprint(translate_bp)
    app.register_blueprint(medical_form_bp)
    app.register_blueprint(api_bp)

    #
    init_db(app)
    init_mail(app)

    @app.route('/')
    def home_page():
        return render_template('index.html')
    
    @app.route('/about-us')
    def about_us():
        return render_template('about.html')
    
    @app.route('/achievements_and_events')
    def achievements_and_events():
        return render_template('achievements_and_events.html')
    @app.route('/services')
    def services():
        return render_template('services.html')
    @app.route('/profile')
    def profile():
        if "user_email" not in session:
            return redirect(url_for('auth.signin'))
        user = get_user(session["user_email"])
        return render_template('profile.html', user=user)
    return app
