from flask_mail import Mail, Message
import os
import random 
import time
from flask import session

mail = Mail()

def init_mail(app):
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER')
    app.config['MAIL_PORT'] = os.environ.get('MAIL_PORT')
    app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS') == 'True'
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_USERNAME')

    mail.init_app(app)

def send_verification_mail(recipient_email):
    code = str(random.randint(100000, 999999))
    expiration_time = time.time() + 300
    html_body = f"""
    <html>
        <body>
            <p>Hello,</p>
            <p>This is your account registration verification code:</p>
            <h2 style="color: #007bff; background-color: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center;">{code}</h2>
            <p>Please enter this code on the registration page. This code will expire in 5 minutes.</p>
            <p>Sincerely,</p>
            <p>Support Team</p>
        </body>
    </html>
    """

    msg = Message(
        subject="Your Registration Verification Code",
        recipients=[recipient_email],
        body=f"Your verification code is: {code}\n\nThis code will expire in 5 minutes.",
        html=html_body 
    )
    
    try:
        mail.send(msg) 
        session["verification"] = {
            "code":code,
            "expires_at":expiration_time
        }
        return True
    except Exception as e:
        print ("loi")
        return False