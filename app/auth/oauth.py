import os
import pathlib
import requests
import cachecontrol
import google.auth.transport.requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from dotenv import load_dotenv  

# Load biến môi trường ngay lập tức
load_dotenv()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
client_secrets_file = os.path.join(pathlib.Path(__file__).parent, "client_secrets.json")
# Chỉ dùng cho development, không dùng "1" trên production
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1" 

flow = Flow.from_client_secrets_file(
    client_secrets_file=client_secrets_file,
    scopes=["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email", "openid"],
    redirect_uri="http://127.0.0.1:5000/auth/callback"
)

def get_google_auth_url():
    authorization_url, state = flow.authorization_url()
    return authorization_url, state

def verify_google_token(request_url):
    try:
        flow.fetch_token(authorization_response=request_url)
        credentials = flow.credentials
        
        request_session = requests.session()
        cached_session = cachecontrol.CacheControl(request_session)
        token_request = google.auth.transport.requests.Request(session=cached_session)

        id_info = id_token.verify_oauth2_token(
            id_token=credentials._id_token,
            request=token_request,
            audience=GOOGLE_CLIENT_ID
        )
        return id_info
    except Exception as e:
        print(f"Lỗi khi xác thực Google: {e}")
        return None