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
        for record in data_to_dict:
            place_obj = poi_csv_to_db(record)
            
            # Nếu place_obj không phải là None thì mới thêm vào danh sách
            if place_obj is not None:
                # Chuyển object thành dict để dùng bulk_insert_mappings
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

def init_db(app):
    db.init_app(app)
    migrate = Migrate(app, db)
    app.cli.add_command(init_db_command)
    app.cli.add_command(load_place_data_command)
    app.cli.add_command(show_data_command)