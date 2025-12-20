// logic.js
import { initMap } from "./map/index.js";


async function initialize() {
  console.log("🚀 logic.js loaded: Initializing app...");
  // 1. KHỞI TẠO MAP
  const { map, pinLocationToMap } = initMap();

  // 5. DỌN DẸP SESSION
  window.addEventListener("beforeunload", () => {
    navigator.sendBeacon("/chat/clear_session");
  });
}

document.addEventListener("DOMContentLoaded", initialize);
