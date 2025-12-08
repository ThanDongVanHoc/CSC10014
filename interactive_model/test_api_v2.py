import requests
import json

# Base URL
BASE_URL = "http://localhost:8000"

def test_query1_initial():
    """Test initial query with some information"""
    print("\n=== Test Query 1: Initial Query ===")
    
    payload = {
        "query": "Tôi là người Indonesia muốn gia hạn visa, đang ở quận 1",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    return result

def test_query1_followup():
    """Test follow-up query with additional information"""
    print("\n=== Test Query 1: Follow-up Query ===")
    
    # Simulate collected info from previous interaction
    payload = {
        "query": "Mein Name ist Hilter, ich bin 1990 geboren, habe zwei Kinder und hatte einen Verkehrsunfall.",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    
    return result

def test_query2_v2():
    """Test query 2 V2 with MULTIPLE locations (returns guides for ALL k locations)"""
    print("\n=== Test Query 2 V2: Generate Guides for ALL k Locations ===")
    
    payload = {
        "original_query": "Tôi là người Indonesia muốn gia hạn visa",
        "top_k_results": [
            {
                "Ma": "LSQ_001",
                "Ten": "Tổng Lãnh sự quán Indonesia",
                "DiaChi": "18 Phùng Khắc Khoan, P. Đa Kao, Quận 1",
                "Lat": "10.7813",
                "Lng": "106.6953",
                "SDT": "02838251888",
                "Website": "https://www.kemlu.go.id/hochiminhcity",
                "Category": "LanhSuQuan",
                "raw_distance_km": 0.354,
                "distance_score": 1.0,
                "spec_score": 0.9,
                "spec_reason": "Địa điểm này là Lãnh sự quán của Indonesia",
                "total_score": 0.92
            },
            {
                "Ma": "XNC_001",
                "Ten": "Cục Quản lý Xuất nhập cảnh TP.HCM",
                "DiaChi": "161 Nguyễn Du, P. Bến Thành, Quận 1",
                "Lat": "10.7699",
                "Lng": "106.6905",
                "SDT": "02838299797",
                "Website": "https://xuatnhapcanh.gov.vn",
                "Category": "CucXuatNhapCanh",
                "raw_distance_km": 1.2,
                "distance_score": 0.85,
                "spec_score": 0.8,
                "spec_reason": "Cơ quan chính phủ phụ trách xuất nhập cảnh",
                "total_score": 0.82
            },
            {
                "Ma": "PH_001",
                "Ten": "UBND Phường Bến Nghé - Quận 1",
                "DiaChi": "138 Lê Thánh Tôn, P. Bến Nghé, Quận 1",
                "Lat": "10.7756",
                "Lng": "106.7014",
                "SDT": "02838222641",
                "Website": "http://www.quan1.hochiminhcity.gov.vn",
                "Category": "UyBanNhanDan",
                "raw_distance_km": 0.8,
                "distance_score": 0.9,
                "spec_score": 0.5,
                "spec_reason": "Có thể hỗ trợ thủ tục giấy tờ địa phương",
                "total_score": 0.68
            }
        ],
        "collected_info": {
            "nationality": "Indonesian",
            "problem": "gia hạn visa",
            "current_location": "Quận 1",
            "visa_type": "Tourist",
            "visa_expiry_status": "Expires in 3 days"
        }
    }
    
    response = requests.post(f"{BASE_URL}/query2", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

if __name__ == "__main__":
    print("Testing Interactive Model API V2")
    print("Make sure the server is running on http://localhost:8000 with main_v2.py")
    print("=" * 60)
    
    try:
        # Test Query 1 - Initial (same as V1)
        #result1 = test_query1_initial()
        
        # Test Query 1 - Follow-up (same as V1)
        #result2 = test_query1_followup()
        
        # Test Query 2 V2 - NEW: Returns guides for ALL k locations
        result3 = test_query2_v2()
        
    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to the server.")
        print("Please make sure the server is running with: python main_v2.py")
    except Exception as e:
        print(f"\nError during testing: {e}")
