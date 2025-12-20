import os
import json
import logging
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from paddleocr import PaddleOCR
import google.generativeai as genai

# Tắt log Paddle
logging.getLogger("ppocr").setLevel(logging.ERROR)

load_dotenv()

# --- CẤU HÌNH ---
app = FastAPI(title="Medical OCR API")

# Cấu hình Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
# Sử dụng model 2.5-flash-lite
model = genai.GenerativeModel('gemini-2.5-flash-lite')

# Khởi tạo OCR (Tải model một lần khi start server)
ocr_engine = PaddleOCR(use_textline_orientation=True, lang='vi')

# --- LOGIC XỬ LÝ ---

def perform_ocr(image_path):
    result = ocr_engine.ocr(image_path)
    try:
        if isinstance(result, list) and len(result) > 0:
            data = result[0]
            if 'rec_texts' in data:
                return " ".join(data['rec_texts'])
    except Exception as e:
        print(f"Lỗi bóc tách OCR: {e}")
    return ""

def analyze_with_gemini(raw_text):
    prompt = f"""
    You are an expert medical data digitizer.
    Read the following Vietnamese OCR text and extract it into a JSON with content in ENGLISH.
    
    Requirements:
    1. Translate all findings to medical English.
    2. Correct any OCR spelling errors before translating.
    3. Return ONLY the JSON object.
    
    Target JSON Structure:
    {{
      "status": "success",
      "draft_data": {{
        "hospitalName": "Name of hospital",
        "visitDate": "YYYY-MM-DD",
        "doctorName": "Doctor's name",
        "diagnosis": "Main diagnosis",
        "symptoms": "Symptoms found (null if none)",
        "medications": [
          {{ "name": "Drug name", "dosage": "Instructions", "quantity": "Total amount" }}
        ],
        "note": "Doctor's advice"
      }}
    }}
    
    Văn bản OCR: {raw_text}
    """
    response = model.generate_content(prompt)
    clean_json = response.text.strip().replace("```json", "").replace("```", "")
    return json.loads(clean_json)

# --- ENDPOINTS ---

@app.post("/extract-medical-data")
async def extract_data(file: UploadFile = File(...)):
    # 1. Lưu file tạm thời để xử lý
    temp_file = f"temp_{file.filename}"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # 2. Chạy OCR
        extracted_text = perform_ocr(temp_file)
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="Không thể nhận diện chữ từ ảnh.")
            
        # 3. Phân tích bằng Gemini
        result_json = analyze_with_gemini(extracted_text)
        
        return JSONResponse(content=result_json)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # 4. Xóa file tạm sau khi xong
        if os.path.exists(temp_file):
            os.remove(temp_file)

# Chạy server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)