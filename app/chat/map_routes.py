from app.db.models import Place
from . import chat_bp
from flask import redirect, render_template, send_from_directory, url_for, session, request, jsonify
from sqlalchemy import select, and_, or_
from app.db import db
import os

def query_pois_db(query_kw, south, north, east, west):
    stmt = select(Place).where(
    and_(
        Place.query_kw == query_kw,
        Place.lat.between(south, north), 
        Place.lng.between(west, east)   
        )
    )
    return db.session.scalars(stmt).all()

def check_poi_db(max_lat, max_lng, min_lat, min_lng, name):
    candidates = Place.query.filter(
        Place.lat <= max_lat,
        Place.lat >= min_lat,
        Place.lng <= max_lng,
        Place.lng >= min_lng
    ).all() 

    if not candidates:
        return None
    
    input_lat = (max_lat + min_lat) / 2
    input_lng = (max_lng + min_lng) / 2 
    closest_place = None
    min_dist = float('inf')

    search_name_norm = name.lower()

    for place in candidates:
        dist = (place.lat - input_lat)**2 + (place.lng - input_lng)**2
        if dist < 0.0000005:
             return place
        place_name_norm = place.name.lower()
        if place_name_norm in search_name_norm or search_name_norm in place_name_norm:
            return place
        if dist < min_dist:
            min_dist = dist
            closest_place = place   
    return closest_place

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

@chat_bp.route('/check_poi')
def check_poi():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    name = request.args.get("name")


    if not all([lat, lng, name]):
        return jsonify({"error": "Missing required parameters"}), 400
    
    try:
        lat = float(lat)
        lng = float(lng)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid latitude or longitude format. Must be numbers."}), 400
    delta = 0.0005
    max_lat = lat + delta
    max_lng = lng + delta
    min_lat = lat - delta
    min_lng = lng - delta
    
    poi_place = check_poi_db(max_lat, max_lng, min_lat, min_lng, name)
    if poi_place:
        return jsonify({"isPPoi": True, "poi": poi_place.to_dict()}), 200
    else:
        return jsonify({"isPPoi": False}), 200

@chat_bp.route('/pois/<path:filename>')
def serve_poi_img(filename):
    BASE_DIR = os.path.join(os.getcwd(), 'Dataset/crawler')
    print(f"DEBUG IMAGE PATH: {BASE_DIR} | Filename: {filename}")
    return send_from_directory(BASE_DIR, filename)
