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
      <p>Where should we start?</p>
  `;
  DOM.chatMessages.appendChild(container);
}

// Append Message
export function appendMessageToUI(role, text, guideData = null) {
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
      const guidePayload = m.guide || m.guide_data || null;
      appendMessageToUI(m.role, m.content, guidePayload);
    });
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
