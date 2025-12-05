from flask import Flask, render_template, request, redirect, flash, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from .auth import auth_bp
from .chat import chat_bp
from .db import init_db
import os
import pathlib
from .auth.mail import init_mail

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
    return app
