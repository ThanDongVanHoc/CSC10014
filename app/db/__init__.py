from flask_sqlalchemy import SQLAlchemy 
import click
from sqlalchemy.orm import DeclarativeBase
from flask.cli import with_appcontext
from flask_migrate import Migrate
from sqlalchemy import select
import pandas as pd
import pathlib
import os

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
    has_data = db.session.scalar(select(Place).limit(1))

    if has_data:
        # Thêm một thông báo để biết rõ tại sao nó không chạy
        click.echo('Data already exists. Skipping load.')
        return
    
    try:
        current_dir = pathlib.Path(__file__).parent.parent.parent
        data_dir = current_dir / 'Dataset' / 'crawler' / 'raw_data_realtime.csv'
        
        df = pd.read_csv(data_dir)

    except FileNotFoundError:
        print(f"Lỗi: Không tìm thấy file tại {data_dir}")
        return
    except Exception as e:
        print(f"Lỗi khi đọc file CSV: {e}")
        return

    click.echo('CSV file read successfully. Preparing data...')
    data_to_dict = df.to_dict('records') 
    from .func import poi_csv_to_db
    
    try:
        data_to_insert = [poi_csv_to_db(record).to_dict() for record in data_to_dict]
    except Exception as e:
        print(f"Lỗi khi xử lý dữ liệu (poi_csv_to_db): {e}")
        return

    click.echo('Data prepared. Inserting into database...')
    
    try:
        db.session.bulk_insert_mappings(Place, data_to_insert)
        db.session.commit()
        # Thêm thông báo thành công!
        click.echo(f'Successfully loaded {len(data_to_insert)} records.')
        
    except Exception as e:
        db.session.rollback()
        # **Đây là phần quan trọng nhất**
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