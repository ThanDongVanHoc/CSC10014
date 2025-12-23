import { State, DOM } from "../services/core.js";
import { DataManager } from "../services/data.js";

// [MAP LOGIC] - Import Map & Guide (Đã comment)
/*
import { findPlace } from "../../../../../map/static/scripts/map/components/POIManager.js"
import { startGuideFlow } from "../../../../../map/static/scripts/guide_manager/guide_manager.js"
*/

// Helper
export function hideSearchWrapper() {
  if (DOM.searchWrapper) DOM.searchWrapper.style.display = "none";
  if (DOM.searchInput) DOM.searchInput.value = "";
}

// Render Welcome Screen
export function renderEmptyState() {
  DOM.chatMessages.innerHTML = "";
  const container = document.createElement("div");
  container.className = "empty-state";
  container.innerHTML = `
      <div class="empty-header">
          <span class="ai-icon">✨</span>
          <h2>Hello there</h2>
      </div>
      <p>Start a conversation or create a new patient form</p>
      <button class="empty-state-form-btn" id="emptyStateFormBtn">
          <i class="fas fa-file-medical"></i>
          <span>Create New Patient Form</span>
      </button>
  `;
  DOM.chatMessages.appendChild(container);

  // Add click handler for empty state button
  const emptyBtn = document.getElementById("emptyStateFormBtn");
  if (emptyBtn) {
    emptyBtn.onclick = () => {
      // Change this URL to your actual form page
      window.open("/medical_form", "_blank");
    };
  }
}

