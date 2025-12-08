/**
 * guide_manager.js
 * UPDATED VERSION: Support guide.json structure
 */
const MOCK_SCENARIO = {
  title: "Thủ tục Sao y tại UBND",
  steps: [
    {
      id: 1,
      type: 'doc',
      title: "Chuẩn bị hồ sơ",
      desc: "Bạn cần bản gốc + 3 bản photo CMND/CCCD. Nếu chưa photo, hãy tìm tiệm photo gần nhất.",
      lat: 10.7760, lng: 106.7000,
      suggestion_query: "Tiệm photo",
      suggestion_text: "🔍 Tìm tiệm photo gần đây",
      troubles: [
        { keywords: ["quên", "gốc"], solution: "Bạn bắt buộc phải về lấy bản gốc. Không thể sao y nếu thiếu." },
        { keywords: ["photo", "tiệm"], solution: "Nhấn nút 'Tìm tiệm photo' ở trên, tôi sẽ chỉ đường cho bạn." }
      ]
    },
    {
      id: 2,
      type: 'move',
      title: "Di chuyển đến Bãi xe",
      desc: "Đi đến bãi giữ xe cổng sau đường Lê Thánh Tôn. Đừng để xe ở cổng chính.",
      lat: 10.7766, lng: 106.7008,
      fallback_desc: "Vincom Center",
      fallback_lat: 10.7780, fallback_lng: 106.7015,
      troubles: [
        { keywords: ["hết chỗ", "đầy", "full"], solution: "Đừng lo! Tôi tìm thấy bãi xe **Vincom Center** đối diện. Đã cập nhật bản đồ." },
        { keywords: ["đóng cửa", "nghỉ"], solution: "Nếu bãi xe đóng cửa, hãy thử gửi ở hầm Vincom hoặc đi bộ từ phía Parkson." }
      ]
    },
    {
      id: 3,
      type: 'action',
      title: "Lấy số & Nộp hồ sơ",
      desc: "Vào quầy số 5. Bấm nút 'Sao y'. Chờ gọi số.",
      lat: 10.7769, lng: 106.7009
    },
    {
      id: 4,
      type: 'finish',
      title: "Nhận kết quả",
      desc: "Kiểm tra dấu mộc đỏ và nhận lại bản gốc.",
      lat: 10.7769, lng: 106.7009
    }
  ]
};

// ==========================================
// 1. DATA MANAGEMENT
// ==========================================
let GLOBAL_GUIDE_DATA = []; // Nơi lưu trữ data từ guide.json

// Hàm chuẩn hóa dữ liệu từ guide.json thành format mà Controller hiểu
function _normalizeGuideData(guideItem) {
    if (!guideItem || !guideItem.guide || !guideItem.location) return null;

    const loc = guideItem.location;
    const rawGuide = guideItem.guide;
    
    // Lấy tọa độ gốc từ Location (vì trong steps đang bị null)
    const baseLat = parseFloat(loc.Lat);
    const baseLng = parseFloat(loc.Lng);

    return {
        title: rawGuide.title || `Hướng dẫn tại ${loc.Ten}`,
        steps: rawGuide.steps.map(step => ({
            ...step,
            // Nếu step không có tọa độ riêng, dùng tọa độ của địa điểm
            lat: step.lat ? parseFloat(step.lat) : baseLat,
            lng: step.lng ? parseFloat(step.lng) : baseLng,
            // Fallback nếu thiếu desc
            desc: step.desc || "Thực hiện theo hướng dẫn của cán bộ.",
        }))
    };
}

// ==========================================
// 2. CONTROLLER CLASS (Giữ nguyên logic cũ, chỉ sửa nhỏ)
// ==========================================
class SmartGuideController {
    constructor(scenario) {
        this.scenario = scenario;
        this.steps = scenario.steps;
        this.currentIndex = 0;
        this.selectors = { map: 'map', chat: 'chatMessages' };
        this._injectCelebrationStyles();
    }

