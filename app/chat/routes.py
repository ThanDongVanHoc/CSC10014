from flask import redirect, render_template, url_for, session, request
from . import chat_bp

@chat_bp.route('/')
def chat_page():
    return render_template('chat.html')