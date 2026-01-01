import os
import glob
import re
import pandas as pd
import uvicorn
from contextlib import asynccontextmanager
from typing import List, Optional, Dict
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- CONFIGURATION ---
DATA_FOLDER = "data"
HOSPITAL_INFO_FILE = "data_benhvien_hcm.csv" # Main hospital info file
HOST = "127.0.0.1"
PORT = 8002  # Standard FastAPI port

# Global state to hold loaded data
global_df = pd.DataFrame()
hospital_map: Dict[str, str] = {} # Map: {id: hospital_name}

# --- HELPER: Clean Price Data ---
def clean_price(raw_price) -> int:
    """
    Converts raw CSV strings (e.g., '1,500,000', '1.500.000', 'Nan') into integers.
    """
    s = str(raw_price).strip()
    if s.lower() == 'nan' or s == '': 
        return 0
    
    # Handle ranges (e.g., "100000 - 200000") -> take the first value
    if '-' in s: 
        s = s.split('-')[0]
        
    # Remove non-digit characters
    digits_only = re.sub(r'[^\d]', '', s)
    
    try:
        if not digits_only: 
            return 0
        return int(digits_only)
    except ValueError:
        return 0

# --- HELPER: Load Hospital Metadata ---
def load_hospital_map() -> Dict[str, str]:
    """
    Reads the master hospital list to map IDs to readable Names.
    Expected CSV columns: 'Id', 'Ten' (or 'Name')
    """
    path = os.path.join(DATA_FOLDER, HOSPITAL_INFO_FILE)
    mapping = {}
    
    if os.path.exists(path):
        try:
            # Read CSV
            df = pd.read_csv(path)
            # Clean column names
            df.columns = [c.strip() for c in df.columns]
            
            # Map columns if they exist
            # Note: Adjust 'Ten' to 'Name' if you translate your CSV headers
            if "Id" in df.columns and "Ten" in df.columns:
                mapping = pd.Series(df.Ten.values, index=df.Id).to_dict()
                print(f"✅ [System] Loaded metadata for {len(mapping)} hospitals.")
            else:
                print(f"⚠️ [Warning] {HOSPITAL_INFO_FILE} is missing 'Id' or 'Ten' columns.")
        except Exception as e:
            print(f"❌ [Error] Failed to read hospital info: {e}")
    else:
        print(f"⚠️ [Warning] Metadata file {HOSPITAL_INFO_FILE} not found in {DATA_FOLDER}.")
    
    return mapping

# --- HELPER: Load Service Data ---
def load_data() -> pd.DataFrame:
    """
    Scans the data folder for CSV files, cleans them, and merges them into one DataFrame.
    """
    if not os.path.exists(DATA_FOLDER):
        os.makedirs(DATA_FOLDER)
        print(f"Created folder: {DATA_FOLDER}")
        return pd.DataFrame()

    # 1. Load the ID -> Name mapping
    global hospital_map
    hospital_map = load_hospital_map()

    # 2. Scan all CSV files
    all_files = glob.glob(os.path.join(DATA_FOLDER, "*.csv"))
    df_list = []
    
    print(f"📂 [System] Scanning {len(all_files)} files in '{DATA_FOLDER}'...")

    for filename in all_files:
        # Skip the metadata file itself
        if filename.endswith(HOSPITAL_INFO_FILE):
            continue

        try:
            # Read price file
            df = pd.read_csv(filename, dtype={"Gia (VND)": str})
            df.columns = [c.strip() for c in df.columns] 
            
            # Validation: Check for required columns
            # Note: Adjust 'Ten dich vu' -> 'Service Name' if CSVs change
            if "Ten dich vu" not in df.columns or "Gia (VND)" not in df.columns:
                continue
                
            # Extract ID from filename (e.g., 'bv_123.csv' -> 'bv_123')
            base_name = os.path.basename(filename)
            hospital_id = os.path.splitext(base_name)[0]
            
            # Add metadata columns
            df["hospital_id"] = hospital_id
            df["hospital_name"] = hospital_map.get(hospital_id, f"Hospital ({hospital_id})")

            # Standardize column names for API consistency
            df = df.rename(columns={"Ten dich vu": "service_name", "Gia (VND)": "price"})
            
            # Clean price column
            df['price'] = df['price'].apply(clean_price)
            
            # Keep only relevant data
            df = df[['hospital_id', 'hospital_name', 'service_name', 'price']]
            
            df_list.append(df)
        except Exception as e:
            print(f"❌ [Error] Skipped {filename}: {e}")

    if df_list:
        final_df = pd.concat(df_list, ignore_index=True)
        final_df = final_df.fillna({"service_name": "Unknown Service"})
        print(f"🚀 [System] Successfully loaded {len(final_df)} services.")
        return final_df
    else:
        print("⚠️ [System] No service data loaded.")
        return pd.DataFrame(columns=["hospital_id", "hospital_name", "service_name", "price"])

