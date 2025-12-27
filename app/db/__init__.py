from flask_sqlalchemy import SQLAlchemy 
import click
from sqlalchemy.orm import DeclarativeBase
from flask.cli import with_appcontext
from flask_migrate import Migrate
from sqlalchemy import select
import pandas as pd
import pathlib
import os
import time
from deep_translator import GoogleTranslator

# 1. Định nghĩa Base Class
class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

@click.command('init_db')
@with_appcontext 
def init_db_command():
    from . import models  
    db.create_all()
    click.echo('Initialized the database.')

def batch_translate_text(text_list):
    translator = GoogleTranslator(source='vi', target='en')
    
    translation_map = {}
    total = len(text_list)
    
    for i, text in enumerate(text_list):
        if pd.isna(text) or str(text).strip() == "":
            translation_map[text] = text
            continue
            
        try:
            if text not in translation_map:
                # Ép kiểu string để tránh lỗi
                text_str = str(text)
                translated = translator.translate(text_str)
                translation_map[text] = translated
                
                if i % 5 == 0: # In tiến độ
                    print(f"     - Đang dịch: {text_str[:15]}... -> {translated[:15]}...", end='\r')
                
                time.sleep(0.2) # Sleep để tránh bị block
        except Exception as e:
            print(f"     ! Lỗi dịch '{text}': {e}")
            translation_map[text] = text 
            
    print(f"\n   > Hoàn tất dịch.")
    return translation_map

@click.command('load_place_data')
@with_appcontext
def load_place_data_command():
    from .models import Place
    db.create_all() 
    
    if db.session.scalar(select(Place).limit(1)):
        click.echo('Data already exists. Skipping load.')
        return
    
    try:
        current_dir = pathlib.Path(__file__).parent.parent.parent
        data_dir = current_dir / 'Dataset' / 'crawler' / 'raw_data_robust.csv'
        
        # Fallback nếu không tìm thấy đường dẫn tương đối
        if not data_dir.exists():
            click.echo("⚠️ Không tìm thấy đường dẫn tương đối, thử đường dẫn tuyệt đối...")
            return 
        
        df = pd.read_csv(data_dir)
        click.echo(f"Đọc thành công {len(df)} dòng.")

    except Exception as e:
        print(f"❌ Lỗi đọc file CSV: {e}")
        return
    
    # Dịch cột LOẠI
    if 'Loai' in df.columns:
        unique_types = df['Loai'].unique()
        click.echo(f"1. Dịch cột 'Loai' ({len(unique_types)} mục)...")
        type_map = batch_translate_text(unique_types)
        df['Loai'] = df['Loai'].map(type_map)

    # Dịch cột ĐỊA CHỈ
    if 'Dia chi' in df.columns:
        unique_addrs = df['Dia chi'].unique()
        click.echo(f"2. Dịch cột 'Dia chi' ({len(unique_addrs)} mục)...")
        addr_map = batch_translate_text(unique_addrs)
        df['Dia chi'] = df['Dia chi'].map(addr_map)

    # --- BƯỚC 2: INSERT VÀO DB ---
    click.echo('Đang chuẩn bị dữ liệu insert...')
    
    data_to_dict = df.to_dict('records') 
    from .func import poi_csv_to_db 
    
    valid_data_to_insert = []

    for record in data_to_dict:
        place_obj = poi_csv_to_db(record)
        if place_obj:
            valid_data_to_insert.append(place_obj.to_dict())

    if valid_data_to_insert:
        try:
            db.session.bulk_insert_mappings(Place, valid_data_to_insert)
            db.session.commit()
            click.echo(f"✅ Đã thêm thành công {len(valid_data_to_insert)} địa điểm!")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Lỗi Database: {e}")
    else:
        print("⚠️ Không có dữ liệu hợp lệ để thêm.")

