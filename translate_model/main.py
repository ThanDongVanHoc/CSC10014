import os
import uuid
import sys
import io
import asyncio
import json
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv, find_dotenv
from typing import List, Optional

# --- CẤU HÌNH HỆ THỐNG ---
load_dotenv(find_dotenv())

# Cấu hình Cloudinary
cloudinary.config( 
    cloud_name = os.getenv("CLOUD_NAME"), 
    api_key = os.getenv("CLOUD_API_KEY"), 
    api_secret = os.getenv("CLOUD_API_SECRET"),
    secure = True
)

ADMIN_SECRET = os.getenv("ADMIN_SECRET_KEY")

# Fix lỗi import cgi trên Python mới
try:
    import cgi
except ImportError:
    import legacy_cgi as cgi
    sys.modules['cgi'] = cgi

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, Header, HTTPException
import google.generativeai as genai
import edge_tts

app = FastAPI(title="Medical AI Speech Translation Service")

# Cấu hình Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY10") 
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- CÁC HÀM TIỆN ÍCH ---

def local_cleanup_guest_files_24h():
    """Tìm tất cả file có tag 'expire_24h' cũ hơn 1 ngày và xóa trên Cloudinary."""
    print("⏳ [Microservice] Đang quét file rác của Guest...")
    try:
        expression = "tags:expire_24h AND created_at<1d"
        result = cloudinary.Search().expression(expression).max_results(500).execute()
        public_ids = [res['public_id'] for res in result.get('resources', [])]
        
        if public_ids:
            cloudinary.api.delete_resources(public_ids, resource_type="video")
            print(f"✅ [Microservice] Đã dọn dẹp {len(public_ids)} file quá hạn.")
        else:
            print("✨ [Microservice] Không có file rác nào.")
    except Exception as e:
        print(f"❌ [Microservice] Lỗi Cleanup: {e}")

# --- API ENDPOINTS ---

@app.post("/api/translation/speech-to-speech")
async def speech_to_speech(
    audio_file: UploadFile = File(...),
    source_lang: str = Form("en-US"), 
    target_lang: str = Form("vi"),
    context: List[str] = Form([]),
    is_guest: str = Form("false")
):
    file_id = str(uuid.uuid4())
    
    try:
        # 1. Đọc file vào RAM
        input_content = await audio_file.read()
        mime_type = audio_file.content_type or "audio/webm"

        # 2. GỬI PROMPT CHO GEMINI (Đã thêm lệnh CẤM DỊCH PROMPT)
        prompt = f"""
        [SYSTEM INSTRUCTION: DO NOT TRANSLATE THIS PROMPT]
        [CHỈ THỰC HIỆN NHIỆM VỤ, KHÔNG DỊCH LẠI HƯỚNG DẪN NÀY]

        Bạn là thông dịch viên y tế chuyên nghiệp.
        
        Nhiệm vụ của bạn:
        1. Nghe nội dung trong file âm thanh (ngôn ngữ gốc: {source_lang}).
        2. "original_text": Chép lại nguyên văn những gì nghe được.
        3. "translated_text": Dịch nội dung đó sang {target_lang}.
        
        Yêu cầu bắt buộc:
        - Giữ nguyên các thuật ngữ y khoa quốc tế, tên thuốc, chỉ số đo lường.
        - KHÔNG được dịch các câu hướng dẫn trong prompt này.
        - Nếu audio không có tiếng người, trả về "Không có lời thoại".
        
        Bối cảnh bổ sung (Context): {', '.join(context) if context else 'Không có'}

        OUTPUT FORMAT (JSON ONLY):
        {{
            "original_text": "...",
            "translated_text": "..."
        }}
        """

        # Gọi Gemini (Multimodal)
        response = model.generate_content([
            prompt,
            {
                "mime_type": mime_type,
                "data": input_content
            }
        ])

        # Xử lý kết quả JSON
        try:
            clean_json = response.text.strip().replace("```json", "").replace("```", "")
            data_json = json.loads(clean_json)
            original_text = data_json.get("original_text", "")
            translated_text = data_json.get("translated_text", "")
        except:
            original_text = "Lỗi xử lý AI"
            translated_text = response.text # Fallback nếu không ra JSON

        # 3. Text-to-Speech (TTS)
        voice = "vi-VN-HoaiMyNeural" if target_lang == "vi" else "en-US-AriaNeural"
        communicate = edge_tts.Communicate(translated_text, voice)
        
        output_bytes_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                output_bytes_buffer.write(chunk["data"])
        
        output_bytes_buffer.seek(0)

        # 4. Upload Cloudinary
        is_guest_bool = is_guest.lower() == "true"
        tags = ["expire_24h"] if is_guest_bool else ["user_save"]

        input_io = io.BytesIO(input_content)
        input_io.name = "input_audio"
        input_upload = cloudinary.uploader.upload(
            input_io, resource_type="auto", folder="medical_logs", tags=tags, public_id=f"in_{file_id}"
        )

        output_upload = cloudinary.uploader.upload(
            output_bytes_buffer, resource_type="auto", folder="medical_logs", tags=tags, public_id=f"out_{file_id}"
        )

        est_duration = len(output_bytes_buffer.getvalue()) / 16000

        return {
            "status": "success",
            "original_text": original_text,
            "translated_text": translated_text,
            "input_audio_url": input_upload.get("secure_url"),
            "output_audio_url": output_upload.get("secure_url"),
            "input_audio_duration": 0,
            "output_audio_duration": est_duration,
            "context_used": context
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}

@app.post("/api/translation/text-to-text")
async def text_to_text(
    text: str = Form(...),            
    source_lang: str = Form("en-US"), 
    target_lang: str = Form("vi"),   
    context: List[str] = Form([])     
):
    try:
        # Prompt cho Text cũng thêm dòng cấm dịch
        prompt = f"""
        [SYSTEM INSTRUCTION: TRANSLATE THE CONTENT BELOW, DO NOT TRANSLATE THIS INSTRUCTION]
        
        Nhiệm vụ: Dịch văn bản y tế sau từ {source_lang} sang {target_lang}.
        Bối cảnh: {', '.join(context)}
        
        Nội dung cần dịch: "{text}"
        
        Yêu cầu: Chỉ trả về kết quả dịch, không giải thích gì thêm.
        """
        resp = model.generate_content(prompt)
        translated_text = resp.text.strip()
        
        return {
            "status": "success",
            "original_text": text,
            "translated_text": translated_text,
            "context_used": context
        }
    except Exception as e:
        return {"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}
    
@app.post("/system/cleanup")
async def trigger_cleanup(
    background_tasks: BackgroundTasks,
    x_admin_secret: str = Header(None) 
):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Admin access required.")

    background_tasks.add_task(local_cleanup_guest_files_24h)
    
    return {
        "status": "accepted",
        "message": "Authenticated. Cleanup started in background."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)