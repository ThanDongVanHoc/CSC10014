from flask import Blueprint

# Khai báo Blueprint
map_bp = Blueprint('map', __name__, 
                    template_folder='templates',
                    static_folder='static', 
                    url_prefix='/map')

# Import routes để chúng được đăng ký vào Blueprint
from . import routes
