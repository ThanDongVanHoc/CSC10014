from app.db.models import Place
from . import chat_bp
from flask import redirect, render_template, url_for, session, request, jsonify
from sqlalchemy import select, and_
from app.db import db

def query_pois_db(query_kw, south, north, east, west):
    stmt = select(Place).where(
    and_(
        Place.query_kw == query_kw,
        Place.lat.between(south, north), 
        Place.lng.between(west, east)   
        )
    )
    return db.session.scalars(stmt).all()

@chat_bp.route('/pois')
def pois():
    query_kw = request.args.get("type")
    south_str = request.args.get("south")
    north_str = request.args.get("north")
    east_str = request.args.get("east")
    west_str = request.args.get("west")

    if not all([query_kw, south_str, north_str, east_str, west_str]):
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        south = float(south_str)
        north = float(north_str)
        east = float(east_str)
        west = float(west_str)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid coordinate format. Must be numbers."}), 400

    pois_places = query_pois_db(query_kw, south, north, east, west)

    pois_response = [
       place.to_dict() for place in pois_places
    ]
    
    return jsonify(pois_response)