    start(locationName) {
        this.currentIndex = 0;
        // Sử dụng title từ scenario nếu có
        const displayTitle = this.scenario.title || locationName;
        
        this._uiAppendMessage('bot', `🚀 Bắt đầu: **${displayTitle}**. Vui lòng nhìn bản đồ.`);
        this._toggleFullscreen(true);
        this._renderCurrentStep();
    }

    // ... (GIỮ NGUYÊN CÁC PHƯƠNG THỨC KHÁC: nextStep, performSuggestion, v.v...) ...
    
    nextStep(stepId) {
        this._uiDisableCard(stepId);
        this._uiAppendMessage('user', 'Đã xong bước này.');

        this._showThinking('Đang xử lý...', () => {
            this.currentIndex++;
            if (this.currentIndex >= this.steps.length) {
                this._finish();
            } else {
                this._renderCurrentStep();
            }
        });
    }

    performSuggestion(query) {
        this._uiAppendMessage('user', `Tìm giúp tôi: ${query}`);
        this._showThinking(`Đang tìm kiếm "${query}" quanh đây...`, () => {
             if (window.searchOnMap) { // Hỗ trợ gọi ngược lại map.js nếu có
                 window.searchOnMap(query);
             } else if (window.searchSuggestion) {
                 window.searchSuggestion(query);
             } else {
                 // Fallback UI
                 this._uiAppendMessage('bot', `📍 Đã tìm thấy các **${query}** gần nhất.`);
                 // Logic hiển thị marker ảo nằm ở MapGuideUI bên chat.js/logic.js
                 if(window.MapGuideUI && window.MapGuideUI.triggerSuggestion) {
                    window.MapGuideUI.triggerSuggestion(query);
                 }
             }
        });
    }

    toggleIssueForm(stepId, show) {
        const form = document.getElementById(`problem-form-${stepId}`);
        const actions = document.getElementById(`action-buttons-${stepId}`);
        const input = document.getElementById(`problem-input-${stepId}`);

        if (form && actions) {
            form.style.display = show ? 'block' : 'none';
            actions.style.display = show ? 'none' : 'flex';
            if (show && input) setTimeout(() => input.focus(), 100);
        }
    }

    submitIssue(stepId) {
        const inputEl = document.getElementById(`problem-input-${stepId}`);
        const userText = inputEl ? inputEl.value.trim() : "";
        if (!userText) return;

        const form = document.getElementById(`problem-form-${stepId}`);
        if(form) form.style.display = 'none';

        this._uiAppendMessage('user', `Sự cố: ${userText}`);

        this._showThinking('AI đang tìm giải pháp thay thế...', () => {
            const solutionData = this._calculateSolution(stepId, userText);
            this._applySolution(stepId, solutionData);
        });
    }

    // --- PRIVATE LOGIC ---

    _calculateSolution(stepId, userText) {
        const step = this.steps.find(s => s.id === stepId);
        const lowerInput = userText.toLowerCase();
        let result = {
            text: "Tôi hiểu vấn đề này. Hãy thử hỏi nhân viên bảo vệ hoặc bàn hướng dẫn gần đó.",
            newLat: null, newLng: null
        };
        if (step && step.troubles) {
            const matchedTrouble = step.troubles.find(t => t.keywords.some(k => lowerInput.includes(k)));
            if (matchedTrouble) result.text = matchedTrouble.solution;
        }
        // Logic fallback lat/lng nếu có trong JSON
        if (step && step.fallback_lat && (lowerInput.includes("xe") || lowerInput.includes("chỗ"))) {
            result.text = `Đừng lo! Tôi tìm thấy địa điểm thay thế **${step.fallback_desc || 'gần đây'}**.`;
            result.newLat = step.fallback_lat;
            result.newLng = step.fallback_lng;
        }
        return result;
    }

