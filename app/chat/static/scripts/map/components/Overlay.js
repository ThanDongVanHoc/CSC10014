// js/map/components/Overlay.js
import { invalidateMapSize } from "../services/markerUtils.js";

let mapFullscreenBtn = null;
let mapEl = null;
let chatContainer = null;
let mapLogo = null;
let mapChatOverlay = null;

// Hàm khởi tạo overlay
export function initMapOverlay(mapInstance) {
  mapFullscreenBtn = document.getElementById("mapFullscreenBtn");
  mapEl = document.getElementById("map");
  chatContainer = document.getElementById("chatContainer");
  mapLogo = document.getElementById("mapLogo");
  mapChatOverlay = document.getElementById("mapChatOverlay");

  if (mapLogo) mapLogo.style.display = "none";

  // --- LOGIC KÉO THẢ (DRAG) CHO LOGO ---
  let isDragging = false;
  let pinned = false; // Trạng thái ghim chat
  let offsetX = 0,
    offsetY = 0;
  let dragStartX = 0,
    dragStartY = 0;

  if (mapLogo) {
    // Bắt đầu kéo
    mapLogo.addEventListener("mousedown", (e) => {
      const isMapFullscreen = mapEl.classList.contains("fullscreen");
      if (!isMapFullscreen) return;
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      mapLogo.classList.add("dragging");
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = mapLogo.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      mapLogo.style.transition = "none"; // Tắt transition để kéo mượt
    });

    // Di chuyển chuột
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const mapRect = mapEl.getBoundingClientRect();
      const logoSize = 64;
      // Tính toán vị trí mới
      let newX = e.clientX - mapRect.left - offsetX;
      let newY = e.clientY - mapRect.top - offsetY;
      // Giới hạn không cho kéo ra ngoài bản đồ
      newX = Math.max(0, Math.min(newX, mapRect.width - logoSize));
      newY = Math.max(0, Math.min(newY, mapRect.height - logoSize));
      mapLogo.style.left = newX + "px";
      mapLogo.style.top = newY + "px";
      mapLogo.style.bottom = "auto";
      mapLogo.style.right = "auto";
      mapLogo.style.transform = "";
    });

    // Thả chuột (kết thúc kéo)
    document.addEventListener("mouseup", (e) => {
      if (!isDragging) return;
      isDragging = false;
      mapLogo.classList.remove("dragging");
      mapLogo.style.transition =
        "transform 0.35s ease, left 0.2s ease, top 0.2s ease, right 0.2s ease, bottom 0.2s ease";

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Nếu chỉ click nhẹ (không kéo xa) -> Toggle Pin/Unpin
      if (dragDistance < 5) {
        const isMapFullscreen = mapEl.classList.contains("fullscreen");
        if (!isMapFullscreen) return;
        pinned = !pinned;
        if (pinned) {
          // Ghim Logo vào giữa và hiện Chat
          mapLogo.style.left = "50%";
          mapLogo.style.top = "12px";
          mapLogo.style.transform = "translateX(-50%)";
          mapLogo.style.bottom = "auto";
          mapLogo.style.right = "auto";
          if (chatContainer && chatContainer.parentElement !== mapChatOverlay)
            mapChatOverlay.appendChild(chatContainer);
          mapChatOverlay.classList.remove("hidden");
          mapChatOverlay.classList.add("pinned");
          invalidateMapSize();
        } else {
          // Trả Logo về góc
          mapLogo.style.left = "16px";
          mapLogo.style.bottom = "22px";
          mapLogo.style.top = "auto";
          mapLogo.style.transform = "";
          mapChatOverlay.classList.add("hidden");
          mapChatOverlay.classList.remove("pinned");
          invalidateMapSize();
        }
      }
    });
    // Ngăn chặn sự kiện click lan ra map
    mapLogo.addEventListener("click", (e) => e.stopPropagation());
  }

  // --- Xử lý sự kiện nút Fullscreen ---
  if (mapFullscreenBtn) {
    mapFullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleScreenEvent();
    });
  }
}

// Hàm chuyển đổi chế độ Fullscreen
async function handleScreenEvent() {
  try {
    // Import động module chat nếu cần
    const { hideSearchWrapper } = await import("../chat.js");
    const isCurrentlyFullscreen = mapEl.classList.contains("fullscreen");

    if (!isCurrentlyFullscreen) {
      // Chuyển sang Fullscreen
      mapEl.classList.add("fullscreen");
      mapChatOverlay.appendChild(chatContainer);
      mapChatOverlay.classList.add("hidden");
      if (mapLogo) mapLogo.style.display = "block";
      // Ngăn chặn click xuyên qua khung chat
      if (chatContainer) {
        chatContainer.addEventListener("click", stopPropagation);
        chatContainer.addEventListener("mousedown", stopPropagation);
      }
      if (hideSearchWrapper) hideSearchWrapper();
    } else {
      // Thoát Fullscreen
      mapEl.classList.remove("fullscreen");
      document.querySelector(".app").prepend(chatContainer);
      mapChatOverlay.classList.add("hidden");
      if (mapLogo) mapLogo.style.display = "none";
      if (chatContainer) {
        chatContainer.removeEventListener("click", stopPropagation);
        chatContainer.removeEventListener("mousedown", stopPropagation);
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
