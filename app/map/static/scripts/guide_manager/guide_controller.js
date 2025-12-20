import { handleScreenEvent } from "../map/components/Overlay.js";
import { clearSuggestionMarkers } from "../map/services/search.js";
import { poiSidebarUI } from "../map/components/POISidebar.js";

// ==========================================
// 2. CONTROLLER CLASS (Keep old logic, minor fixes only)
// ==========================================
export class SmartGuideController {
  constructor(scenario) {
    this.locName = null;
    this.scenario = scenario;
    this.steps = scenario.steps;
    this.currentIndex = 0;
    this.selectors = { map: "map", chat: "chatMessages" };
    this.wasFullscreenBeforeGuide = false;
    this._injectCelebrationStyles();
  }

  start(locationName) {
    clearSuggestionMarkers();
    if (window.MapGuideUI) {
      window.MapGuideUI.close();
    }

    this.currentIndex = 0;
    // Use title from scenario if available
    const displayTitle = this.scenario.title || locationName;

    this._uiAppendMessage(
      "bot",
      `🚀 Starting: ${displayTitle}. Please look at the map.`
    );
    const mapEl = document.getElementById(this.selectors.map);
    this.wasFullscreenBeforeGuide =
      mapEl && mapEl.classList.contains("fullscreen");
    this._toggleFullscreen(true);
    this._renderCurrentStep();
  }

  nextStep(stepId) {
    this._uiDisableCard(stepId);
    this._uiAppendMessage("user", "Step completed.");

    this._showThinking("Processing...", () => {
      this.currentIndex++;
      if (this.currentIndex >= this.steps.length) {
        this._finish();
      } else {
        this._renderCurrentStep();
      }
    });
  }

  async performSuggestion(query) {
    this._uiAppendMessage("user", `Find for me: ${query}`);

    const { map } = state;
    if (!map) {
      this._uiAppendMessage("bot", "❌ Cannot access the map");
      return;
    }

    this._showThinking(`Searching for "${query}" nearby...`, async () => {
      try {
        // Clear old suggestion markers
        clearSuggestionMarkers();

        // Get current map position
        const center = map.getCenter();
        const searchRadius = 2000; // 2km

        // Call actual search function with Overpass API
        const result = await findPlaceAround(
          center.lat,
          center.lng,
          searchRadius,
          query
        );

        // Display results
        if (result.success && result.count > 0) {
          this._uiAppendMessage(
            "bot",
            `✅ ${result.message}. Yellow markers have been marked on the map.`
          );
        } else {
          this._uiAppendMessage(
            "bot",
            `⚠️ ${
              result.message || "No suitable location found"
            }. You can try expanding the search radius or searching for a different type of location.`
          );
        }
      } catch (error) {
        console.error("Search error:", error);
        this._uiAppendMessage(
          "bot",
          "❌ An error occurred during the search. Please try again later."
        );
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

    this._uiAppendMessage("user", `Issue: ${userText}`);

    this._showThinking(
      "AI is looking for an alternative solution...",
      async () => {
        const solutionData = await this._calculateSolution(stepId, userText);
        this._applySolution(stepId, solutionData);
      }
    );
  }

  // --- PRIVATE LOGIC ---
  _set(locName) {
    this.locName = locName;
  }

  async _calculateSolution(stepId, userText) {
    const lowerInput = userText.toLowerCase();

    let result = {
      text: "I understand this issue. Please try asking a security guard or the information desk nearby.",
      newLat: null,
      newLng: null,
    };

    const step = this.steps.find((s) => s.id === stepId);
    if (step) {
      if (step.troubles) {
        const matchedTrouble = step.troubles.find((t) =>
          t.keywords.some((k) => lowerInput.includes(k))
        );
        if (matchedTrouble) result.text = matchedTrouble.solution;
      }

      if (
        step.fallback_lat &&
        // Updated keywords to English to match user input language
        (lowerInput.includes("vehicle") ||
          lowerInput.includes("place") ||
          lowerInput.includes("parking"))
      ) {
        result.text = `Don't worry! I found an alternative location ${
          step.fallback_desc || "nearby"
        }.`;
        result.newLat = step.fallback_lat;
        result.newLng = step.fallback_lng;
      }
    }

    try {
      let things_have_done = [];
      for (const step of this.steps) {
        if (step.id < stepId) {
          things_have_done.push({
            id: step.id,
            title: step.title,
          });
        }
      }

      const response = await fetch("/chat/chat_issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          done: things_have_done,
          step_stuck: this.steps[stepId].title,
          issue: userText,
          title: this.scenario.title,
        }),
      });

      const apiData = await response.json();

      if (apiData && apiData.text) {
        result = {
          text: apiData.text,
          newLat: apiData.newLat || result.newLat,
          newLng: apiData.newLng || result.newLng,
        };
      }
    } catch (error) {
      console.error("Error calling API /chat/chat_issue:", error);
    }

    return result;
  }

