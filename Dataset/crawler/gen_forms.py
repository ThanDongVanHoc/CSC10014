import os
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.text import WD_COLOR_INDEX 

# Cấu hình đường dẫn thư mục
FOLDER_NAME = 'forms'

if not os.path.exists(FOLDER_NAME):
    os.makedirs(FOLDER_NAME)
    print(f"📁 Đã tạo thư mục: {FOLDER_NAME}")

def set_font(run, size=13, bold=False):
    """Hàm hỗ trợ chỉnh font nhanh"""
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    run.font.bold = bold

def add_preview_field(paragraph, variable_name_en, placeholder_text="", font_size=13):
    """
    Hàm mới: Chèn trường cần điền với highlight màu vàng và tên biến Tiếng Anh làm chú thích.
    """
    # 1. Chèn khoảng trống
    if placeholder_text:
        paragraph.add_run(placeholder_text)
    
    # 2. Chèn tên biến Tiếng Anh (dùng làm chú thích và tô màu highlight)
    run_display = paragraph.add_run(f"[{variable_name_en}]")
    set_font(run_display, size=font_size)
    run_display.font.highlight_color = WD_COLOR_INDEX.YELLOW # Tô màu vàng nổi bật
    
    # 3. Thêm khoảng trắng sau đó
    paragraph.add_run(" ")


def create_marriage_reg_form():
    """1. Tạo mẫu Tờ khai đăng ký kết hôn"""
    doc = Document()
    
    # Header
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n')
    set_font(r, bold=True)
    r = p.add_run('Độc lập - Tự do - Hạnh phúc')
    set_font(r, bold=True)
    
    # Title
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('\nTỜ KHAI ĐĂNG KÝ KẾT HÔN')
    set_font(r, size=14, bold=True)
    
    doc.add_paragraph('Kính gửi: ..........')
    
    # Table
    table = doc.add_table(rows=1, cols=3)
    table.style = 'Table Grid'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Thông tin'
    hdr_cells[1].text = 'Bên Nam (Husband)'
    hdr_cells[2].text = 'Bên Nữ (Wife)'
    
    data = [
        ("Họ và tên", "FULL_NAME", "FULL_NAME_WIFE"),
        ("Ngày sinh", "DATE_OF_BIRTH", "DATE_OF_BIRTH_WIFE"),
        ("Dân tộc", "ETHNIC", "ETHNIC_WIFE"),
        ("Quốc tịch", "NATIONALITY", "NATIONALITY_WIFE"),
        ("Nơi thường trú", "RESIDENCE_ADDRESS", "RESIDENCE_ADDRESS_WIFE"),
        ("Giấy tờ tùy thân", "PASSPORT_NUMBER", "ID_NUMBER_WIFE"),
        ("Kết hôn lần thứ", "MARRIAGE_TIMES", "MARRIAGE_TIMES_WIFE")
    ]
    
    for label, male_var, female_var in data:
        row_cells = table.add_row().cells
        row_cells[0].text = label
        
        # Áp dụng cho cell Bên Nam
        add_preview_field(row_cells[1].paragraphs[0], male_var, placeholder_text="")
        
        # Áp dụng cho cell Bên Nữ
        add_preview_field(row_cells[2].paragraphs[0], female_var, placeholder_text="")
        
    p = doc.add_paragraph('\nChúng tôi cam đoan những lời khai trên đây là đúng sự thật.')
    
    # Footer ký tên
    table_sign = doc.add_table(rows=1, cols=2)
    row_sign = table_sign.rows[0].cells
    p1 = row_sign[0].add_paragraph('Bên Nam\n(Ký tên)')
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2 = row_sign[1].add_paragraph('Bên Nữ\n(Ký tên)')
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER

    output_path = os.path.join(FOLDER_NAME, 'marriage_reg_form_preview.docx')
    doc.save(output_path)
    print(f"✅ Đã tạo: {output_path}")