    _renderCurrentStep() {
        const step = this.steps[this.currentIndex];
        // Sửa lỗi index: nếu index vượt quá length thì finish
        if(this.currentIndex >= this.steps.length){
            this._finish();
            if(window.MapGuideUI) window.MapGuideUI.close();
            return;
        }

        if (window.MapGuideUI) {
            window.MapGuideUI.renderStep(step, this.steps.length, this.currentIndex, {
                onNext: () => { this.currentIndex++; this._renderCurrentStep(); },
                onUndo: () => { if (this.currentIndex > 0) { this.currentIndex--; this._renderCurrentStep(); } },
                onSuggestion: (query) => this.performSuggestion(query)
            });
        }
    }

    _applySolution(stepId, data) {
        const solBox = document.getElementById(`solution-box-${stepId}`);
        const solContent = document.getElementById(`solution-content-${stepId}`);
        if (solBox && solContent) {
            solBox.style.display = 'block';
            solContent.innerHTML = data.text;
        }
        if (data.newLat && data.newLng && window.updateMapForGuideStep) {
            window.updateMapForGuideStep(data.newLat, data.newLng, "Vị trí thay thế (AI)");
        }
        const actions = document.getElementById(`action-buttons-${stepId}`);
        if (actions) {
            actions.style.display = 'flex';
            const successBtn = actions.querySelector('.success');
            // Nếu chưa có nút success thì đổi text nút issue hoặc tạo mới (tùy UI)
            // Ở đây đơn giản là hiện lại action buttons
        }
    }

    _finish() {
        this._uiAppendMessage('bot', `
            <div style="text-align:center; padding: 10px;">
                <h2 style="color: #d97706; margin: 0;">🎉 XUẤT SẮC! 🎉</h2>
                <p>Bạn đã hoàn thành mọi thủ tục.</p>
            </div>
        `);
        this._triggerConfettiEffect();
        setTimeout(() => {
            if (window.MapGuideUI) window.MapGuideUI.close();
            this._toggleFullscreen(false);
            this._removeConfetti();
        }, 4000);
    }

