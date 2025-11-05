from flask_sqlalchemy import SQLAlchemy 
import click
from sqlalchemy.orm import DeclarativeBase
from flask.cli import with_appcontext

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

def init_app(app):
    db.init_app(app)
    app.cli.add_command(init_db_command)