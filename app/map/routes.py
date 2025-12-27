from app.db.models import Place, SearchHistory, Hospital
from datetime import datetime
from . import map_bp
from flask import render_template, send_from_directory, session, request, jsonify
from sqlalchemy import select, and_
from app.db import db
import os
from ..chat.utils import query_pois_db, check_poi_db
import requests
from ..services.med_service import HospitalService
from app.db.func import get_user    

@map_bp.route('/getHospital', methods = ['GET'])
def get_hospital():
    # Lấy tham số từ URL
    source_id = request.args.get('source_id')
    name = request.args.get('name')
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)

    hospital = None

    # Ưu tiên 1: Tìm chính xác theo source_id (ID từ Excel)
    if source_id:
        hospital = Hospital.query.filter_by(source_id=source_id).first()

    # Ưu tiên 2: Nếu không có ID, tìm theo Tọa độ (trong bán kính nhỏ ~50m)
    # Để tránh sai số tọa độ nhỏ giữa Excel và Google Map
    if not hospital and lat and lng:
        margin = 0.0005 # Khoảng sai số cho phép (khoảng 50m)
        hospital = Hospital.query.filter(
            Hospital.lat.between(lat - margin, lat + margin),
            Hospital.lng.between(lng - margin, lng + margin)
        ).first()

    # Ưu tiên 3: Tìm theo Tên (Tìm tương đối - ILIKE)
    if not hospital and name:
        # Dùng ilike để tìm không phân biệt hoa thường
        hospital = Hospital.query.filter(Hospital.name.ilike(f"%{name}%")).first()

    # Trả về kết quả
    if hospital:
        return jsonify(hospital.to_dict()), 200
    else:
        return jsonify({"message": "Not found"}), 404
    

@map_bp.route('/getOnePlace')
def getOnePlace():
    name = request.args.get('name')
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not name and (not lat or not lng):
        return jsonify({"error": "Missing required parameters: name OR (lat and lng)"}), 400

    stmt = None

    # Ưu tiên 1: Tìm theo tọa độ chính xác (trong khoảng sai số nhỏ ~50m)
    if lat and lng:
        try:
            lat_val = float(lat)
            lng_val = float(lng)
            delta = 0.0001 # Khoảng 50m
            
            stmt = select(Place).where(
                and_(
                    Place.lat.between(lat_val - delta, lat_val + delta),
                    Place.lng.between(lng_val - delta, lng_val + delta)
                )
            ).limit(1)
        except ValueError:
            pass

    # Ưu tiên 2: Nếu chưa có stmt (không gửi lat/lng hoặc lỗi), tìm theo tên
    if stmt is None and name:
        stmt = select(Place).where(Place.name == name).limit(1)
    
    # Thực thi query
    # Nếu nãy tìm theo tọa độ mà không ra, thì fallback tìm theo tên
    place = None
    if stmt is not None:
        place = db.session.scalar(stmt)
    
    if not place and name and lat and lng:
        # Fallback cuối cùng: Tìm chính xác theo tên nếu tìm tọa độ thất bại
        place = db.session.scalar(select(Place).where(Place.name == name).limit(1))

    if place:
        # Xử lý ảnh default
        if not place.img:
             place.img = "https://bookingcare.vn/files/blog/2019/01/10/162817-benh-vien-tu-du.jpg"
        return jsonify(place.to_dict()), 200
    else:
        return jsonify({"message": "Place not found"}), 404
    

@map_bp.route('/pois')
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

@map_bp.route('/check_poi')
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

@map_bp.route('/pois/<path:filename>')
def serve_poi_img(filename):
    BASE_DIR = os.path.join(os.getcwd(), 'Dataset/crawler')
    return send_from_directory(BASE_DIR, filename)

@map_bp.route('/log_search_history', methods=['POST'])
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


@map_bp.route('/get_search_history')
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

@map_bp.route('/proxy_route/<mode>/<coords>')
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

@map_bp.route('/map')
def map():
    # 1. Lấy dữ liệu thô từ AI (chỉ có ID, tên, score, chưa có lat/lng)
    ai_results = session.get('ai_hospitals_results', [])
    user_location = session.get('user_location', 'HCMC')

    print('this is from map_bp debug')
    print(ai_results)

    enriched_hospitals = []
    
    # 2. ENRICH DATA: Bổ sung tọa độ từ Database
    if ai_results:
        # Lấy danh sách tất cả ID cần tìm
        ids = [item.get('id') for item in ai_results if item.get('id')]
        
        # BATCH QUERY: Gọi DB 1 lần duy nhất lấy tất cả bệnh viện này
        # SELECT * FROM hospitals WHERE source_id IN ('1913...', 'da81...')
        hospitals_db = Hospital.query.filter(Hospital.source_id.in_(ids)).all()
        
        # Tạo Dictionary để tra cứu nhanh: {'1913...': <HospitalObj>, ...}
        db_map = {h.source_id: h for h in hospitals_db}

        for item in ai_results:
            # Tra cứu trong RAM (siêu nhanh)
            h_db = db_map.get(item.get('id'))
            services = HospitalService.get_hospital_services(h_db.id) if h_db else []
            print("Checking hospital ID:", item.get('id'), "Found in DB:", bool(h_db))
            
            if h_db and h_db.lat and h_db.lng:
                # Tạo object mới, copy dữ liệu từ AI
                new_item = item.copy()
                
                # Bơm dữ liệu từ DB vào
                new_item['lat'] = h_db.lat
                new_item['lng'] = h_db.lng
                new_item['address'] = h_db.address
                new_item['phone'] = h_db.phone_number
                new_item['image'] = h_db.image_url
                new_item['intro'] = str(h_db.description or "").lower()
                new_item['services'] = services
                print(new_item['services'])
                enriched_hospitals.append(new_item)

    # # 3. Trả về template danh sách đã có đầy đủ Tọa độ + AI Score
    return render_template(
        'map.html', 
        hospitals=enriched_hospitals, 
        location=user_location
    )
