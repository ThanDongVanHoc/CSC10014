from flask import Blueprint

medical_form_bp = Blueprint('medical_form', __name__, 
                            template_folder='templates',
                            static_folder='static', url_prefix='/medical_form')

from . import routes