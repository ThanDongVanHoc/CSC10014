from flask import Blueprint

# Khai báo Blueprint
price_filter_bp = Blueprint('price_filter', __name__, 
                    template_folder='templates',
                    static_folder='static', 
                    url_prefix='/price_filter')

from . import routes
