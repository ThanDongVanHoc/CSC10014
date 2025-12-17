import requests
import os
import dotenv

dotenv.load_dotenv()

class ChatPro:
    def __init__(self, search_model_url, interact_model_url):
        self.search_model_url = search_model_url
        self.interact_model_url = interact_model_url
        self.hf_token = os.getenv("HUGGING_FACE_TOKEN") 
        self.hf_api_url = "https://router.huggingface.co/hf-inference/models/valhalla/distilbart-mnli-12-1"
    
    def analyze_query(self, user_msg, current_info):
        try:
            payload = {"query" : user_msg, "collected_info" : current_info}
            response = requests.post(f"{self.interact_model_url}/query1", json = payload, timeout = 30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Error analyze_query: {e}")
            return {"is_complete": False, "questions": ["Analysis server connection error."], "collected_info": current_info}

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

                return sorted_results[: 2]
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
        
    def detect_intent_hybrid(self, user_msg, current_info, last_bot_reply=None):
        msg_lower = user_msg.strip().lower()

        # --- TỪ ĐIỂN TỪ KHÓA ---
        greeting_keywords = {
            "hi", "hello", "hey", "greetings", "good morning", 
            "chào", "xin chào", "alo", "hallo",
            "bonjour", "salut", "konnichiwa", "annyeong", "ni hao"
        }

        new_topic_keywords = {
            "thank", "thanks", "bye", "goodbye", "done", "ok thanks", 
            "reset", "restart", "start over", "different problem", "another place",
            "cảm ơn", "cám ơn", "tạm biệt", "bye", "xong rồi", "được rồi",
            "chat mới", "bắt đầu lại", "tìm cái khác", "vấn đề khác",
            "merci", "au revoir", "arigato", "sayonara", "kamsahamnida", "xie xie",
            "stop", "dừng", "thoát"
        }

        # --- BƯỚC 1: TRA TỪ ĐIỂN ---
        for kw in greeting_keywords:
            if kw == msg_lower or (len(msg_lower) < 20 and kw in msg_lower):
                return "greeting"

        for kw in new_topic_keywords:
            if kw in msg_lower:
                return "new_topic"

        # --- BƯỚC 2: GỌI AI (HUGGING FACE) ---
        try:
            topic = current_info.get('problem_category', 'Current Topic')
            
            # Context ngắn gọn
            if last_bot_reply:
                prev_ctx = (last_bot_reply[:100] + "...") if len(last_bot_reply) > 100 else last_bot_reply
            else:
                prev_ctx = "None"
            
            # Sửa 'User asks' thành 'User says' để trung lập hơn (bao gồm cả trả lời)
            input_sequence = f"Context: User and AI are discussing '{topic}'. AI said: '{prev_ctx}'. User says: '{user_msg}'."
            
            print(f"📡 Sending to HF: {input_sequence}")

            headers = {"Authorization": f"Bearer {self.hf_token}"}
            
            # === CẬP NHẬT LABELS ĐỐI KHÁNG ===
            # Label 1: Bao quát cả 'Hỏi' và 'Trả lời' liên quan đến topic
            label_related = f"continuing the conversation about {topic}"
            
            # Label 2: Chuyển chủ đề hoàn toàn (thêm 'not {topic}' để AI phân biệt rõ)
            label_new_topic = f"switching to a completely different topic (not {topic})"
            
            # Label 3: Chào hỏi
            label_greeting = "greeting or closing conversation"

            candidate_labels = [label_related, label_new_topic, label_greeting]
            
            payload = {
                "inputs": input_sequence,
                "parameters": {"candidate_labels": candidate_labels}
            }
            
            response = requests.post(self.hf_api_url, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                print(f"🔍 DEBUG HF RAW: {result}")
                
                # Parsing kết quả
                top_label = "unknown"
                score = 0.0
                
                # Xử lý format JSON linh hoạt
                if isinstance(result, list) and len(result) > 0 and 'label' in result[0]:
                    top_label = result[0]['label']
                    score = result[0]['score']
                elif isinstance(result, dict) and 'labels' in result:
                    top_label = result['labels'][0]
                    score = result['scores'][0]
                elif isinstance(result, list) and len(result) > 0 and 'labels' in result[0]:
                    top_label = result[0]['labels'][0]
                    score = result[0]['scores'][0]

                print(f"🤖 HF Result: '{top_label}' ({score:.2f})")

                # === LOGIC MỚI: DỰA VÀO LABEL CHIẾN THẮNG + NGƯỠNG 0.5 ===
                
                # Nếu AI chọn Label Related VÀ điểm > 0.5 -> Follow Up
                if top_label == label_related and score > 0.5:
                    return "follow_up"
                
                # Nếu AI chọn Greeting -> Greeting
                elif top_label == label_greeting:
                    return "greeting"
                
                # Còn lại (Label New Topic thắng HOẶC điểm Related <= 0.5) -> New Topic
                else:
                    print(f"👉 Detected New Topic Switch (Score: {score:.2f})")
                    return "new_topic"

            else:
                print(f"⚠️ HF Error: {response.text}")
                # Fallback: Nếu API lỗi, ưu tiên giữ context (follow_up) trừ khi chắc chắn
                return "follow_up"
                
        except Exception as e:
            print(f"❌ HF Exception: {e}")
            return "follow_up"
        
    def chat_with_guide(self, user_msg, guide_data):
        """Gửi Guide cũ + Câu hỏi mới sang Main_v2 để Gemini trả lời"""
        try:
            payload = {"message": user_msg, "guide_context": guide_data}
            response = requests.post(f"{self.interact_model_url}/chat_context", json=payload, timeout=20)
            if response.status_code == 200:
                return response.json().get("reply", "Lỗi xử lý AI.")
        except Exception as e:
            print(f"❌ Chat Context Error: {e}")
        return "Xin lỗi, tôi không thể kết nối ngay lúc này."