  _renderCurrentStep() {
    const step = this.steps[this.currentIndex];

    // Fix index error: if index exceeds length then finish
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
          onClose: () => {
            this._toggleFullscreen(false);
            clearSuggestionMarkers();
          },
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
        "Alternative location (AI)"
      );
    }
    const actions = document.getElementById(`action-buttons-${stepId}`);
    if (actions) {
      actions.style.display = "flex";
    }
  }

  _finish() {
    this._uiAppendMessage(
      "bot",
      `
            <div style="text-align:center; padding: 10px;">
                <h2 style="color: #d97706; margin: 0;">🎉 EXCELLENT! 🎉</h2>
                <p>You have completed all procedures.</p>
            </div>
        `
    );
    this._triggerConfettiEffect();

    // Clear suggestion markers on finish
    clearSuggestionMarkers();
    poiSidebarUI.close();
    if (window.MapGuideUI) window.MapGuideUI.close();

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
                .confetti { 
                    position: fixed; 
                    width: 10px; 
                    height: 10px; 
                    z-index: 9999; 
                    pointer-events: none; 
                    animation: fall linear forwards; 
                }
                @keyframes fall { 
                    to { 
                        transform: translateY(100vh) rotate(720deg); 
                    } 
                }
                .ai-thinking { 
                    color: #666; 
                    font-style: italic; 
                    font-size: 0.9em; 
                    margin: 5px 0; 
                }
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

    // Simulate thinking delay slightly for natural feel
    setTimeout(() => {
      loadingDiv.remove();
      if (callback) callback();
    }, 800);
  }

  _uiAppendMessage(role, html) {
    if (window.appendMessageToUI) {
      window.appendMessageToUI(role, html);
    } else {
      // Fallback if no global function
      console.log(`[${role}] ${html}`);
    }
  }

  _uiDisableCard(stepId) {
    const card = document.getElementById(`step-card-${stepId}`);
    // MapGuideUI re-renders the whole card so this function might not be very necessary
    // but kept for compatibility with old logic
  }

  _toggleFullscreen(enable) {
    const mapEl = document.getElementById(this.selectors.map);
    const mapChatOverlay = document.getElementById("mapChatOverlay");
    const mapLogo = document.getElementById("mapLogo");

    const isFullscreen = mapEl && mapEl.classList.contains("fullscreen");

    if (enable) {
      if (!isFullscreen) {
        handleScreenEvent();
      } else {
        if (mapLogo) {
          mapLogo.style.left = "16px";
          mapLogo.style.bottom = "22px";
          mapLogo.style.top = "auto";
          mapLogo.style.transform = "";
        }
        if (mapChatOverlay) {
          mapChatOverlay.classList.add("hidden");
          mapChatOverlay.classList.remove("pinned");
        }
      }
    } else {
      if (this.wasFullscreenBeforeGuide) {
        if (mapLogo) mapLogo.style.display = "block";
      } else {
        if (isFullscreen) {
          handleScreenEvent();
        }
      }
    }
  }
}
