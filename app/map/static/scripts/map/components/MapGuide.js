import { state } from "../state.js";
import { findPlace, pinLocationProK } from "../components/POIManager.js";
import { findPlaceAround, clearSuggestionMarkers } from "../services/search.js";

let currentStepMarker = null;
let guideContainer = null;
let currentGuideMarker = null;
let isMinimized = false;

// Hàm cập nhật bản đồ cho một bước hướng dẫn cụ thể
export function updateMapForGuideStep(lat, lng, title, zoomLevel = 18) {
  const { map } = state;
  if (!map) return;

  if (currentStepMarker) map.removeLayer(currentStepMarker);
  if (!lat || !lng) return;

  const stepIcon = new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  map.flyTo([lat, lng], zoomLevel, { animate: true, duration: 1.5 });
  currentStepMarker = L.marker([lat, lng], { icon: stepIcon }).addTo(map);
  currentStepMarker
    .bindPopup(
      `<div style="text-align:center;"><b style="color:#6f42c1">STEP: ${title}</b><br>📍 Location</div>`
    )
    .openPopup();
}

// Object quản lý UI Hướng dẫn
export const MapGuideUI = {
  init: function () {
    // 1. Tạo Container chính (Nếu chưa có)
    if (!document.querySelector(".map-guide-container")) {
      guideContainer = document.createElement("div");
      guideContainer.className = "map-guide-container";
      document.getElementById("map").appendChild(guideContainer);

      // 🚫 Chặn mọi tương tác UI lan xuống map
      L.DomEvent.disableClickPropagation(guideContainer);
      L.DomEvent.disableScrollPropagation(guideContainer);

      // 🔥 BẮT BUỘC – chặn sự kiện map
      const events = [
        "mousedown",
        "touchstart",
        "dblclick",
        "pointerdown",
        "wheel",
        "contextmenu",
      ];
      events.forEach((evt) =>
        L.DomEvent.on(guideContainer, evt, L.DomEvent.stopPropagation)
      );
    }

    // 2. Tạo HTML Modal Preview (Gmail Style) - Chỉ tạo 1 lần
    if (!document.getElementById("pdf-gmail-modal")) {
      const modalHtml = `
            <div id="pdf-gmail-modal" class="gmail-modal-overlay">
                <div class="gmail-modal-header">
                    <div class="gmail-doc-title" id="pdf-modal-title">Document</div>
                    <button class="btn-close-modal" onclick="window.MapGuideUI.closePdfPreview()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
                <div class="gmail-modal-content">
                    <iframe id="pdf-preview-frame" class="pdf-frame" src=""></iframe>
                </div>
            </div>
        `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
    }

    // CSS phụ trợ (Loading spinner & Controls)
    if (!document.getElementById("guide-extra-style")) {
      const style = document.createElement("style");
      style.id = "guide-extra-style";
      style.innerHTML = `
          .guide-window-controls { display: flex; gap: 5px; }
          .win-btn { border: none; background: transparent; color: white; cursor: pointer; font-size: 14px; padding: 0 5px; }
          .win-btn:hover { color: #ddd; }
          .map-guide-card.minimized .guide-overlay-body { display: none; }
          .map-guide-card.minimized { width: auto; min-width: 200px; }
          
          /* Loading indicator */
          .smart-suggestion-btn.loading { opacity: 0.6; pointer-events: none; }
          .smart-suggestion-btn.loading::after {
            content: ''; display: inline-block; width: 12px; height: 12px;
            border: 2px solid #00AEEF; border-top-color: transparent;
            border-radius: 50%; margin-left: 8px;
            animation: spin 0.6s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `;
      document.head.appendChild(style);
    }
  },

  renderStep: function (
    locName,
    stepData,
    totalSteps,
    currentIndex,
    callbacks
  ) {
    this.init();
    isMinimized = false;
    const icon =
      stepData.type === "move" ? "🛵" : stepData.type === "doc" ? "📄" : "📍";

    // 1. HTML Gợi ý thông minh
    let suggestionHtml = "";
    if (stepData.suggestion_query) {
      suggestionHtml = `
        <div class="smart-suggestion-btn" id="suggestion-btn-${stepData.id}" 
             onclick="window.MapGuideUI.triggerSuggestion('${stepData.suggestion_query
        }', ${stepData.id})">
            <i class="fas fa-search-location"></i> ${stepData.suggestion_text || "Find nearby places"
        }
        </div>`;
    }

    // 2. HTML Nút Download (PDF/DOCX)
    let actionButtonsHtml = "";
    if (stepData.forms_data) {
      const { pdf_url, docx_url, title } = stepData.forms_data;
      actionButtonsHtml = `
            <div class="form-actions-container">
                <button 
                    onclick="window.MapGuideUI.openPdfPreview('${pdf_url}', '${title}')"
                    class="btn-doc-action btn-pdf-preview" 
                    title="Preview file PDF">
                    <i class="fas fa-eye"></i> Preview PDF
                </button>

                <a 
                    href="${docx_url}" 
                    download
                    class="btn-doc-action btn-docx-download" 
                    title="Download file DOCX">
                    <i class="fas fa-file-download"></i> Download DOCX
                </a>
            </div>
        `;
    }

    // 3. Render HTML chính
    guideContainer.innerHTML = `
      <div class="map-guide-card" id="guide-main-card">
        <div class="guide-overlay-header">
            <div style="flex-grow:1">
                <span class="guide-progress-text">Detailed Instruction</span>
                <span class="guide-step-badge">${currentIndex + 1
      } / ${totalSteps}</span>
            </div>
            <div class="guide-window-controls">
                <button class="win-btn" id="btn-guide-min" title="Minimize"><i class="fas fa-minus"></i></button>
                <button class="win-btn" id="btn-guide-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
        </div>

        <div class="guide-overlay-body" id="guide-body">
          <div class="guide-step-title">${icon} ${stepData.title}</div>
          <div class="guide-step-desc">${stepData.desc}</div>
          
          ${suggestionHtml}

          ${actionButtonsHtml}
          
          <div id="suggestion-result-${stepData.id
      }" class="suggestion-result" style="display:none; margin-top:10px;">
            <i class="fas fa-check-circle"></i> <span id="suggestion-text-${stepData.id
      }"></span>
          </div>
          
          <div id="problem-form-${stepData.id
      }" style="display:none; margin-top:10px;">
            <textarea
              id="problem-input-${stepData.id}"
              class="guide-problem-input"
              rows="3"
              placeholder="Describe the issue (e.g., parking lot full)"
            ></textarea>

            <div style="display:flex; gap:8px; margin-top:8px;">
              <button class="btn-submit-issue" onclick="window.submitIssue(${stepData.id
      })">Gửi vấn đề</button>
              <button class="btn-cancel-issue" onclick="window.toggleIssueForm(${stepData.id
      }, false)">Hủy</button>
            </div>
          </div>

          <div id="solution-box-${stepData.id
      }" class="ai-solution-box" style="display:none; margin-top:10px;">
            <div class="solution-title"><i class="fas fa-robot"></i> AI Suggestions</div>
            <div id="solution-content-${stepData.id
      }" class="solution-content"></div>
          </div>

          <div id="action-buttons-${stepData.id}" class="guide-overlay-actions">
            ${currentIndex > 0
        ? `<button class="action-btn btn-undo" id="btn-guide-undo"><i class="fas fa-undo"></i></button>`
        : ""
      }
            <button class="action-btn btn-issue" id="btn-guide-issue-${stepData.id
      }"><i class="fas fa-exclamation-triangle"></i> Issue</button>
            <button class="action-btn btn-next" id="btn-guide-next-${stepData.id
      }">
                ${currentIndex === totalSteps - 1 ? "Finish" : "Next"
      } <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Event Bindings
    const btnNext = document.getElementById(`btn-guide-next-${stepData.id}`);
    if (btnNext) {
      stopMapEvent(btnNext);
      btnNext.onclick = () => callbacks.onNext?.();
    }

    const btnUndo = document.getElementById("btn-guide-undo");
    if (btnUndo) {
      stopMapEvent(btnUndo);
      btnUndo.onclick = () => callbacks.onUndo?.();
    }

    const btnIssue = document.getElementById(`btn-guide-issue-${stepData.id}`);
    if (btnIssue) {
      stopMapEvent(btnIssue);
      btnIssue.onclick = () => {
        this.toggleIssueForm(stepData.id, true);
      };
    }

    const input = document.getElementById(`problem-input-${stepData.id}`);
    if (input) {
      stopMapEvent(input);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          window.submitIssue(stepData.id);
        }
      });
    }

    document.getElementById("btn-guide-min").onclick = () =>
      this.toggleMinimize();
    document.getElementById("btn-guide-close").onclick = () => {
      this.close();
      if (callbacks.onClose) callbacks.onClose();
    };

    this.updateMapCamera(stepData, locName);
  },

  // --- MODAL FUNCTIONS ---
  openPdfPreview: function (url, title) {
    const modal = document.getElementById("pdf-gmail-modal");
    const iframe = document.getElementById("pdf-preview-frame");
    const titleEl = document.getElementById("pdf-modal-title");

    if (modal && iframe) {
      iframe.src = url;
      if (titleEl) titleEl.textContent = title || "Preview Document";
      modal.style.display = "flex";
    }
  },

  closePdfPreview: function () {
    const modal = document.getElementById("pdf-gmail-modal");
    const iframe = document.getElementById("pdf-preview-frame");
    if (modal) {
      modal.style.display = "none";
      if (iframe) iframe.src = "about:blank";
    }
  },

  updateMapCamera: async function (step, locName) {
    const { map } = state;
    if (!map) return;
    if (currentGuideMarker) map.removeLayer(currentGuideMarker);

    const currentPlace = await findPlace(locName);

    if (currentPlace) {
      map.flyTo([currentPlace.lat, currentPlace.lng], 17, { duration: 1.5 });
      currentGuideMarker = pinLocationProK(currentPlace);
      if (currentGuideMarker) currentGuideMarker.fire("click");
    } else if (step.lat && step.lng) {
      map.flyTo([step.lat, step.lng], 17, { duration: 1.5 });
      currentGuideMarker = L.marker([step.lat, step.lng], {
        icon: new L.Icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      }).addTo(map);
    }
  },

  triggerSuggestion: async function (query, stepId) {
    const { map } = state;
    if (!map) return;

    const btn = document.getElementById(`suggestion-btn-${stepId}`);
    const resultDiv = document.getElementById(`suggestion-result-${stepId}`);
    const resultText = document.getElementById(`suggestion-text-${stepId}`);

    if (btn) {
      btn.classList.add("loading");
      btn.style.pointerEvents = "none";
    }

    clearSuggestionMarkers();
    const center = map.getCenter();
    const searchRadius = 2000;

    try {
      const result = await findPlaceAround(
        center.lat,
        center.lng,
        searchRadius,
        query
      );

      if (result.success && result.count > 0) {
        if (resultDiv && resultText) {
          resultText.textContent =
            result.message || `Found ${result.count} ${query}`;
          resultDiv.style.display = "block";
          setTimeout(() => {
            if (resultDiv) resultDiv.style.display = "none";
          }, 5000);
        }
      } else {
        if (resultDiv && resultText) {
          resultDiv.style.background = "#fff7ed";
          resultDiv.style.borderColor = "#fb923c";
          resultText.innerHTML = `<i class="fas fa-info-circle" style="color:#ea580c"></i> ${result.message || "No suitable places found"
            }`;
          resultDiv.style.display = "block";
          setTimeout(() => {
            if (resultDiv) {
              resultDiv.style.display = "none";
              resultDiv.style.background = "#f0fdf4";
              resultDiv.style.borderColor = "#86efac";
            }
          }, 5000);
        }
      }
    } catch (error) {
      console.error("Error during search:", error);
      if (resultDiv && resultText) {
        resultDiv.style.background = "#fef2f2";
        resultDiv.style.borderColor = "#fca5a5";
        resultText.innerHTML =
          '<i class="fas fa-exclamation-triangle" style="color:#dc2626"></i> An error occurred during the search';
        resultDiv.style.display = "block";
        setTimeout(() => {
          if (resultDiv) {
            resultDiv.style.display = "none";
            resultDiv.style.background = "#f0fdf4";
            resultDiv.style.borderColor = "#86efac";
          }
        }, 5000);
      }
    } finally {
      if (btn) {
        btn.classList.remove("loading");
        btn.style.pointerEvents = "";
      }
    }
  },

  toggleMinimize: function () {
    const card = document.getElementById("guide-main-card");
    const btn = document.getElementById("btn-guide-min");
    if (card && btn) {
      isMinimized = !isMinimized;
      if (isMinimized) {
        card.classList.add("minimized");
        btn.innerHTML = '<i class="fas fa-plus"></i>';
        btn.title = "Mở rộng";
      } else {
        card.classList.remove("minimized");
        btn.innerHTML = '<i class="fas fa-minus"></i>';
        btn.title = "Thu nhỏ";
      }
    }
  },

  toggleIssueForm: function (stepId, show) {
    const form = document.getElementById(`problem-form-${stepId}`);
    const actions = document.getElementById(`action-buttons-${stepId}`);
    const input = document.getElementById(`problem-input-${stepId}`);
    if (form && actions) {
      form.style.display = show ? "block" : "none";
      actions.style.display = show ? "none" : "flex";
      if (show && input) setTimeout(() => input.focus(), 100);
    }
  },

  displaySolution: function (stepId, solutionText) {
    const box = document.getElementById(`solution-box-${stepId}`);
    const content = document.getElementById(`solution-content-${stepId}`);
    const actions = document.getElementById(`action-buttons-${stepId}`);
    if (box && content) {
      box.style.display = "block";
      content.innerHTML = solutionText;
    }
    if (actions) actions.style.display = "flex";
  },

  close: function () {
    const { map } = state;
    if (guideContainer) guideContainer.innerHTML = "";
    if (currentGuideMarker && map) map.removeLayer(currentGuideMarker);
    if (currentStepMarker && map) map.removeLayer(currentStepMarker);
    clearSuggestionMarkers();
    this.closePdfPreview();
  },
};

function stopMapEvent(el) {
  if (!el) return;
  ["mousedown", "touchstart", "pointerdown", "dblclick", "click"].forEach(
    (evt) => {
      el.addEventListener(evt, (e) => {
        e.stopPropagation();
      });
    }
  );
}
