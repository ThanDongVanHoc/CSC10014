from app.db.models import Place, SearchHistory
from datetime import datetime
from . import chat_bp
from flask import redirect, render_template, send_from_directory, url_for, session, request, jsonify
from sqlalchemy import select, and_, or_
from app.db import db
import os
from .utilis import get_user, query_pois_db, check_poi_db
import requests
from .forms_data import FORM_METADATA

@chat_bp.route('/getOnePlace')
def getOnePlace():
    name = request.args.get('name') 
    
    if not name:
        return jsonify({"error": "Missing required parameter: name"}), 400

    stmt = select(Place).where(Place.name == name).limit(1)
    place = db.session.scalar(stmt)

    
    if place:
        return jsonify(place.to_dict()), 200
    else:
        return jsonify({"message": f"Place with name '{name}' not found"}), 404


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
        return jsonify({"isPoi": True, "poi": poi_place.to_dict()}), 200
    else:
        return jsonify({"isPoi": False}), 200

@chat_bp.route('/pois/<path:filename>')
def serve_poi_img(filename):
    BASE_DIR = os.path.join(os.getcwd(), 'Dataset/crawler')
    return send_from_directory(BASE_DIR, filename)

@chat_bp.route('/log_search_history', methods=['POST'])
def log_search_history():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error"}), 400
    keyword = data.get("keyword", "").strip()
    if not keyword:
        return jsonify({"status": "ignored"})

    user_email = session.get("user_email", None)
    current_time = datetime.now()

    if not user_email:
        history = session.get("search_history", [])
        history = [item for item in history if item["keyword"] != keyword]
        history.insert(0, {
            "keyword": keyword,
            "created_at": current_time.isoformat() 
        })
        history = history[:10]
        session["search_history"] = history
        return jsonify({"status": "success", "history": history})
    user = get_user(user_email)
    if not user:
        return jsonify({"status": "error"}), 404

    existing_log = SearchHistory.query.filter_by(user_id=user.id, keyword=keyword).first()

    if existing_log:
        existing_log.created_at = current_time
    else:
        new_log = SearchHistory(
            user_id=user.id,
            keyword=keyword,
            created_at=current_time
        )
        db.session.add(new_log)

    db.session.commit()
    return jsonify({"status": "success"})


@chat_bp.route('/get_search_history')
def get_search_history():
    user_email = session.get("user_email", None)
    if not user_email:
        history = session.get("search_history", [])
        return jsonify(history)
    user = get_user(user_email)
    if not user:
         return jsonify([])
    histories = SearchHistory.query.filter_by(user_id=user.id)\
        .order_by(SearchHistory.created_at.desc()).all()
    history_list = [h.to_dict() for h in histories]
    return jsonify(history_list)

@chat_bp.route('/proxy_route/<mode>/<coords>')
def proxy_route(mode, coords):
    API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJhYjE2MmYwZDdjMDRlZGM4MWNmNDMyOGY0YjYxZTE2IiwiaCI6Im11cm11cjY0In0="
    try:
        ors_profile = "driving-car" 
        if mode == 'motor': 
            ors_profile = "cycling-regular" 
        elif mode == 'walking':
            ors_profile = "foot-walking"

        points = coords.split(';')
        if len(points) < 2:
            return jsonify({"error": "Invalid coordinates"}), 400
        start_point = points[0]
        end_point = points[1]

        base_url = f"https://api.openrouteservice.org/v2/directions/{ors_profile}"
        url = f"{base_url}?api_key={API_KEY}&start={start_point}&end={end_point}"
        
        resp = requests.get(url, timeout=30)
        data = resp.json()
        
        if resp.status_code != 200:
             return jsonify(data), resp.status_code

        if 'features' in data and len(data['features']) > 0:
            feat = data['features'][0]
            summary = feat['properties']['summary']
            
            osrm_like_response = {
                "code": "Ok",
                "routes": [{
                    "geometry": feat['geometry'], 
                    "distance": summary['distance'],
                    "duration": summary['duration']
                }]
            }
            return jsonify(osrm_like_response)
        else:
            return jsonify({"error": "No route found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@chat_bp.route('/forms/download/<path:filename>')
def download_form_file(filename):
    BASE_DIR = os.path.join(os.getcwd(), 'Dataset/crawler/forms')
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.pdf':
        return send_from_directory(BASE_DIR, filename, as_attachment=False)
    elif ext == '.docx' :
        return send_from_directory(BASE_DIR, filename, as_attachment=True)
    else:
        return jsonify({"error": "Unsupported file type"}), 400
    
@chat_bp.route('/forms/info/<string:id>')
def get_form_info(id):
    form_entry = next((form for form in FORM_METADATA if form["id"] == id), None)
    if not form_entry:
        return jsonify({"error": "Form ID not found"}), 404
    try:
        pdf_url = url_for('chat.download_form_file', filename=form_entry.get("pdf_filename"))
        docx_url = url_for('chat.download_form_file', filename=form_entry.get("docx_filename"))
        return jsonify({
            "id": id,
            "title": form_entry.get("title_vi"),
            "pdf_url": pdf_url,
            "docx_url": docx_url
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    