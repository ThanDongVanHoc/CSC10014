import requests

class ChatPro:
    def __init__(self, search_model_url, interact_model_url):
        self.search_model_url = search_model_url
        self.interact_model_url = interact_model_url
    
    def analyze_query(self, user_msg, current_info):
        try:
            payload = {"query" : user_msg, "collected_info" : current_info}
            response = requests.post(f"{self.interact_model_url}/query1", json = payload, timeout = 30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Error analyze_query: {e}")
            return {"is_complete": False, "questions": ["Lỗi kết nối Server phân tích."], "collected_info": current_info}

    def search_locations(self, search_query, user_lat, user_lng):
        try:
            payload = {"query": search_query, "lat": user_lat, "lng": user_lng}
            response = requests.post(self.search_model_url, json = payload, timeout = 30)
            response.raise_for_status()
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                sorted_results = sorted(
                    results, 
                    key=lambda x: x.get('total_score', 0.0), 
                    reverse=True
                )

                return sorted_results[: 3]
            else:
                print(f"⚠️ Search API Error: {response.status_code} - {response.text}")
                return []            
        except Exception as e:
            print(f"❌ Error search_locations: {e}")
            return []
    
    def generate_guide(self, user_msg, top_results, collected_info):
        try:
            payload = {
                "original_query": user_msg,
                "top_k_results": top_results,
                "collected_info": collected_info      
            }

            response = requests.post(f"{self.interact_model_url}/query2", json = payload, timeout = 60)
            response.raise_for_status()

            return response.json()
        except Exception as e:
            print(f"❌ Error generate_guide: {e}")
            return {}