    _injectCelebrationStyles() {
        const styleId = 'guide-celebration-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .confetti { position: fixed; width: 10px; height: 10px; z-index: 9999; pointer-events: none; animation: fall linear forwards; }
                @keyframes fall { to { transform: translateY(100vh) rotate(720deg); } }
                .ai-thinking { color: #666; font-style: italic; font-size: 0.9em; margin: 5px 0; }
            `;
            document.head.appendChild(style);
        }
    }

    _triggerConfettiEffect() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        const mapEl = document.getElementById(this.selectors.map); 
        if (!mapEl) return;
        
        for (let i = 0; i < 100; i++) {
            const el = document.createElement('div');
            el.className = 'confetti';
            el.style.left = Math.random() * 100 + 'vw';
            el.style.top = -10 + 'px';
            el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            el.style.width = (Math.random() * 10 + 5) + 'px';
            el.style.height = (Math.random() * 5 + 5) + 'px';
            el.style.animationDuration = (Math.random() * 2 + 2) + 's';
            el.style.animationDelay = (Math.random() * 2) + 's';
            mapEl.appendChild(el);
            setTimeout(() => el.remove(), 5000);
        }
    }

    _removeConfetti() {
        const confettis = document.querySelectorAll('.confetti');
        confettis.forEach(c => c.remove());
    }

    _showThinking(text, callback) {
        const chatContainer = document.getElementById(this.selectors.chat);
        if (!chatContainer) { if (callback) callback(); return; }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-thinking';
        loadingDiv.innerHTML = `<span class="ai-icon">✨</span> ${text}`;
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Giả lập delay suy nghĩ 1 chút cho tự nhiên
        setTimeout(() => {
            loadingDiv.remove();
            if (callback) callback();
        }, 800);
    }

    _uiAppendMessage(role, html) {
        if (window.appendMessageToUI) {
            window.appendMessageToUI(role, html);
        } else {
            // Fallback nếu không có hàm global
            console.log(`[${role}] ${html}`);
        }
    }

    _uiDisableCard(stepId) {
        const card = document.getElementById(`step-card-${stepId}`); // Nếu bạn có ID này trong DOM
        // MapGuideUI render lại toàn bộ card nên hàm này có thể không cần thiết lắm 
        // nhưng giữ lại để tương thích logic cũ
    }

    _toggleFullscreen(enable) {
        const mapEl = document.getElementById(this.selectors.map);
        if (!mapEl) return;
        // Sử dụng class fullscreen CSS thay vì API native để tránh xung đột UI
        if (enable) {
            mapEl.classList.add('fullscreen');
            // Gọi hàm xử lý UI trong logic.js nếu cần (ẩn sidebar, hiện logo map)
        } else {
            mapEl.classList.remove('fullscreen');
        }
        // Trigger resize map
        setTimeout(() => {
            if(window.invalidateMapSize) window.invalidateMapSize();
        }, 300);
    }
}

// ==========================================
// 3. INITIALIZATION & EXPORT
// ==========================================
let guideApp = null;

// Tải dữ liệu khi file js được load
// CHÚ Ý: Đường dẫn này phải đúng với nơi bạn phục vụ file guide.json
// Nếu bạn đang dùng Flask static, nó có thể là /static/mock_responses/guide.json hoặc /chat/static...
fetch("/chat/static/mock_responses/guide.json") 
  .then(res => res.json())
  .then(data => {
      console.log("Guide data loaded:", data);
      if (data.guides) {
          GLOBAL_GUIDE_DATA = data.guides;
      }
  })
  .catch(err => console.error("Load guide JSON failed:", err));


// Hàm Main được gọi từ chat.js
export function startGuideFlow(locationNameOrData) {
    let scenarioData = null;

    // Trường hợp 1: Truyền vào tên địa điểm (String) -> Tìm trong JSON đã load
    if (typeof locationNameOrData === 'string') {
        const found = GLOBAL_GUIDE_DATA.find(item => item.location && item.location.Ten === locationNameOrData);
        if (found) {
            scenarioData = _normalizeGuideData(found);
        } else {
            // Fallback: Nếu không tìm thấy, thử tìm gần đúng hoặc báo lỗi
            console.warn(`Không tìm thấy hướng dẫn cho: ${locationNameOrData}`);
            // Có thể dùng MOCK_SCENARIO ở đây nếu muốn test
            // scenarioData = MOCK_SCENARIO; 
        }
    } 
    // Trường hợp 2: Truyền vào Object dữ liệu trực tiếp (từ Backend API trả về)
    else if (typeof locationNameOrData === 'object') {
        // Nếu object đã đúng format scenario
        if (locationNameOrData.steps) {
            scenarioData = locationNameOrData;
        } 
        // Nếu object dạng {location, guide} như guide.json
        else if (locationNameOrData.location && locationNameOrData.guide) {
            scenarioData = _normalizeGuideData(locationNameOrData);
        }
    }

    if (scenarioData) {
        // Khởi tạo controller mới với dữ liệu vừa chuẩn hóa
        guideApp = new SmartGuideController(scenarioData);
        guideApp.start(locationNameOrData.title || scenarioData.title);
    } else {
        // Thông báo lỗi ra Chat UI
        if (window.appendMessageToUI) {
            window.appendMessageToUI('model', `Xin lỗi, tôi chưa có dữ liệu hướng dẫn chi tiết cho địa điểm này.`);
        }
    }
}

// Global Binding để HTML onclick gọi được
window.nextStep = (id) => guideApp && guideApp.nextStep(id);
window.submitIssue = (id) => guideApp && guideApp.submitIssue(id);
window.toggleIssueForm = (id, show) => guideApp && guideApp.toggleIssueForm(id, show);
// window.searchSuggestion đã được bind trong performSuggestion