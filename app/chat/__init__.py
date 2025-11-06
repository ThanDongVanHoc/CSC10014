from flask import Blueprint

# Khai báo Blueprint
chat_bp = Blueprint('chat', __name__, 
                    template_folder='templates',
                    static_folder='static', 
                    url_prefix='/chat')

# Import routes để chúng được đăng ký vào Blueprint
from . import routes
