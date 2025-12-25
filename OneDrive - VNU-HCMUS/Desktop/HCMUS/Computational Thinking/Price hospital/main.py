import os
import glob
import pandas as pd
import re
import uvicorn
from fastapi import FastAPI, Query
from typing import List, Optional
from pydantic import BaseModel
from contextlib import asynccontextmanager

# --- Cấu hình ---
DATA_FOLDER = "data"
HOSPITAL_INFO_FILE = "data_benhvien_hcm.csv" # Tên file thông tin bệnh viện

global_df = pd.DataFrame()
hospital_map = {} # Biến lưu dictionary {id: tên_bệnh_viện}

# --- Hàm làm sạch dữ liệu giá ---
def clean_price(raw_price):
    s = str(raw_price).strip()
    if s.lower() == 'nan' or s == '': return 0
    if '-' in s: s = s.split('-')[0]
    digits_only = re.sub(r'[^\d]', '', s)
    try:
        if not digits_only: return 0
        return int(digits_only)
    except ValueError:
        return 0

# --- Hàm load thông tin bệnh viện (Tên, Địa chỉ...) ---
def load_hospital_map():
    """Đọc file data_benhvien_hcm.csv để lấy map {Id: Ten}"""
    path = os.path.join(DATA_FOLDER, HOSPITAL_INFO_FILE)
    mapping = {}
    
    if os.path.exists(path):
        try:
            # Đọc file mapping
            df = pd.read_csv(path)
            # Chuẩn hóa tên cột (đề phòng khoảng trắng thừa)
            df.columns = [c.strip() for c in df.columns]
            
            if "Id" in df.columns and "Ten" in df.columns:
                # Tạo dictionary: key=Id, value=Ten
                # dropna() để bỏ các dòng ko có ID hoặc Tên
                mapping = pd.Series(df.Ten.values, index=df.Id).to_dict()
                print(f"Loaded names for {len(mapping)} hospitals.")
            else:
                print(f"Warning: File {HOSPITAL_INFO_FILE} missing 'Id' or 'Ten' columns.")
        except Exception as e:
            print(f"Error reading hospital info file: {e}")
    else:
        print(f"Warning: Could not find {HOSPITAL_INFO_FILE} in {DATA_FOLDER}")
    
    return mapping

# --- Hàm load dữ liệu chính ---
def load_data():
    if not os.path.exists(DATA_FOLDER):
        os.makedirs(DATA_FOLDER)
        return pd.DataFrame()

    # 1. Load mapping tên bệnh viện trước
    h_map = load_hospital_map()
    global hospital_map
    hospital_map = h_map

    # 2. Quét tất cả file CSV trong folder
    all_files = glob.glob(os.path.join(DATA_FOLDER, "*.csv"))
    df_list = []
    
    print(f"Scanning {len(all_files)} files in '{DATA_FOLDER}'...")

    for filename in all_files:
        # Bỏ qua file thông tin bệnh viện (vì nó ko chứa giá)
        if filename.endswith(HOSPITAL_INFO_FILE):
            continue

        try:
            df = pd.read_csv(filename, dtype={"Gia (VND)": str})
            df.columns = [c.strip() for c in df.columns] 
            
            # Kiểm tra cột bắt buộc
            if "Ten dich vu" not in df.columns or "Gia (VND)" not in df.columns:
                # File này ko đúng định dạng file giá -> bỏ qua
                continue
                
            # Lấy ID từ tên file
            base_name = os.path.basename(filename)
            hospital_id = os.path.splitext(base_name)[0]
            
            # Thêm cột ID
            df["hospital_id"] = hospital_id
            
            # --- MAP TÊN BỆNH VIỆN ---
            # Nếu tìm thấy ID trong map thì lấy tên, ko thì dùng lại ID
            hospital_name = h_map.get(hospital_id, f"Unknown ({hospital_id})")
            df["hospital_name"] = hospital_name

            # Đổi tên cột chuẩn
            df = df.rename(columns={"Ten dich vu": "service_name", "Gia (VND)": "price"})
            
            # Làm sạch giá
            df['price'] = df['price'].apply(clean_price)
            
            # Chỉ lấy các cột cần thiết
            df = df[['hospital_id', 'hospital_name', 'service_name', 'price']]
            
            df_list.append(df)
        except Exception as e:
            print(f"Error reading {filename}: {e}")

    if df_list:
        final_df = pd.concat(df_list, ignore_index=True)
        final_df = final_df.fillna({"service_name": ""})
        print(f"Successfully loaded {len(final_df)} services from {len(df_list)} price files.")
        return final_df
    else:
        print("No service data loaded.")
        return pd.DataFrame(columns=["hospital_id", "hospital_name", "service_name", "price"])

# --- LIFESPAN ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global global_df
    global_df = load_data()
    yield
    global_df = pd.DataFrame()

app = FastAPI(title="Hospital Price API", lifespan=lifespan)

# --- Models ---
class ServiceItem(BaseModel):
    hospital_id: str
    hospital_name: str  # <--- Trường mới
    service_name: str
    price: int

class ServiceResponse(BaseModel):
    total: int
    data: List[ServiceItem]

# --- Endpoints ---
@app.get("/services", response_model=ServiceResponse)
async def get_services(
    q: Optional[str] = Query(None, description="Tên dịch vụ (VD: khám, răng...)"),
    hospital_name: Optional[str] = Query(None, description="Tên bệnh viện (VD: Chợ Rẫy, 115...)"),
    min_price: Optional[int] = Query(None),
    max_price: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 20
):
    if global_df.empty:
        return {"total": 0, "data": []}
    
    filtered_df = global_df
    
    # 1. Lọc theo tên bệnh viện (Tìm kiếm tương đối, không phân biệt hoa thường)
    if hospital_name:
        filtered_df = filtered_df[filtered_df['hospital_name'].str.lower().str.contains(hospital_name.lower(), na=False)]
    
    # 2. Lọc theo giá
    if min_price is not None:
        filtered_df = filtered_df[filtered_df['price'] >= min_price]
    if max_price is not None:
        filtered_df = filtered_df[filtered_df['price'] <= max_price]
        
    # 3. Lọc theo tên dịch vụ
    if q:
        filtered_df = filtered_df[filtered_df['service_name'].str.lower().str.contains(q.lower(), na=False)]

    total_count = len(filtered_df)
    
    # Sắp xếp: Ưu tiên bệnh viện, sau đó đến giá
    # filtered_df = filtered_df.sort_values(by=["hospital_name", "price"])
    
    result_df = filtered_df.iloc[skip : skip + limit]
    
    return {"total": total_count, "data": result_df.to_dict(orient="records")}

@app.get("/hospitals")
async def get_hospitals():
    """Trả về danh sách tất cả bệnh viện có trong dữ liệu"""
    if not hospital_map:
        return []
    # Trả về list các object {id, name} cho frontend dễ dùng
    results = [{"id": k, "name": v} for k, v in hospital_map.items()]
    return {"count": len(results), "hospitals": results}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)