@click.command('load_hospital')
@with_appcontext
def load_hospital_command():
    from .func import process_hospital_data
    from .models import Hospital
    
    db.create_all()

    file_path = r"Price-hospital\data\data_benhvien_hcm.csv"
    click.echo(f"Đọc file: {file_path}")
    
    try:
        if str(file_path).endswith('.csv'):
            df = pd.read_csv(file_path, encoding='utf-8') 
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        click.echo(f"❌ Lỗi đọc file: {e}")
        return

    # --- BƯỚC 1: DỊCH THUẬT (BATCH TRANSLATION) ---
    click.echo("--- BẮT ĐẦU DỊCH DỮ LIỆU SANG TIẾNG ANH ---")

    # 1. Dịch cột 'Loai' (Categories)
    if 'Loai' in df.columns:
        click.echo("1. Dịch cột 'Loai'...")
        type_map = batch_translate_text(df['Loai'].unique())
        # Map giá trị đã dịch vào lại DataFrame
        df['Loai'] = df['Loai'].map(lambda x: type_map.get(x, x))

    # 2. Dịch cột 'Dia chi' (Address)
    if 'Dia chi' in df.columns:
        click.echo("2. Dịch cột 'Dia chi'...")
        addr_map = batch_translate_text(df['Dia chi'].unique())
        df['Dia chi'] = df['Dia chi'].map(lambda x: addr_map.get(x, x))

    # --- BƯỚC 2: INSERT/UPDATE DATABASE ---
    click.echo("\n--- CẬP NHẬT VÀO DATABASE ---")
    
    data = df.to_dict('records')
    count_new = 0
    count_updated = 0

    for i, row in enumerate(data):
        print(f"Xử lý dòng {i+1}/{len(data)}...", end='\r')
        try:
            # Gọi hàm xử lý từ func.py (row giờ đã chứa tiếng Anh)
            new_obj = process_hospital_data(row)
            
            if new_obj:
                # Kiểm tra trùng lặp dựa trên source_id (Id gốc trong excel)
                if new_obj.source_id:
                    exists = db.session.query(Hospital).filter_by(source_id=new_obj.source_id).first()
                    
                    if exists:
                        # Update thông tin
                        exists.name = new_obj.name
                        exists.address = new_obj.address
                        exists.categories = new_obj.categories
                        exists.description = new_obj.description
                        exists.lat = new_obj.lat
                        exists.lng = new_obj.lng
                        exists.image_url = new_obj.image_url
                        exists.phone_number = new_obj.phone_number
                        exists.website = new_obj.website
                        exists.query_kw = new_obj.query_kw
                        count_updated += 1
                    else:
                        # Insert mới
                        db.session.add(new_obj)
                        count_new += 1
                else:
                    db.session.add(new_obj)
                    count_new += 1
                    
        except Exception as e:
            pass

    try:
        db.session.commit()
        click.echo(f"\n✅ HOÀN TẤT! Thêm mới: {count_new}, Cập nhật: {count_updated}")
    except Exception as e:
        db.session.rollback()
        click.echo(f"\n❌ Lỗi Database: {e}")

