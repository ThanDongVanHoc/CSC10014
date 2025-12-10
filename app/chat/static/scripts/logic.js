// logic.js
import { initMap } from "./map/index.js";
import { invalidateMapSize } from "./map/services/markerUtils.js";
import { initChat, setMapReference } from "./chat.js";

async function initialize() {
  console.log("🚀 logic.js loaded: Initializing app...");
  // 1. KHỞI TẠO MAP
  const { map, pinLocationToMap } = initMap();

  // 2. KẾT NỐI MAP VỚI CHAT
  // Truyền hàm vẽ map vào cho module Chat sử dụng
  setMapReference(pinLocationToMap);

  // 3. KHỞI TẠO CHAT SYSTEM
  await initChat();

  // 4. XỬ LÝ UI RESIZE
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

  // 5. DỌN DẸP SESSION
  window.addEventListener("beforeunload", () => {
    navigator.sendBeacon("/chat/clear_session");
  });
}

document.addEventListener("DOMContentLoaded", initialize);
