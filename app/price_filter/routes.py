from . import price_filter_bp
from flask import request, jsonify, session, render_template


@price_filter_bp.route('/')
def price_filter():
    return render_template('price_filter.html')