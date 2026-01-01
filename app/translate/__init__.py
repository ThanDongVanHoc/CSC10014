from flask import Blueprint

# Khai báo Blueprint
translate_bp = Blueprint('translate', __name__, 
                    template_folder='templates',
                    static_folder='static', 
                    url_prefix='/translate')

# Import routes để chúng được đăng ký vào Blueprint
from . import routes