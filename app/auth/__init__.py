from flask import Blueprint

# Khai báo Blueprint
auth_bp = Blueprint('auth', __name__, 
                    template_folder='templates',
                    static_folder='static', 
                    url_prefix='/auth')

# Import routes để chúng được đăng ký vào Blueprint
from . import routes
