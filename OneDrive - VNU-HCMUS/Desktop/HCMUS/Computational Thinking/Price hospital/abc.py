import pandas as pd

# Data for University Medical Center HCMC - Campus 3 (Traditional Medicine Focus)
# Prices are based on UMC general list and standard TM services
data_umc_campus3 = [
    # Khám bệnh (Examination)
    {"Ten dich vu": "Khám chuyên khoa (Y học cổ truyền / Nội / Ngoại...)", "Gia (VND)": "150.000"},
    {"Ten dich vu": "Khám sức khỏe tổng quát", "Gia (VND)": "200.000"},
    {"Ten dich vu": "Khám chuyên gia / VIP (Theo yêu cầu)", "Gia (VND)": "300.000 - 500.000"},
    
    # Y học Cổ truyền & Phục hồi chức năng (Traditional Medicine & Rehab - Campus 3 Specialty)
    {"Ten dich vu": "Châm cứu (Điện châm)", "Gia (VND)": "70.000 - 100.000"},
    {"Ten dich vu": "Thủy châm (Chưa bao gồm thuốc)", "Gia (VND)": "50.000 - 80.000"},
    {"Ten dich vu": "Xoa bóp bấm huyệt (Vùng)", "Gia (VND)": "100.000 - 200.000"},
    {"Ten dich vu": "Kéo giãn cột sống (Máy)", "Gia (VND)": "100.000"},
    {"Ten dich vu": "Siêu âm trị liệu", "Gia (VND)": "120.000"},
    {"Ten dich vu": "Sóng xung kích trị liệu", "Gia (VND)": "300.000 - 500.000"},
    {"Ten dich vu": "Tập vận động thụ động / chủ động", "Gia (VND)": "100.000 - 150.000"},
    {"Ten dich vu": "Cấy chỉ (Catgut embedding)", "Gia (VND)": "300.000 - 600.000"},
    
    # Cận lâm sàng (Paraclinical)
    {"Ten dich vu": "Chụp X-quang (1 vị trí)", "Gia (VND)": "100.000 - 200.000"},
    {"Ten dich vu": "Siêu âm tổng quát", "Gia (VND)": "150.000 - 300.000"},
    {"Ten dich vu": "Xét nghiệm máu cơ bản (Công thức máu)", "Gia (VND)": "80.000 - 100.000"},
    {"Ten dich vu": "Sắc thuốc thang (Đóng túi)", "Gia (VND)": "20.000 - 30.000"},

    # Gói khám (Packages - Reference from UMC System)
    {"Ten dich vu": "Gói khám sức khỏe tổng quát cơ bản (Nam)", "Gia (VND)": "1.900.000 - 2.500.000"},
    {"Ten dich vu": "Gói khám sức khỏe tổng quát cơ bản (Nữ)", "Gia (VND)": "1.900.000 - 2.700.000"},
    {"Ten dich vu": "Gói tầm soát đau thắt ngực / Tim mạch", "Gia (VND)": "2.300.000"},
    {"Ten dich vu": "Gói tầm soát xương khớp / loãng xương", "Gia (VND)": "1.500.000 - 2.000.000"}
]

df_umc_campus3 = pd.DataFrame(data_umc_campus3)
output_file_umc3 = "6a267730.csv"
df_umc_campus3.to_csv(output_file_umc3, index=False)

print(f"File saved to {output_file_umc3}")
print(df_umc_campus3.head())