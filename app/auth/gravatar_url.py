import hashlib

def generate_gravatar_url(email, size=80, default_style='identicon', rating='g'):
    try:
        normalized_email = email.strip().lower()
    except AttributeError:
        return ""
    email_hash = hashlib.md5(normalized_email.encode('utf-8')).hexdigest()
    base_url = "https://www.gravatar.com/avatar/"
    params = f"s={size}&d={default_style}&r={rating}"
    gravatar_url = f"{base_url}{email_hash}?{params}"
    return gravatar_url
