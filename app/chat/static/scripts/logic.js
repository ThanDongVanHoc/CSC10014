import { initMap, invalidateMapSize } from "./map.js";
// QUAN TRỌNG: Import từ file mới (nhớ đổi tên file nếu bạn lưu tên khác)
import { initChat, setMapReference } from "./chat.js";

async function initialize() {
  console.log("🚀 logic.js loaded: Initializing app...");

  // ============================
  // 1. KHỞI TẠO MAP
  // ============================
  const { map, pinLocationToMap } = initMap();

  // ============================
  // 2. KẾT NỐI MAP VỚI CHAT
  // ============================
  // Truyền hàm vẽ map vào cho module Chat sử dụng
  // Khi user bấm "Xem bản đồ" trong chat -> Chat gọi hàm này
  setMapReference(pinLocationToMap);

  // ============================
  // 3. KHỞI TẠO CHAT SYSTEM
  // ============================
  // Hàm này sẽ tự động check Auth và quyết định dùng chế độ Guest hay User
  await initChat();

  // ============================
  // 4. XỬ LÝ UI MAP (Resize khi ẩn hiện sidebar)
  // ============================
  const hideBtn = document.getElementById("hideBtn");
  const showBtn = document.getElementById("showSidebar");

  // Khi ẩn sidebar -> Map rộng ra -> Cần cập nhật lại kích thước map
  if (hideBtn) {
    hideBtn.addEventListener("click", () => {
      // Delay 300ms chờ hiệu ứng trượt sidebar xong mới vẽ lại map
      setTimeout(invalidateMapSize, 300);
    });
  }

  // Khi hiện sidebar -> Map hẹp lại -> Cập nhật kích thước
  if (showBtn) {
    showBtn.addEventListener("click", () => {
      setTimeout(invalidateMapSize, 300);
    });
  }

  // ============================
  // 5. DỌN DẸP SESSION (GUEST)
  // ============================
  window.addEventListener("beforeunload", () => {
    // Gửi tín hiệu báo server xóa session tạm (nếu là guest)
    navigator.sendBeacon("/chat/clear_session");
    // Lưu ý: sessionStorage trình duyệt sẽ tự xóa khi đóng tab, không cần code JS xóa.
  });
}

document.addEventListener("DOMContentLoaded", initialize);
