from . import medical_form_bp
from flask import render_template

@medical_form_bp.route('/')
def medical_form_home():
    return render_template('medical_form.html')


