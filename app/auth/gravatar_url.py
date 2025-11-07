import hashlib

def generate_gravatar_url(email, size=80, default_style='identicon', rating='g'):

    # Chuẩn hóa Email: Chuyển về chữ thường và loại bỏ khoảng trắng thừa
    try:
        normalized_email = email.strip().lower()
    except AttributeError:
        # Xử lý trường hợp email không phải là chuỗi (nếu có)
        return ""
    
    # Băm (Hash) Email bằng MD5
    email_hash = hashlib.md5(normalized_email.encode('utf-8')).hexdigest()
    
    # Xây dựng URL cơ sở
    base_url = "https://www.gravatar.com/avatar/"
    
    # Thêm các tham số (query parameters)
    params = f"s={size}&d={default_style}&r={rating}"
    
    # Kết hợp tất cả để tạo URL cuối cùng
    gravatar_url = f"{base_url}{email_hash}?{params}"
    
    return gravatar_url
