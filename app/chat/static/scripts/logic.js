// logic.js
import { initMap, invalidateMapSize } from "./map.js";
import { initPoiFeature } from "./poi.js";
import { initMapOverlay } from "./map_overlay.js";
import { initChat, setMapReference } from "./chat.js";

async function initialize() {
  console.log("🚀 logic.js loaded: Initializing app...");

  // ============================
  // 1. KHỞI TẠO MAP
  // ============================
  const { map, pinLocationToMap } = initMap();

  // ============================
  // 2. KHỞI TẠO CÁC FEATURE CỦA MAP
  // ============================

  // Khởi tạo POI (cần map instance)
  initPoiFeature(map);

  // Khởi tạo Overlay Controls (Fullscreen, Logo)
  initMapOverlay(map);

  // ============================
  // 3. KẾT NỐI MAP VỚI CHAT
  // ============================
  // Truyền hàm vẽ map vào cho module Chat sử dụng
  setMapReference(pinLocationToMap);

  // ============================
  // 4. KHỞI TẠO CHAT SYSTEM
  // ============================
  await initChat();

  // ============================
  // 5. XỬ LÝ UI RESIZE
  // ============================
  const hideBtn = document.getElementById("hideBtn");
  const showBtn = document.getElementById("showSidebar");

  if (hideBtn) {
    hideBtn.addEventListener("click", () => {
      setTimeout(invalidateMapSize, 300);
    });
  }

  if (showBtn) {
    showBtn.addEventListener("click", () => {
      setTimeout(invalidateMapSize, 300);
    });
  }

  // ============================
  // 6. DỌN DẸP SESSION
  // ============================
  window.addEventListener("beforeunload", () => {
    navigator.sendBeacon("/chat/clear_session");
  });
}

document.addEventListener("DOMContentLoaded", initialize);
