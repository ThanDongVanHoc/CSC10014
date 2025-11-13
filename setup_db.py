# setup_db.py
from app import create_app
from app.chat.model import init_db

# Tạo instance của app
app = create_app()

# Vào application context để gọi init_db()
with app.app_context():
    init_db()
    print("Database đã được khởi tạo thành công!")
