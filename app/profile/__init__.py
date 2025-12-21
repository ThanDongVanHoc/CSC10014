from flask import Blueprint

# Khai báo Blueprint
profile_bp = Blueprint('profile', __name__, 
                    template_folder='templates',
                    static_folder='static', 
                    url_prefix='/profile')

from . import routes
