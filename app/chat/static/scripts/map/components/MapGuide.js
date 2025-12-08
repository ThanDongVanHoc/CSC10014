import { state } from "../state.js";

let currentStepMarker = null; // Marker cho bước hướng dẫn hiện tại
let guideContainer = null; // Container HTML của khung hướng dẫn
let currentGuideMarker = null;
let suggestionMarkers = [];

// Hàm cập nhật bản đồ cho một bước hướng dẫn cụ thể
export function updateMapForGuideStep(lat, lng, title, zoomLevel = 18) {
  const { map } = state;
  if (!map) return;

  // Xóa marker bước cũ
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

  // Bay đến vị trí bước đó
  map.flyTo([lat, lng], zoomLevel, { animate: true, duration: 1.5 });
  currentStepMarker = L.marker([lat, lng], { icon: stepIcon }).addTo(map);
  currentStepMarker
    .bindPopup(
      `<div style="text-align:center;"><b style="color:#6f42c1">STEP: ${title}</b><br>📍 Vị trí này</div>`
    )
    .openPopup();
}

// Object quản lý UI Hướng dẫn
export const MapGuideUI = {
  // Khởi tạo container
  init: function () {
    if (document.querySelector(".map-guide-container")) return;
    guideContainer = document.createElement("div");
    guideContainer.className = "map-guide-container";
    document.getElementById("map").appendChild(guideContainer);
  },

  // Render HTML cho một bước
  renderStep: function (stepData, totalSteps, currentIndex, callbacks) {
    this.init();
    const icon =
      stepData.type === "move" ? "🛵" : stepData.type === "doc" ? "📄" : "📍";

    // HTML gợi ý thông minh
    let suggestionHtml = "";
    if (stepData.suggestion_query) {
      suggestionHtml = `<div class="smart-suggestion-btn" onclick="window.MapGuideUI.triggerSuggestion('${
        stepData.suggestion_query
      }')"><i class="fas fa-search-location"></i> ${
        stepData.suggestion_text || "Tìm địa điểm hỗ trợ gần đây"
      }</div>`;
    }

    // HTML chính của Card hướng dẫn
    guideContainer.innerHTML = `
          <div class="map-guide-card">
            <div class="guide-overlay-header"><span class="guide-progress-text">Hướng dẫn chi tiết</span><span class="guide-step-badge">${
              currentIndex + 1
            } / ${totalSteps}</span></div>
            <div class="guide-overlay-body">
              <div class="guide-step-title">${icon} ${stepData.title}</div>
              <div class="guide-step-desc">${stepData.desc}</div>
              ${suggestionHtml}
              <div id="step-extra-${stepData.id}" style="margin-top:10px"></div>
              
              <div id="problem-form-${
                stepData.id
              }" style="display:none; margin-top:10px;">
                <input id="problem-input-${
                  stepData.id
                }" class="guide-problem-input" placeholder="Mô tả sự cố (ví dụ: bãi xe hết chỗ)" />
                <div style="display:flex; gap:8px; margin-top:8px;">
                  <button class="btn-submit-issue" onclick="window.submitIssue(${
                    stepData.id
                  })">Gửi vấn đề</button>
                  <button class="btn-cancel-issue" onclick="window.toggleIssueForm(${
                    stepData.id
                  }, false)">Hủy</button>
                </div>
              </div>

              <div id="solution-box-${
                stepData.id
              }" class="ai-solution-box" style="display:none; margin-top:10px;">
                <div class="solution-title">Gợi ý từ AI</div>
                <div id="solution-content-${
                  stepData.id
                }" class="solution-content"></div>
              </div>

              <div id="action-buttons-${
                stepData.id
              }" class="guide-overlay-actions">
                ${
                  currentIndex > 0
                    ? `<button class="action-btn btn-undo" id="btn-guide-undo"><i class="fas fa-undo"></i></button>`
                    : ""
                }
                <button class="action-btn btn-issue" id="btn-guide-issue-${
                  stepData.id
                }"><i class="fas fa-exclamation-triangle"></i> Sự cố</button>
                <button class="action-btn btn-next" id="btn-guide-next-${
                  stepData.id
                }">${
      currentIndex === totalSteps - 1 ? "Hoàn tất" : "Tiếp theo"
    } <i class="fas fa-arrow-right"></i></button>
              </div>
            </div>
          </div>
        `;

    // Gắn sự kiện cho các nút trong HTML vừa render
    const btnNext = document.getElementById(`btn-guide-next-${stepData.id}`);
    if (btnNext)
      btnNext.onclick = () => {
        if (typeof callbacks.onNext === "function") callbacks.onNext();
      };
    const btnUndo = document.getElementById("btn-guide-undo");
    if (btnUndo)
      btnUndo.onclick = () => {
        if (typeof callbacks.onUndo === "function") callbacks.onUndo();
      };
    const issueBtn = document.getElementById(`btn-guide-issue-${stepData.id}`);
    if (issueBtn)
      issueBtn.onclick = () => {
        window.toggleIssueForm(stepData.id, true);
      };
    this.updateMapCamera(stepData);
  },

  // Cập nhật vị trí camera khi đổi bước
  updateMapCamera: function (step) {
    const { map } = state;
    if (!map) return;
    if (currentGuideMarker) map.removeLayer(currentGuideMarker);
    if (step.lat && step.lng) {
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

  // Xử lý gợi ý thông minh (Smart Suggestion)
  triggerSuggestion: function (query) {
    const { map } = state;
    suggestionMarkers.forEach((m) => map.removeLayer(m));
    suggestionMarkers = [];
    alert(`🤖 Đang tìm "${query}" gần vị trí của bạn...`);
    const center = map.getCenter();
    // Tạo data giả lập xung quanh vị trí hiện tại
    const nearby1 = [center.lat + 0.001, center.lng + 0.001];
    const nearby2 = [center.lat - 0.001, center.lng - 0.0005];
    [nearby1, nearby2].forEach((loc, i) => {
      const marker = L.marker(loc, {
        icon: new L.Icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      })
        .addTo(map)
        .bindPopup(`<b>${query} ${i + 1}</b><br>Cách bạn 150m`)
        .openPopup();
      suggestionMarkers.push(marker);
    });
    map.flyTo(center, 16);
  },

  // Hiển thị giải pháp khi gặp sự cố
  handleTrouble: function (solutionText) {
    try {
      document
        .querySelectorAll('[id^="solution-box-"]')
        .forEach((b) => (b.style.display = "block"));
      document
        .querySelectorAll('[id^="solution-content-"]')
        .forEach((c) => (c.innerHTML = solutionText));
    } catch (e) {
      console.warn(e);
    }
    try {
      alert("💡 AI Solution:\n" + solutionText);
    } catch (e) {}
  },

  // Dọn dẹp UI khi tắt hướng dẫn
  close: function () {
    const { map } = state;
    if (guideContainer) guideContainer.innerHTML = "";
    if (currentGuideMarker && map) map.removeLayer(currentGuideMarker);
    if (map) suggestionMarkers.forEach((m) => map.removeLayer(m));
  },
};
