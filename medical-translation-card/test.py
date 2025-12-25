"""
Simple Test Script for Medical Translation Card API
Chạy server trước: uvicorn main:app --reload
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"


def test_generate_compact_card():
    """Test generate compact medical card endpoint - phiên bản tối ưu"""
    print("\n" + "=" * 50)
    print("🔍 Testing Generate Compact Medical Card (Optimized)...")
    
    # Test data
    test_input = {
        "identity": {
            "userId": "P001",
            "full_name": "John Smith",
            "nationality": "USA",
            "age": 35,
            "gender": "Male",
            "date_of_birth": "1990-01-15",
            "emergency_contact": "Jane Smith",
            "emergency_contact_phone": "+1 234 567 8900"
        },
        "medical_critical": {
            "current_symptoms": "I have had a headache and dizziness since this morning",
            "blood_type": "A+",
            "allergies": ["Penicillin", "Aspirin"],
            "Medications": ["Metformin", "Warfarin"],
            "Medical_history": ["Tiểu đường", "Cao huyết áp"],
            "surgical_history": ["Appendectomy"]
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/medical-card/generate-compact",
            json=test_input,
            headers={"Content-Type": "application/json"}
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2, ensure_ascii=False)}")
        else:
            print(f"Error: {response.text}")
        
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("❌ Không thể kết nối!")
        return False


def run_all_tests():
    """Run all tests"""
    print("\n🏥 MEDICAL TRANSLATION CARD API - TEST SUITE")
    print("=" * 50)
    
    results = {
        #"Health Check": test_health(),
        #"Detailed Health": test_detailed_health(),
        #"Generate Card (Full)": test_generate_medical_card(),
        "Generate Card (Compact)": test_generate_compact_card(),
        #"Generate Card (Simple)": test_simple_symptom()
    }
    
    print("\n" + "=" * 50)
    print("📊 KẾT QUẢ TEST:")
    print("=" * 50)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    total = len(results)
    passed = sum(results.values())
    print(f"\nTổng: {passed}/{total} tests passed")
    
    return all(results.values())


if __name__ == "__main__":
    run_all_tests()
