import { handleScreenEvent } from "../map/components/Overlay.js";

// ==========================================
// 2. CONTROLLER CLASS (Giữ nguyên logic cũ, chỉ sửa nhỏ)
// ==========================================
export class SmartGuideController {
  constructor(scenario) {
    this.locName = null;
    this.scenario = scenario;
    this.steps = scenario.steps;
    this.currentIndex = 0;
    this.selectors = { map: "map", chat: "chatMessages" };
    this._injectCelebrationStyles();
  }

  start(locationName) {
    this.currentIndex = 0;
    // Sử dụng title từ scenario nếu có
    const displayTitle = this.scenario.title || locationName;

    this._uiAppendMessage(
      "bot",
      `🚀 Bắt đầu: ${displayTitle}. Vui lòng nhìn bản đồ.`
    );
    this._toggleFullscreen(true);
    this._renderCurrentStep();
  }

  nextStep(stepId) {
    this._uiDisableCard(stepId);
    this._uiAppendMessage("user", "Đã xong bước này.");

    this._showThinking("Đang xử lý...", () => {
      this.currentIndex++;
      if (this.currentIndex >= this.steps.length) {
        this._finish();
      } else {
        this._renderCurrentStep();
      }
    });
  }

  performSuggestion(query) {
    this._uiAppendMessage("user", `Tìm giúp tôi: ${query}`);
    this._showThinking(`Đang tìm kiếm "${query}" quanh đây...`, () => {
      if (window.searchOnMap) {
        // Hỗ trợ gọi ngược lại map.js nếu có
        window.searchOnMap(query);
      } else if (window.searchSuggestion) {
        window.searchSuggestion(query);
      } else {
        // Fallback UI
        this._uiAppendMessage(
          "bot",
          `📍 Đã tìm thấy các **${query}** gần nhất.`
        );
        // Logic hiển thị marker ảo nằm ở MapGuideUI bên chat.js/logic.js
        if (window.MapGuideUI && window.MapGuideUI.triggerSuggestion) {
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
      form.style.display = show ? "block" : "none";
      actions.style.display = show ? "none" : "flex";
      if (show && input) setTimeout(() => input.focus(), 100);
    }
  }

  submitIssue(stepId) {
    const inputEl = document.getElementById(`problem-input-${stepId}`);
    const userText = inputEl ? inputEl.value.trim() : "";
    if (!userText) return;

    const form = document.getElementById(`problem-form-${stepId}`);
    if (form) form.style.display = "none";

    this._uiAppendMessage("user", `Sự cố: ${userText}`);

    this._showThinking("AI đang tìm giải pháp thay thế...", () => {
      const solutionData = this._calculateSolution(stepId, userText);
      this._applySolution(stepId, solutionData);
    });
  }

  // --- PRIVATE LOGIC ---
  _set(locName) {
    this.locName = locName;
  }

  _calculateSolution(stepId, userText) {
    const step = this.steps.find((s) => s.id === stepId);
    const lowerInput = userText.toLowerCase();
    let result = {
      text: "Tôi hiểu vấn đề này. Hãy thử hỏi nhân viên bảo vệ hoặc bàn hướng dẫn gần đó.",
      newLat: null,
      newLng: null,
    };
    if (step && step.troubles) {
      const matchedTrouble = step.troubles.find((t) =>
        t.keywords.some((k) => lowerInput.includes(k))
      );
      if (matchedTrouble) result.text = matchedTrouble.solution;
    }
    // Logic fallback lat/lng nếu có trong JSON
    if (
      step &&
      step.fallback_lat &&
      (lowerInput.includes("xe") || lowerInput.includes("chỗ"))
    ) {
      result.text = `Đừng lo! Tôi tìm thấy địa điểm thay thế ${
        step.fallback_desc || "gần đây"
      }.`;
      result.newLat = step.fallback_lat;
      result.newLng = step.fallback_lng;
    }
    return result;
  }

  _renderCurrentStep() {
    const step = this.steps[this.currentIndex];
    if (this.currentIndex >= this.steps.length) {
      this._finish();
      if (window.MapGuideUI) window.MapGuideUI.close();
      return;
    }

    if (window.MapGuideUI) {
      window.MapGuideUI.renderStep(
        this.locName,
        step,
        this.steps.length,
        this.currentIndex,
        {
          onNext: () => {
            this.currentIndex++;
            this._renderCurrentStep();
          },
          onUndo: () => {
            if (this.currentIndex > 0) {
              this.currentIndex--;
              this._renderCurrentStep();
            }
          },
          onSuggestion: (query) => this.performSuggestion(query),
        }
      );
    }
  }

  _applySolution(stepId, data) {
    const solBox = document.getElementById(`solution-box-${stepId}`);
    const solContent = document.getElementById(`solution-content-${stepId}`);
    if (solBox && solContent) {
      solBox.style.display = "block";
      solContent.innerHTML = data.text;
    }
    if (data.newLat && data.newLng && window.updateMapForGuideStep) {
      window.updateMapForGuideStep(
        data.newLat,
        data.newLng,
        "Vị trí thay thế (AI)"
      );
    }
    const actions = document.getElementById(`action-buttons-${stepId}`);
    if (actions) {
      actions.style.display = "flex";
      const successBtn = actions.querySelector(".success");
      // Nếu chưa có nút success thì đổi text nút issue hoặc tạo mới (tùy UI)
      // Ở đây đơn giản là hiện lại action buttons
    }
  }

  _finish() {
    this._uiAppendMessage(
      "bot",
      `
            <div style="text-align:center; padding: 10px;">
                <h2 style="color: #d97706; margin: 0;">🎉 XUẤT SẮC! 🎉</h2>
                <p>Bạn đã hoàn thành mọi thủ tục.</p>
            </div>
        `
    );
    this._triggerConfettiEffect();
    setTimeout(() => {
      if (window.MapGuideUI) window.MapGuideUI.close();
      this._toggleFullscreen(false);
      this._removeConfetti();
    }, 4000);
  }

  _injectCelebrationStyles() {
    const styleId = "guide-celebration-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
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
    const colors = [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#ffff00",
      "#ff00ff",
      "#00ffff",
    ];
    const mapEl = document.getElementById(this.selectors.map);
    if (!mapEl) return;

    for (let i = 0; i < 100; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.left = Math.random() * 100 + "vw";
      el.style.top = -10 + "px";
      el.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
      el.style.width = Math.random() * 10 + 5 + "px";
      el.style.height = Math.random() * 5 + 5 + "px";
      el.style.animationDuration = Math.random() * 2 + 2 + "s";
      el.style.animationDelay = Math.random() * 2 + "s";
      mapEl.appendChild(el);
      setTimeout(() => el.remove(), 5000);
    }
  }

  _removeConfetti() {
    const confettis = document.querySelectorAll(".confetti");
    confettis.forEach((c) => c.remove());
  }

  _showThinking(text, callback) {
    const chatContainer = document.getElementById(this.selectors.chat);
    if (!chatContainer) {
      if (callback) callback();
      return;
    }

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "ai-thinking";
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
    if (enable) handleScreenEvent();
  }
}
