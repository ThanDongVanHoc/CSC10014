// js/map/components/Overlay.js
import { invalidateMapSize } from "../services/markerUtils.js";

let mapFullscreenBtn = null;
let mapEl = null;
let pinned = false;


// Hàm khởi tạo overlay
export function initMapOverlay(mapInstance) {
  mapFullscreenBtn = document.getElementById("mapFullscreenBtn");
  mapEl = document.getElementById("map");

  if (mapFullscreenBtn) {
    mapFullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleScreenEvent();
    });
  }
}

// Hàm chuyển đổi chế độ Fullscreen
export async function handleScreenEvent() {
  try {
    // Import động module chat nếu cần
    const isCurrentlyFullscreen = mapEl.classList.contains("fullscreen");
    const fullscreenIcon = document.getElementById("fullscreenIcon");

    if (!isCurrentlyFullscreen) {
      // Chuyển sang Fullscreen
      mapEl.classList.add("fullscreen");

      if (fullscreenIcon) {
        fullscreenIcon.classList.remove("fa-expand");
        fullscreenIcon.classList.add("fa-compress");
      }

    } else {
      invalidateMapSize();
      pinned = false;

      if (fullscreenIcon) {
        fullscreenIcon.classList.remove("fa-compress");
        fullscreenIcon.classList.add("fa-expand");
      }
    }
  } catch (err) {
    console.warn("Fullscreen toggle error:", err);
  } finally {
    // Cập nhật lại kích thước map Leaflet sau animation
    setTimeout(() => {
      invalidateMapSize();
    }, 260);
  }
}

function stopPropagation(e) {
  e.stopPropagation();
}
