from flask import Blueprint

# Khai báo Blueprint
backend_request_bp = Blueprint('backend_request', __name__, 
                    template_folder='templates',
                    static_folder='static', 
                    url_prefix='/backend_request')

# Import routes để chúng được đăng ký vào Blueprint
from . import routes