# --- LIFESPAN MANAGER ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Executes on server startup/shutdown. Loads data into memory once.
    """
    global global_df
    global_df = load_data()
    yield
    # Cleanup (if necessary)
    global_df = pd.DataFrame()

# --- APP INITIALIZATION ---
app = FastAPI(title="Hospital Price API", version="2.0", lifespan=lifespan)

# *** IMPORTANT: CORS CONFIGURATION ***
# This allows your frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (Safe for local dev, restrict in prod)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],
)

# --- Pydantic Models (Validation) ---
class ServiceItem(BaseModel):
    hospital_id: str
    hospital_name: str
    service_name: str
    price: int

class ServiceResponse(BaseModel):
    total: int
    data: List[ServiceItem]

class HospitalItem(BaseModel):
    hospital_id: str
    hospital_name: str

# --- ENDPOINTS ---

@app.get("/services", response_model=ServiceResponse)
async def search_services(
    q: Optional[str] = Query(None, description="Search keyword for service name"),
    hospital_name: Optional[str] = Query(None, description="Filter by exact or partial hospital name"),
    min_price: Optional[int] = Query(None, ge=0),
    max_price: Optional[int] = Query(None, ge=0),
    skip: int = 0,
    limit: int = 20
):
    """
    Search and filter medical services.
    """
    if global_df.empty:
        return {"total": 0, "data": []}

    print(min_price)
    print(max_price)  
    # Start with full dataset
    filtered_df = global_df
    
    # 1. Filter by Hospital Name
    if hospital_name and hospital_name.strip() != "":
        # Case-insensitive contains
        filtered_df = filtered_df[filtered_df['hospital_name'].str.lower().str.contains(hospital_name.lower(), na=False)]
    
    # 2. Filter by Price Range
    if min_price is not None:
        filtered_df = filtered_df[filtered_df['price'] >= min_price]
    if max_price is not None:
        filtered_df = filtered_df[filtered_df['price'] <= max_price]
        
    # 3. Filter by Keyword (Service Name)
    if q and q.strip() != "":
        filtered_df = filtered_df[filtered_df['service_name'].str.lower().str.contains(q.lower(), na=False)]

    # Calculate statistics
    total_count = len(filtered_df)
    
    # Pagination
    result_df = filtered_df.iloc[skip : skip + limit]
    
    return {
        "total": total_count,
        "data": result_df.to_dict(orient="records")
    }

@app.get("/hospitals", response_model=List[HospitalItem])
async def get_hospitals():
    """
    Returns a list of all hospitals available in the system.
    Used for populating dropdown menus.
    """
    if not hospital_map:
        return []
    
    # Convert map dictionary to list of objects
    results = [
        {"hospital_id": k, "hospital_name": v} 
        for k, v in hospital_map.items()
    ]
    
    # Sort alphabetically by name
    results.sort(key=lambda x: x['hospital_name'])
    
    return results

# --- ENTRY POINT ---
if __name__ == "__main__":
    # Ensure this matches the port in your Frontend JS (API_BASE_URL)
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)