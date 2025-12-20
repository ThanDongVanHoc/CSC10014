import os
import json
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cấu hình Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash-lite')

@app.post("/extract-medical-data")
async def extract_data(file: UploadFile = File(...)):
    print(f"\n>>> [NEW REQUEST] Nhận file: {file.filename}")
    
    try:
        # Đọc dữ liệu ảnh trực tiếp từ request
        image_data = await file.read()
        
        # Tạo prompt yêu cầu Gemini đọc ảnh và trả về JSON
        prompt = """
        You are a medical data expert. Analyze this medical record image and extract information into JSON format.
        Translate all values to English. Correct any spelling errors.
        
        JSON Structure:
        {
          "draft_data": {
            "hospitalName": "string",
            "visitDate": "YYYY-MM-DD",
            "doctorName": "string",
            "diagnosis": "string",
            "medications": [
              { "name": "string", "dosage": "string", "quantity": "string" }
            ]
          }
        }
        """

        # Gửi ảnh trực tiếp cho Gemini (Không qua OCR trung gian)
        response = model.generate_content([
            prompt, 
            {"mime_type": file.content_type, "data": image_data}
        ])

        # Làm sạch chuỗi trả về để lấy JSON
        raw_text = response.text.strip().replace("```json", "").replace("```", "")
        result_json = json.loads(raw_text)

        # IN RA TERMINAL ĐỂ KIỂM TRA
        print(">>> [SUCCESS] Gemini đã trích xuất:")
        print(json.dumps(result_json, indent=2, ensure_ascii=False))
        
        return result_json

    except Exception as e:
        print(f">>> [ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)