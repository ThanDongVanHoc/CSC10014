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

def test_query2():
    """Test query 2 with Model A results"""
    print("\n=== Test Query 2: Generate Guide ===")
    
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
            "nationality": "Indonesia",
            "problem": "gia hạn visa",
            "current_address": "123 đường ABC, quận 1",
            "full_name": "Budi Santoso",
            "birth_year": 1990,
            "num_people": 2
        }
    }
    
    response = requests.post(f"{BASE_URL}/query2", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result

if __name__ == "__main__":
    print("Testing Interactive Model API")
    print("Make sure the server is running on http://localhost:8000")
    print("=" * 60)
    
    try:
        # Test Query 1 - Initial
        result1 = test_query1_initial()
        
        # Test Query 1 - Follow-up
        result2 = test_query1_followup()
        
        # Test Query 2
        result3 = test_query2()
        
        print("\n" + "=" * 60)
        print("All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to the server.")
        print("Please make sure the server is running with: python main.py")
    except Exception as e:
        print(f"\nError during testing: {e}")