// Append Message
export function appendMessageToUI(role, text, payload = null) {
  const doc = document.createElement("div");
  doc.className = "msg " + (role === "user" ? "user" : "bot");

  const textContent = document.createElement("div");
  textContent.innerHTML = text.replace(/\n/g, "<br>");
  doc.appendChild(textContent);

  DOM.chatMessages.appendChild(doc);

  // [MAP LOGIC] - Hiển thị thẻ địa điểm (Đã comment)
  /*
  if (role === "model" && guideData) {
    appendLocationCardsToUI(guideData.locations, guideData, doc);
  }
  */

  if (role === "model" && payload) {
    appendMedicalCardToUI(payload, doc);
  }

  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

// Load Chat Content
export async function loadSelectedChatToUI() {
  DOM.chatMessages.innerHTML = "";

  if (!State.selectedId) {
    DOM.convTitle.textContent = "New chat";
    renderEmptyState();
    return;
  }

  const current = State.conversations.find((c) => c.id == State.selectedId);
  const rawTitle = current ? current.title || "Conversation" : "Loading...";
  const maxLength = 30;
  DOM.convTitle.textContent =
    rawTitle.length > maxLength
      ? rawTitle.slice(0, maxLength) + "..."
      : rawTitle;

  const msgs = await DataManager.getMessages(State.selectedId);
  if (!msgs || msgs.length === 0) {
    renderEmptyState();
  } else {
    msgs.forEach((m) => {
      const patientData = m.data ? m.data : null;
      appendMessageToUI(m.role, m.content, patientData);
    });
  }
}

function generateBoardingPassHTML(data, isExport = false) {
  const p = data.patient;

  // --- HELPER FUNCTION: Xử lý song ngữ ---
  const renderBilingual = (obj, isLightMode = false) => {
    if (!obj) return "—";
    if (typeof obj === "string") return obj;

    const en = obj.en || obj.name_en || obj.name || "";
    const vi = obj.vi || obj.name_vi || "";

    if (!vi || vi.toLowerCase() === en.toLowerCase()) return en;
    return `${en} <span class="bp-sub-text">${vi}</span>`;
  };

  // --- HELPER FUNCTION: Xử lý danh sách ---
  const renderList = (arr) => {
    if (!arr || arr.length === 0)
      return "None <span class='bp-sub-text'>Không có</span>";
    return arr
      .map(
        (item) => `<span class="bp-list-item">${renderBilingual(item)}</span>`
      )
      .join("");
  };

  // Data mapping
  const triageCode = data.triage?.level ? `L${data.triage.level}` : "NA";
  const triageDisplay = renderBilingual(data.triage?.display_text);

  const today = new Date();
  const dateStr = today.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = today.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const natCode = p.nationality?.code || "VN";
  const natName = renderBilingual(p.nationality);
  const emPhone = p.emergency_contact?.phone || "N/A";
  const emName = p.emergency_contact?.name || "N/A";

  const closeBtnHTML = isExport
    ? ""
    : `<button class="bp-close-floating" id="internal-close-btn" title="Close">&times;</button>`;

  let complaintContent = "—";
  if (
    data.chief_complaint?.symptoms &&
    data.chief_complaint.symptoms.length > 0
  ) {
    complaintContent = renderList(data.chief_complaint.symptoms);
  } else {
    complaintContent = data.chief_complaint?.original || "—";
  }

  return `
    <div class="medical-boarding-pass">
      ${closeBtnHTML}

      <div class="bp-route">
        <div class="bp-station text-left">
          <span class="bp-station-label">NATIONALITY / QUỐC TỊCH</span>
          <span class="bp-station-code">${natCode}</span>
          <span class="bp-station-name">${natName}</span>
        </div>

        <div class="bp-flight-icon" style="transform: none;">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="#0d2c54">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM10 17H8V15H6V13H8V11H10V13H12V15H10V17ZM16 19H14V17H16V19ZM16 15H14V13H16V15ZM16 11H14V9H16V11ZM16 7H14V5H16V7Z" />
           </svg>
        </div>

        <div class="bp-station text-right" style="align-items: flex-end;">
          <span class="bp-station-label">PRIORITY / MỨC ĐỘ</span>
          <span class="bp-station-code text-danger">${triageCode}</span>
          <span class="bp-station-name text-right" style="text-align:right;">${triageDisplay}</span>
        </div>
      </div>

      <div class="bp-main-info">
        <div class="bp-row">
          <div class="bp-field">
            <span class="bp-label-light">NAME / HỌ TÊN</span>
            <span class="bp-value-large">${p.name || "—"}</span>
          </div>
          <div class="bp-field text-right">
             <span class="bp-label-light">DATE / NGÀY</span>
             <span class="bp-value-light">${dateStr}</span>
          </div>
        </div>

        <div class="bp-row">
          <div class="bp-field">
            <span class="bp-label-light">AGE / GENDER</span>
            <span class="bp-value-light">
                ${p.age} / ${renderBilingual(p.gender, true)}
            </span>
          </div>
          <div class="bp-field">
            <span class="bp-label-light">BLOOD / NHÓM MÁU</span>
            <span class="bp-value-light">${p.blood_type || "—"}</span>
          </div>
           <div class="bp-field text-right">
            <span class="bp-label-light">TIME / GIỜ</span>
            <span class="bp-value-light">${timeStr}</span>
          </div>
        </div>
      </div>

      <div class="bp-separator">
          <div class="bp-dashed-line"></div>
      </div>

      <div class="bp-details">
        
        <div class="bp-detail-grid">
           <div class="bp-field">
              <span class="bp-label-dark">SYMPTOMS / TRIỆU CHỨNG</span>
              <span class="bp-value-dark">${complaintContent}</span>
           </div>
           
           <div class="bp-field">
              <span class="bp-label-dark">MEDS / THUỐC ĐANG DÙNG</span>
              <span class="bp-value-dark">${renderList(data.medications)}</span>
           </div>
        </div>
        
        <div class="bp-detail-grid" style="margin-bottom:0;">
           <div class="bp-field">
              <span class="bp-label-dark">HISTORY / TIỀN SỬ</span>
              <span class="bp-value-dark">${renderList(
                data.medical_history
              )}</span>
           </div>

           <div class="bp-field">
              <span class="bp-label-dark">ALLERGIES / DỊ ỨNG</span>
              <span class="bp-value-dark text-danger">${renderList(
                data.allergies
              )}</span>
           </div>
        </div>

        <div class="bp-footer">
          <div class="bp-emergency">
             <span class="bp-emergency-label">EMERGENCY CONTACT / LIÊN HỆ KHẨN CẤP</span>
             <span class="bp-emergency-phone">${emPhone}</span>
             <span class="bp-emergency-name">${emName}</span>
          </div>
        </div>

      </div>
    </div>
  `;
}

// --- MODAL LOGIC ---
function ensureMedicalModalExists() {
  if (document.getElementById("medical-modal")) return;
  const modal = document.createElement("div");
  modal.id = "medical-modal";
  modal.className = "hidden";
  modal.innerHTML = `
    <div class="modal-container">
      <div id="medical-pass-content"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add("hidden");
    document.body.style.overflow = "auto";
  };

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest(".modal-container") === null)
      close();
  });

  window.closeMedicalModal = close;
}

export function openMedicalModal(data) {
  if (!data || !data.patient) return;
  ensureMedicalModalExists();
  const container = document.getElementById("medical-pass-content");

  container.innerHTML = generateBoardingPassHTML(data, false);

  const closeBtn = container.querySelector("#internal-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", window.closeMedicalModal);
  }

  document.body.style.overflow = "hidden";
  document.getElementById("medical-modal").classList.remove("hidden");
}

// --- THUMBNAIL LOGIC ---
export function appendMedicalCardToUI(medicalData, parentElement) {
  ensureMedicalModalExists();
  const wrap = document.createElement("div");
  wrap.className = "file-attachment-container";
  const pName = medicalData.patient?.name || "Patient";
  const triageLevel = medicalData.triage?.level || "N/A";

  wrap.innerHTML = `
    <div class="file-card">
      <div class="file-icon">
        <svg width="48" height="52" viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 6C10 4.89543 10.8954 4 12 4H30L38 12V40C38 41.1046 37.1046 42 36 42H12C10.8954 42 10 41.1046 10 40V6Z" fill="white" stroke="#111827" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M30 4V12H38" stroke="#111827" stroke-width="2.5" stroke-linejoin="round"/>
          <line x1="16" y1="14" x2="28" y2="14" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round"/>
          <line x1="16" y1="19" x2="32" y2="19" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round"/>
          <rect x="6" y="24" width="36" height="12" rx="3" fill="#EF4444" stroke="#EF4444" stroke-width="2"/>
          <text x="24" y="32.5" fill="white" font-family="Arial, sans-serif" font-weight="900" font-size="10" text-anchor="middle" dominant-baseline="middle">PDF</text>
          <path d="M24 38V48" stroke="#EF4444" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18 42L24 48L30 42" stroke="#EF4444" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="file-info">
        <h4 class="file-name">MedPass_${pName.replace(/\s+/g, "_")}.pdf</h4>
        <div class="file-meta">
          <span>Priority: Level ${triageLevel}</span>
          <span>•</span>
          <span style="color:#059669;">Ready to print</span>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-icon-action btn-preview" title="Preview"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
        <button class="btn-icon-action btn-download" title="Download"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
      </div>
    </div>
  `;

  wrap.querySelector(".btn-preview").addEventListener("click", (e) => {
    e.stopPropagation();
    openMedicalModal(medicalData);
  });
  wrap.querySelector(".btn-download").addEventListener("click", (e) => {
    e.stopPropagation();
    exportMedicalPDF(medicalData);
  });
  parentElement.appendChild(wrap);
}

// --- EXPORT PDF LOGIC ---
async function exportMedicalPDF(data) {
  if (!window.html2canvas || !window.jspdf) {
    alert("System libraries (html2canvas/jspdf) are loading...");
    return;
  }

  const tempContainer = document.createElement("div");
  Object.assign(tempContainer.style, {
    position: "fixed",
    top: "-9999px",
    left: "-9999px",
    width: "380px",
  });
  document.body.appendChild(tempContainer);

  const dummyWrapper = document.createElement("div");
  tempContainer.appendChild(dummyWrapper);

  // isExport = true (Không hiện nút Close)
  dummyWrapper.innerHTML = generateBoardingPassHTML(data, true);

  try {
    const canvas = await html2canvas(dummyWrapper, {
      scale: 3,
      useCORS: true,
      backgroundColor: null,
    });

    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;

    // PDF size = Canvas size
    const pdf = new jsPDF({
      orientation: "p",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

    pdf.save(`Medical_Pass_${data.patient.name.replace(/\s+/g, "_")}.pdf`);
  } catch (err) {
    console.error("Export Failed", err);
    alert("Export failed.");
  } finally {
    document.body.removeChild(tempContainer);
  }
}

// [MAP LOGIC] - Các hàm xử lý Admin Helper và Map (Đã comment toàn bộ)
/*
window.handleStartGuideFromAdmin = function (locationName) {
  console.log("🚀 Starting guide from Admin Page for:", locationName);
  const adminModal = document.getElementById("admin-helper-modal");
  if (adminModal) {
    adminModal.remove(); 
  }
  if (locationName) {
    startGuideFlow(locationName);
  }
};

function openAdminHelperPage(locationName, locationAddress, placeDetails, guideData) {
  const params = new URLSearchParams({
    name: locationName,
    address: locationAddress,
    lat: placeDetails.lat || "",
    lng: placeDetails.lng || "",
    type: detectLocationType(locationName),
  });
  const url = `/chat/admin_helper?${params.toString()}`;
  window.open(url, "_blank");
}

function detectLocationType(name) {
  const n = name.toLowerCase();
  if (n.includes("công chứng") || n.includes("notary")) return "notary";
  if (n.includes("cmnd") || n.includes("cccd") || n.includes("id card")) return "id_card";
  if (n.includes("hộ chiếu") || n.includes("passport")) return "passport";
  if (n.includes("hộ khẩu") || n.includes("residence")) return "residence";
  if (n.includes("khai sinh") || n.includes("birth")) return "birth";
  if (n.includes("kết hôn") || n.includes("marriage")) return "marriage";
  return "default";
}

export async function appendLocationCardsToUI(locations, guideData, parentElement = null) {
  if (!locations || locations.length === 0) return;

  const locationsWithDetails = await Promise.all(
    locations.map(async (loc) => {
      try {
        const currentPlace = await findPlace(loc.Ten);
        return currentPlace ? { ...loc, placeDetails: currentPlace } : null;
      } catch (error) {
        console.error("Error finding place:", error);
        return null;
      }
    })
  );

  const validLocations = locationsWithDetails.filter((item) => item !== null);
  const container = document.createElement("div");
  container.className = "locations-container";
  container.innerHTML = `<p class="location-status">Found ${validLocations.length} matching locations:</p>`;

  const fragment = document.createDocumentFragment();

  validLocations.forEach((data) => {
    const { placeDetails } = data; 
    const card = document.createElement("div");
    card.className = "location-card";
    card.style.cursor = "pointer";

    const phoneLink = placeDetails.phone_number
      ? `<a href="tel:${placeDetails.phone_number}">${placeDetails.phone_number}</a>`
      : "Not available";

    let webLink = "";
    if (placeDetails.website) {
      const url = placeDetails.website.startsWith("http")
        ? placeDetails.website
        : `//${placeDetails.website}`;
      webLink = `<a href="${url}" target="_blank">Website</a>`;
    }

    card.innerHTML = `
      <h3>${placeDetails.name}</h3>
      <p class="address">${placeDetails.location}</p>
      <p class="phone">Phone: ${phoneLink}</p>
      <div class="card-footer">
        <div class="links">${webLink}<a href="#" class="map-link">View on Map</a></div>
        <button class="btn-guide-trigger" style="border:1px solid #0078ff; color:#0078ff; background:white; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:6px; transition: all 0.3s ease;">
          <i class="fas fa-clipboard-check"></i> 
          <span>Admin Helper</span>
        </button>
      </div>
    `;

    card.querySelector(".map-link").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (State.pinLocationToMapFn)
        State.pinLocationToMapFn(placeDetails.lat, placeDetails.lng, data.Ten, placeDetails);
    });

    card.querySelector(".btn-guide-trigger").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAdminHelperPage(data.Ten, placeDetails.location, placeDetails);
    });

    card.addEventListener("click", (e) => {
      if (e.target.tagName === "A" || e.target.closest(".btn-guide-trigger")) return;
      if (State.pinLocationToMapFn)
        State.pinLocationToMapFn(placeDetails.lat, placeDetails.lng, data.Ten, placeDetails);
    });

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
  if (parentElement) {
    parentElement.appendChild(container);
  } else {
    DOM.chatMessages.appendChild(container);
    DOM.chatMessages.scrollTo({ top: DOM.chatMessages.scrollHeight, behavior: "smooth" });
  }
}
*/
