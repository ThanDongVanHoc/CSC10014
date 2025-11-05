from flask import redirect, render_template, url_for, session, request
from . import auth_bp

@auth_bp.route('/signup', methods = ['GET'])
def signup_page():
    return render_template('signup.html')

@auth_bp.route('/signin', methods = ['GET'])
def signin_page():
    return render_template('signin.html')

@auth_bp.route('/logout')
def logout():   
    return redirect(url_for('home_page'))