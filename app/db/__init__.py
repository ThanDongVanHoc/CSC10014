from flask_sqlalchemy import SQLAlchemy 
import click
from sqlalchemy.orm import DeclarativeBase
from flask.cli import with_appcontext
from flask_migrate import Migrate
from sqlalchemy import select
import pandas as pd
import pathlib

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

@click.command('load_place_data')
@with_appcontext
def load_place_data_command():
    from .models import Place
    db.create_all() 
    has_data = db.session.scalar(select(Place).limit(1))
    if has_data:
        click.echo('Data already exists. Skipping load.')
        return
    
    try:
        current_dir = pathlib.Path(__file__).parent.parent.parent
        data_dir = current_dir / 'Dataset' / 'crawler' / 'raw_data_robust.csv'
        
        df = pd.read_csv(data_dir)

    except FileNotFoundError:
        print(f"Lỗi: Không tìm thấy file tại {data_dir}")
        return
    except Exception as e:
        print(f"Lỗi khi đọc file CSV: {e}")
        return

    click.echo('CSV file read successfully. Preparing data...')
    
    # Chuyển DataFrame thành List of Dict
    data_to_dict = df.to_dict('records') 
    
    # Import hàm xử lý đã sửa ở trên
    from .func import poi_csv_to_db 
    
    valid_data_to_insert = []

    try:
        total_rows = len(data_to_dict)
        for index, record in enumerate(data_to_dict):
            print(f"Đang xử lý dòng {index + 1}/{total_rows}...", end='\r')
            
            place_obj = poi_csv_to_db(record)
            
            if place_obj is not None:
                valid_data_to_insert.append(place_obj.to_dict())
                
    except Exception as e:
        print(f"Lỗi khi xử lý dữ liệu: {e}")
        return

    click.echo(f'Data prepared. Found {len(valid_data_to_insert)} valid records. Inserting into database...')
    
    try:
        # Dùng bulk_insert_mappings cực nhanh
        db.session.bulk_insert_mappings(Place, valid_data_to_insert)
        db.session.commit()
        click.echo(f'Successfully loaded {len(valid_data_to_insert)} records.')
        
    except Exception as e:
        db.session.rollback()
        print(f"LỖI KHI INSERT VÀO DATABASE: {e}")
        print("Data load failed. Transaction rolled back.")
            
    return

@click.command('show_data')
@with_appcontext
def show_data_command():
    from .models import Place
    stmt = select(Place)
    places = db.session.scalars(stmt).all()
    print(places)




@click.command('load_hospital')
@with_appcontext
def load_hospital_command():
    from .func import process_hospital_data
    from .models import Hospital
    
    # 1. Đảm bảo bảng tồn tại
    db.create_all()

    # 2. Đọc file (Sử dụng r"..." để tránh lỗi đường dẫn Windows)
    file_path = r"OneDrive - VNU-HCMUS\Desktop\HCMUS\Computational Thinking\Price hospital\data\data_benhvien_hcm.csv"
    
    # Nếu file nằm trong thư mục project thì nên dùng pathlib cho chuyên nghiệp:
    # current_dir = pathlib.Path(__file__).parent.parent.parent
    # file_path = current_dir / 'data' / 'data_benhvien_hcm.csv'

    click.echo(f"Đọc file: {file_path}")
    
    try:
        # Thêm encoding='utf-8-sig' nếu file có tiếng Việt bị lỗi font
        if str(file_path).endswith('.csv'):
            df = pd.read_csv(file_path, encoding='utf-8') 
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        click.echo(f"❌ Lỗi đọc file: {e}")
        return

    data = df.to_dict('records')
    print(f"Tổng số dòng: {len(data)}")
    
    count_new = 0
    count_updated = 0

    # 3. Duyệt và Insert hoặc Update
    for i, row in enumerate(data):
        print(f"Xử lý {i+1}/{len(data)}...", end='\r')
        try:
            # Chuyển dòng Excel thành Object (nhưng chưa lưu)
            new_obj = process_hospital_data(row)
            
            if new_obj:
                # Kiểm tra xem ID này đã có trong DB chưa?
                # Lưu ý: Cần chắc chắn file Excel có cột 'Id' khớp với source_id
                if new_obj.source_id:
                    exists = db.session.query(Hospital).filter_by(source_id=new_obj.source_id).first()
                    
                    if exists:
                        # === CÓ RỒI -> UPDATE (Cập nhật thông tin mới) ===
                        exists.name = new_obj.name
                        exists.image_url = new_obj.image_url # Quan trọng: Cập nhật ảnh
                        exists.address = new_obj.address
                        exists.phone_number = new_obj.phone_number
                        exists.website = new_obj.website
                        exists.lat = new_obj.lat
                        exists.lng = new_obj.lng
                        exists.description = new_obj.description
                        exists.categories = new_obj.categories
                        exists.query_kw = new_obj.query_kw
                        
                        count_updated += 1
                    else:
                        # === CHƯA CÓ -> INSERT (Thêm mới) ===
                        db.session.add(new_obj)
                        count_new += 1
                else:
                    # Trường hợp không có ID trong Excel (hiếm), cứ thêm mới
                    db.session.add(new_obj)
                    count_new += 1
                    
        except Exception as e:
            # print(f"Lỗi dòng {i}: {e}")
            pass

    # 4. Commit thay đổi xuống DB
    try:
        db.session.commit()
        print(f"\n✅ HOÀN TẤT!")
        print(f"- Thêm mới: {count_new}")
        print(f"- Cập nhật: {count_updated}")
    except Exception as e:
        db.session.rollback()
        print(f"\n❌ Lỗi Database: {e}")



def init_db(app):
    db.init_app(app)
    migrate = Migrate(app, db)
    app.cli.add_command(init_db_command)
    app.cli.add_command(load_hospital_command) 
    # app.cli.add_command(load_place_data_command)
    # app.cli.add_command(show_data_command)