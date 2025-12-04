/**
 * guide_manager.js
 * FINAL VERSION: With CELEBRATION EFFECT 🎉
 */

// ==========================================
// 1. DATA
// ==========================================
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
// 2. CONTROLLER CLASS
// ==========================================
class SmartGuideController {
    constructor(scenario) {
        this.scenario = scenario;
        this.steps = scenario.steps;
        this.currentIndex = 0;
        this.selectors = { map: 'map', chat: 'chatMessages' };
        
        // Inject CSS cho hiệu ứng pháo hoa ngay khi khởi tạo
        this._injectCelebrationStyles();
    }

    // --- PUBLIC METHODS ---

    start(locationName) {
        this.currentIndex = 0;
        this._uiAppendMessage('bot', `🚀 Bắt đầu chế độ dẫn đường đến **${locationName}**. Vui lòng nhìn bản đồ.`);
        this._toggleFullscreen(true);
        this._renderCurrentStep();
    }

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
             if (window.searchOnMap) {
                 window.searchOnMap(query);
             } else {
                 this._uiAppendMessage('bot', `📍 Tôi đã đánh dấu các **${query}** gần nhất trên bản đồ.`);
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
        if (step && step.fallback_lat && (lowerInput.includes("xe") || lowerInput.includes("chỗ"))) {
            result.text = `Đừng lo! Có vẻ bãi xe hiện tại đã đầy. Tôi tìm thấy **${step.fallback_desc}** cách đó 100m.`;
            result.newLat = step.fallback_lat;
            result.newLng = step.fallback_lng;
        }
        return result;
    }

    // --- PRIVATE UI METHODS ---

    _renderCurrentStep() {
        const step = this.steps[this.currentIndex];
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
            if (successBtn) {
                successBtn.innerText = "👍 Đã giải quyết & Tiếp tục";
                successBtn.style.background = "#e6fffa";
                successBtn.style.color = "#047857";
            }
        }
    }

    // --- 🎉 PHẦN ĂN MỪNG MỚI 🎉 ---

    _finish() {
        this._uiAppendMessage('bot', `
            <div style="text-align:center; padding: 10px;">
                <h2 style="color: #d97706; margin: 0;">🎉 XUẤT SẮC! 🎉</h2>
                <p>Bạn đã hoàn thành mọi thủ tục.</p>
            </div>
        `);

        // 2. Bắn pháo hoa giấy (Confetti)
        this._triggerConfettiEffect();

        // 3. Đợi 4 giây rồi mới đóng Fullscreen (để user ngắm pháo hoa)
        setTimeout(() => {
            alert("Chúc mừng! Bạn đã hoàn thành nhiệm vụ."); // Fallback cuối cùng
            if (window.MapGuideUI) window.MapGuideUI.close();
            this._toggleFullscreen(false);
            this._removeConfetti(); // Dọn dẹp DOM
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
            `;
            document.head.appendChild(style);
        }
    }

    _triggerConfettiEffect() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        const container = document.body;
        
        // Tạo 100 mảnh giấy màu
        for (let i = 0; i < 100; i++) {
            const el = document.createElement('div');
            el.className = 'confetti';
            el.style.left = Math.random() * 100 + 'vw';
            el.style.top = -10 + 'px';
            el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            // Random kích thước, tốc độ và delay
            el.style.width = (Math.random() * 10 + 5) + 'px';
            el.style.height = (Math.random() * 5 + 5) + 'px';
            el.style.animationDuration = (Math.random() * 2 + 2) + 's';
            el.style.animationDelay = (Math.random() * 2) + 's';
            
            container.appendChild(el);
            
            // Tự xóa sau khi rơi xong
            setTimeout(() => el.remove(), 5000);
        }
    }

    _removeConfetti() {
        const confettis = document.querySelectorAll('.confetti');
        confettis.forEach(c => c.remove());
    }

    // --- HELPER UI ---

    _showThinking(text, callback) {
        const chatContainer = document.getElementById(this.selectors.chat);
        if (!chatContainer) { if (callback) callback(); return; }
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-thinking';
        loadingDiv.innerHTML = `<span class="ai-icon">✨</span> ${text}`;
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        setTimeout(() => { loadingDiv.remove(); if (callback) callback(); }, 1000); // Nhanh hơn chút
    }

    _uiAppendMessage(role, html) {
        if (window.appendMessageToUI) {
            window.appendMessageToUI(role, html);
        } else {
            const chatContainer = document.getElementById(this.selectors.chat);
            if(chatContainer) {
                const div = document.createElement('div');
                div.className = `msg ${role}`;
                div.innerHTML = html;
                chatContainer.appendChild(div);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
    }

    _uiDisableCard(stepId) {
        const card = document.getElementById(`step-card-${stepId}`);
        if (card) {
            card.style.opacity = '0.6';
            card.style.pointerEvents = 'none';
        }
    }

    _toggleFullscreen(enable) {
        const mapEl = document.getElementById(this.selectors.map);
        if (!mapEl) return;
        if (enable && !document.fullscreenElement && mapEl.requestFullscreen) {
            mapEl.requestFullscreen().catch(err => console.log(err));
            mapEl.classList.add('fullscreen');
        } else if (!enable && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
            mapEl.classList.remove('fullscreen');
        }
    }
}

// ==========================================
// 3. INIT & EXPORT
// ==========================================
const guideApp = new SmartGuideController(MOCK_SCENARIO);

export function startGuideFlow(locationName) {
    guideApp.start(locationName);
}

// Global Binding
window.nextStep = (id) => guideApp.nextStep(id);
window.submitIssue = (id) => guideApp.submitIssue(id);
window.toggleIssueForm = (id, show) => guideApp.toggleIssueForm(id, show);
window.searchSuggestion = (query) => guideApp.performSuggestion(query);