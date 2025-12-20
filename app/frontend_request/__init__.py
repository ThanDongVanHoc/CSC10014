from flask import Blueprint

# Khai báo Blueprint
frontend_request_bp = Blueprint('frontend_request', __name__, 
                    template_folder='templates',
                    static_folder='static', 
                    url_prefix='/frontend_request')

# Import routes để chúng được đăng ký vào Blueprint
from . import routes