def create_criminal_record_req():
    """2. Tạo mẫu Tờ khai Lý lịch tư pháp (Mẫu 01)"""
    doc = Document()
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.add_run('Mẫu số 01/2025/LLTP')
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\n')
    set_font(r, bold=True)
    r = p.add_run('TỜ KHAI YÊU CẦU CẤP PHIẾU LÝ LỊCH TƯ PHÁP')
    set_font(r, size=14, bold=True)
    
    doc.add_paragraph('Kính gửi: ..........')
    
    p = doc.add_paragraph('1. Tên tôi là: ')
    add_preview_field(p, 'FULL_NAME', placeholder_text="")
    
    p = doc.add_paragraph('2. Tên gọi khác: ')
    add_preview_field(p, 'OTHER_NAME', placeholder_text="", font_size=13)
    p.add_run(' 3. Giới tính: ')
    add_preview_field(p, 'GENDER', placeholder_text="")
    
    p = doc.add_paragraph('4. Ngày sinh: ')
    add_preview_field(p, 'DATE_OF_BIRTH', placeholder_text="")
    
    p = doc.add_paragraph('5. Nơi sinh: ')
    add_preview_field(p, 'PLACE_OF_BIRTH', placeholder_text="")
    
    p = doc.add_paragraph('6. Quốc tịch: ')
    add_preview_field(p, 'NATIONALITY', placeholder_text="")
    p.add_run(' 7. Dân tộc: ')
    add_preview_field(p, 'ETHNIC', placeholder_text="")
    
    doc.add_paragraph('8. Nơi thường trú: ')
    add_preview_field(doc.paragraphs[-1], 'PERMANENT_ADDRESS')
    
    doc.add_paragraph('9. Nơi tạm trú: ')
    add_preview_field(doc.paragraphs[-1], 'TEMPORARY_ADDRESS')
    
    doc.add_paragraph('10. Giấy tờ tùy thân số: ')
    add_preview_field(doc.paragraphs[-1], 'PASSPORT_NUMBER', placeholder_text="")
    doc.add_paragraph('Cấp ngày: ')
    add_preview_field(doc.paragraphs[-1], 'ISSUE_DATE', placeholder_text="")
    doc.paragraphs[-1].add_run(' Tại: ')
    add_preview_field(doc.paragraphs[-1], 'ISSUE_PLACE')
    
    doc.add_paragraph('11. Họ tên cha: ')
    add_preview_field(doc.paragraphs[-1], 'FATHER_NAME', placeholder_text="")
    doc.add_paragraph('12. Họ tên mẹ: ')
    add_preview_field(doc.paragraphs[-1], 'MOTHER_NAME', placeholder_text="")
    doc.add_paragraph('13. Họ tên vợ/chồng: ')
    add_preview_field(doc.paragraphs[-1], 'SPOUSE_NAME', placeholder_text="")
    
    doc.add_paragraph('\n15. Quá trình cư trú từ năm 14 tuổi:')
    
    # Bảng quá trình cư trú (Dùng tags Jinja2 cho docxtpl)
    table = doc.add_table(rows=2, cols=3)
    table.style = 'Table Grid'
    hdr = table.rows[0].cells
    hdr[0].text = 'Thời gian'
    hdr[1].text = 'Nơi thường trú/tạm trú'
    hdr[2].text = 'Nghề nghiệp, nơi làm việc'
    row_preview = table.rows[1].cells
    add_preview_field(row_preview[0].paragraphs[0], 'YEAR_RANGE', placeholder_text="")
    add_preview_field(row_preview[1].paragraphs[0], 'RESIDENCE_PLACE', placeholder_text="")
    add_preview_field(row_preview[2].paragraphs[0], 'OCCUPATION_WORKPLACE', placeholder_text="")
    
    doc.add_paragraph('\nTôi xin cam đoan những lời khai trên là đúng sự thật.')
    
    output_path = os.path.join(FOLDER_NAME, 'criminal_record_req_preview.docx')
    doc.save(output_path)
    print(f"✅ Đã tạo: {output_path}")

def create_hospital_discharge():
    """4. Tạo mẫu Giấy ra viện"""
    doc = Document()
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\n')
    set_font(r, bold=True)
    r = p.add_run('GIẤY RA VIỆN')
    set_font(r, size=16, bold=True)
    
    doc.add_paragraph('Bệnh viện: ')
    add_preview_field(doc.paragraphs[-1], 'HOSPITAL_NAME')
    doc.add_paragraph('Khoa: ')
    add_preview_field(doc.paragraphs[-1], 'DEPARTMENT')
    doc.add_paragraph('-' * 60)
    
    doc.add_paragraph('Họ tên người bệnh: ')
    add_preview_field(doc.paragraphs[-1], 'PATIENT_NAME')
    doc.add_paragraph('Tuổi: ')
    add_preview_field(doc.paragraphs[-1], 'AGE', placeholder_text="")
    doc.paragraphs[-1].add_run(' Giới tính: ')
    add_preview_field(doc.paragraphs[-1], 'GENDER', placeholder_text="")

    doc.add_paragraph('Quốc tịch: ')
    add_preview_field(doc.paragraphs[-1], 'NATIONALITY')
    doc.add_paragraph('Địa chỉ: ')
    add_preview_field(doc.paragraphs[-1], 'ADDRESS')
    doc.add_paragraph('Vào viện lúc: ')
    add_preview_field(doc.paragraphs[-1], 'ADMIT_DATE')
    doc.add_paragraph('Ra viện lúc: ')
    add_preview_field(doc.paragraphs[-1], 'DISCHARGE_DATE')
    
    p = doc.add_paragraph()
    run = p.add_run('Chẩn đoán: ')
    set_font(run, bold=True)
    add_preview_field(p, 'DIAGNOSIS')
    
    p = doc.add_paragraph()
    run = p.add_run('Phương pháp điều trị: ')
    set_font(run, bold=True)
    add_preview_field(p, 'TREATMENT')
    
    p = doc.add_paragraph('\nNgày [TODAY_DATE]')
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    
    p = doc.add_paragraph('TRƯỞNG KHOA\n(Ký tên, đóng dấu)')
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    
    output_path = os.path.join(FOLDER_NAME, 'hospital_discharge_paper_preview.docx')
    doc.save(output_path)
    print(f"✅ Đã tạo: {output_path}")

# Chạy toàn bộ các hàm
if __name__ == "__main__":
    print("⏳ Đang tạo các file mẫu...")
    # Bạn cần đảm bảo đã chạy: pip install python-docx
    try:
        create_marriage_reg_form()
        create_criminal_record_req()
        create_hospital_discharge()
        print("\n🎉 HOÀN TẤT! Kiểm tra thư mục 'forms' để thấy 5 file .docx đã có highlight.")
    except Exception as e:
        print(f"\n❌ LỖI TRONG QUÁ TRÌNH TẠO FILE: {e}")
        print("Vui lòng kiểm tra lại: 1. Đã cài python-docx chưa? 2. Có đang mở file Word nào trong thư mục 'forms' không?")