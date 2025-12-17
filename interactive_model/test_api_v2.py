import requests
import json
import time

# Base URL
BASE_URL = "http://localhost:8000"

# Delay between requests to avoid rate limit
REQUEST_DELAY = 1  # seconds

def test_query1_initial():
    """Test initial query with some information"""
    print("\n=== Test Query 1: Initial Query ===")
    
    payload = {
        "query": "tôi cần sao y công chứng giấy khai sinh",
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

def test_overwrite_scenario():
    """
    [CRITICAL TEST] Kiểm tra logic Ghi đè (Overwrite).
    Giả lập: Context cũ bảo mất đồ, nhưng người dùng đổi ý muốn gia hạn visa.
    """
    print("\n=== Test Query 1: Overwrite/Correction Logic ===")

    # Giả lập Context cũ đang lưu là "Mất Visa/Hộ chiếu"
    current_context = {
        "nationality": "American",
        "problem_category": "Lost Property",
        "details": "Lost passport in District 1"
    }

    # User thay đổi ý định
    user_query = "Thực ra tôi không bị mất, tôi chỉ muốn gia hạn visa thôi."
    
    payload = {
        "query": user_query,
        "collected_info": current_context
    }

    print(f"Context (Old): {json.dumps(current_context, ensure_ascii=False)}")
    print(f"Input (New):   {user_query}")
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    
    print("AI Response:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    # Simple check logic in print
    new_prob = result.get('collected_info', {}).get('problem_category', '')
    if "Renew" in new_prob or "Extension" in new_prob or "Gia hạn" in new_prob:
        print(">>> RESULT: SUCCESS (Updated correctly)")
    else:
        print(">>> RESULT: WARNING (Might not have updated)")

    return result

def test_query1_visa_extension():
    """Test query about visa extension"""
    print("\n=== Test Query 1: Visa Extension ===")
    
    payload = {
        "query": "Tôi là người Mỹ, visa du lịch của tôi sắp hết hạn trong 5 ngày, tôi muốn gia hạn",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_lost_passport():
    """Test query about lost passport"""
    print("\n=== Test Query 1: Lost Passport ===")
    
    payload = {
        "query": "I lost my passport in Ho Chi Minh City, I'm from Japan and need help",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_work_permit():
    """Test query about work permit"""
    print("\n=== Test Query 1: Work Permit ===")
    
    payload = {
        "query": "Tôi là người Hàn Quốc, muốn xin giấy phép lao động để làm việc tại Việt Nam",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_marriage_registration():
    """Test query about marriage registration"""
    print("\n=== Test Query 1: Marriage Registration ===")
    
    payload = {
        "query": "Tôi là người Việt Nam muốn đăng ký kết hôn với người nước ngoài (người Pháp)",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_birth_certificate():
    """Test query about birth certificate for foreigner's child"""
    print("\n=== Test Query 1: Birth Certificate ===")
    
    payload = {
        "query": "Con tôi sinh ra ở Việt Nam, tôi là người Đức, vợ tôi là người Việt, cần làm giấy khai sinh",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_traffic_accident():
    """Test query about traffic accident"""
    print("\n=== Test Query 1: Traffic Accident ===")
    
    payload = {
        "query": "Tôi là du khách Úc, bị tai nạn giao thông ở Quận 3, cần báo công an và làm thủ tục",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_temporary_residence():
    """Test query about temporary residence registration"""
    print("\n=== Test Query 1: Temporary Residence ===")
    
    payload = {
        "query": "I'm from China and need to register temporary residence, I'm staying in District 7 for 3 months",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_notarization():
    """Test query about document notarization"""
    print("\n=== Test Query 1: Document Notarization ===")
    
    payload = {
        "query": "Tôi cần công chứng bản dịch bằng đại học để xin việc ở nước ngoài",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_student_visa():
    """Test query about student visa"""
    print("\n=== Test Query 1: Student Visa ===")
    
    payload = {
        "query": "Tôi là sinh viên Thái Lan đang học ở ĐH Bách Khoa, visa du học sắp hết hạn",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_business_registration():
    """Test query about business registration for foreigner"""
    print("\n=== Test Query 1: Business Registration ===")
    
    payload = {
        "query": "I'm from Singapore and want to open a company in Vietnam, what documents do I need?",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_medical_emergency():
    """Test query about medical emergency"""
    print("\n=== Test Query 1: Medical Emergency ===")
    
    payload = {
        "query": "Tôi là người Anh, bị ốm nặng cần đi bệnh viện gấp, không có bảo hiểm",
        "collected_info": {}
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def test_query1_with_partial_info():
    """Test query with some collected info from previous interaction"""
    print("\n=== Test Query 1: With Partial Collected Info ===")
    
    payload = {
        "query": "Tôi muốn tiếp tục làm thủ tục gia hạn visa",
        "collected_info": {
            "nationality": "American",
            "visa_type": "Tourist"
        }
    }
    
    response = requests.post(f"{BASE_URL}/query1", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def run_all_query1_tests():
    """Run all query1 tests"""
    tests = [
        ("OVERWRITE TEST (New)", test_overwrite_scenario), # <--- CHẠY CÁI NÀY ĐẦU TIÊN
        ("Initial - Sao y công chứng", test_query1_initial),
        ("Follow-up - German info", test_query1_followup),
        ("Visa Extension - American", test_query1_visa_extension),
        # Các test khác có thể comment lại nếu muốn tiết kiệm thời gian
        # ("Lost Passport - Japanese", test_query1_lost_passport),
        # ("Work Permit - Korean", test_query1_work_permit),
        # ("Marriage Registration", test_query1_marriage_registration),
        # ("Birth Certificate - German father", test_query1_birth_certificate),
        # ("Traffic Accident - Australian", test_query1_traffic_accident),
        # ("Temporary Residence - Chinese", test_query1_temporary_residence),
        # ("Document Notarization", test_query1_notarization),
        # ("Student Visa - Thai", test_query1_student_visa),
        # ("Business Registration - Singaporean", test_query1_business_registration),
        # ("Medical Emergency - British", test_query1_medical_emergency),
        # ("With Partial Info", test_query1_with_partial_info),
    ]
    
    results = {}
    for name, test_func in tests:
        try:
            print(f"\n{'='*60}")
            print(f"Running: {name}")
            print('='*60)
            results[name] = test_func()
            # Add delay to avoid rate limit
            time.sleep(REQUEST_DELAY)
        except Exception as e:
            print(f"Error in {name}: {e}")
            results[name] = {"error": str(e)}
    
    return results

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
            }
        ],
        "collected_info": {
            "nationality": "Indonesian",
            "problem": "gia hạn visa",
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
    print("Make sure the server is running on http://localhost:8000")
    print("=" * 60)
    
    try:
        # Chạy test scenario ghi đè
        test_overwrite_scenario()
        
        # Hoặc chạy tất cả (bỏ comment nếu muốn)
        # run_all_query1_tests()
        
    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to the server.")
        print("Please make sure the server is running.")
    except Exception as e:
        print(f"\nError during testing: {e}")