@click.command('load_services')
@click.argument('folder_path', required=False)
@with_appcontext
def load_services_command(folder_path):
    from .models import Hospital, HospitalService
    from collections import Counter
    
    # --- 1. KEYWORDS GIỮ NGUYÊN ---
    COMMON_KEYWORDS = [
        # Khám & tư vấn
        "khám bệnh", "khám cấp cứu", "khám lâm sàng", "hội chẩn",
        # Chẩn đoán hình ảnh
        "siêu âm", "x-quang", "x quang", "cắt lớp", "ct scanner", "mri", "cộng hưởng từ",
        "nội soi", "điện tim", "điện não", "đo loãng xương",
        # Xét nghiệm chỉ số
        "sinh hóa", "huyết học", "nước tiểu", "tế bào",
        "đường huyết", "glucose", "mỡ máu", "cholesterol", 
        "gan", "thận", "ure", 
        # Thủ thuật phổ thông
        "nhổ răng", "lấy cao răng", "hàn răng", "trám răng",
        "bó bột", "khâu", "rửa vết thương", "thay băng",
        "giường", "lưu bệnh"
    ]

    # --- 2. BLACKLIST MỞ RỘNG (Lọc kỹ hơn) ---
    BLACKLIST_KEYWORDS = [
        # Từ khóa rác cũ
        "gói", "đoàn", "bảo hiểm", "suất", "phí", "thẻ", "mời", 
        "tiền", "ngoài giờ", "vận chuyển", "thuê", "cơm", "cháo", "nước",
        "tiêu hao", "vật tư", "thuốc", "vắc xin", "vaccine",
        # Từ khóa rác mới (để giảm trùng lặp)
        "tại nhà", "tại giường", "loại", "cấp", "độ", "lần", 
        "máy", "hệ thống", "kỹ thuật", "phương pháp" 
    ]

    def is_valid_service(name):
        if not name: return False
        s = str(name).lower().strip()
        
        # --- 3. SIẾT CHẶT ĐỘ DÀI (Max 50 ký tự) ---
        if len(s) > 50 or len(s) < 4: 
            return False
            
        if any(bad in s for bad in BLACKLIST_KEYWORDS):
            return False
            
        return any(good in s for good in COMMON_KEYWORDS)

    # --- XỬ LÝ ĐƯỜNG DẪN ---
    if not folder_path:
        folder_path = r"Price-hospital\data"

    if not os.path.exists(folder_path):
        click.echo(f"❌ Không tìm thấy thư mục: {folder_path}")
        return
    
    master_file = os.path.join(folder_path, 'data_benhvien_hcm.csv')
    
    # --- PHA 1: LỌC "HARD MODE" ---
    print("\n--- PHA 1: LỌC DỮ LIỆU (CHẾ ĐỘ KHẮT KHE) ---")
    
    service_counter = Counter()
    csv_files = [f for f in os.listdir(folder_path) if f.endswith('.csv') and f != 'data_benhvien_hcm.csv']
    print(f"Đang quét {len(csv_files)} file...")
    
    for f in csv_files:
        try:
            temp_df = pd.read_csv(os.path.join(folder_path, f))
            if 'Ten dich vu' in temp_df.columns:
                names = temp_df['Ten dich vu'].dropna().astype(str).tolist()
                valid_names = [n.strip() for n in names if is_valid_service(n)]
                # Dùng set để mỗi bệnh viện chỉ vote 1 phiếu cho 1 tên dịch vụ
                service_counter.update(set(valid_names))
        except:
            continue
    
    # --- 4. TĂNG NGƯỠNG TẦN SUẤT LÊN 3 ---
    # Dịch vụ phải xuất hiện ở ít nhất 3 bệnh viện mới được coi là "Phổ biến"
    MIN_HOSPITAL_COUNT = 3
    final_services_list = [name for name, count in service_counter.items() if count >= MIN_HOSPITAL_COUNT]
    
    print(f"Tổng tìm thấy (thô): {len(service_counter)}")
    print(f"✅ Sau khi lọc (xuất hiện >= {MIN_HOSPITAL_COUNT} nơi + tên ngắn): Còn lại {len(final_services_list)} dịch vụ.")

    # Dịch thuật
    service_map = batch_translate_text(final_services_list)
    
    # --- PHA 2: INSERT ---
    print("\n--- PHA 2: INSERT VÀO DATABASE ---")
    df_master = pd.read_csv(master_file)
    
    hospital_map = {
        str(h.source_id).strip(): h.id 
        for h in db.session.query(Hospital).filter(Hospital.source_id != None).with_entities(Hospital.source_id, Hospital.id).all()
    }
    
    all_services_to_insert = []
    count_ok = 0
    valid_service_set = set(final_services_list)

    for _, row in df_master.iterrows():
        source_id = str(row['Id']).strip()
        if source_id not in hospital_map: continue
            
        hospital_id = hospital_map[source_id]
        price_file = os.path.join(folder_path, f"{source_id}.csv")
        
        if os.path.exists(price_file):
            HospitalService.query.filter_by(hospital_id=hospital_id).delete()
            try:
                df_price = pd.read_csv(price_file)
                for _, p_row in df_price.iterrows():
                    raw_name = str(p_row.get('Ten dich vu', '')).strip()
                    s_price = str(p_row.get('Gia (VND)', '')).strip()
                    
                    if raw_name in valid_service_set:
                        eng_name = service_map.get(raw_name, raw_name)
                        sv = HospitalService(
                            hospital_id=hospital_id,
                            service_name=eng_name,
                            price=s_price
                        )
                        all_services_to_insert.append(sv)
                count_ok += 1
            except Exception:
                pass

    if all_services_to_insert:
        try:
            db.session.add_all(all_services_to_insert)
            db.session.commit()
            print(f"\n🎉 HOÀN TẤT! Đã thêm {len(all_services_to_insert)} dịch vụ chuẩn hóa.")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Lỗi: {e}")
    else:
        print("\n⚠️ Không có dữ liệu.")

def init_db(app):
    db.init_app(app)
    migrate = Migrate(app, db)
    app.cli.add_command(init_db_command)
    app.cli.add_command(load_hospital_command) 
    app.cli.add_command(load_place_data_command)
    app.cli.add_command(load_services_command)