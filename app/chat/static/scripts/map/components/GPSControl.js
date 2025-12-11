import { setMainMarker } from "../services/markerUtils.js";

export function initGPSControl(map) {
  const controlsContainer = document.querySelector(".map-controls");
  if (!controlsContainer) return;

  const gpsBtn = document.createElement("button");
  gpsBtn.type = "button";
  gpsBtn.className = "map-btn-gps";
  gpsBtn.id = "useGPS";
  gpsBtn.title = "Vị trí của tôi";

  // Icon SVG mặc định
  const defaultIcon = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#666">
        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
      </svg>
  `;
  gpsBtn.innerHTML = defaultIcon;

  L.DomEvent.disableClickPropagation(gpsBtn);
  L.DomEvent.disableScrollPropagation(gpsBtn);
  gpsBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  gpsBtn.addEventListener("dblclick", (e) => e.stopPropagation());

  gpsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!navigator.geolocation) return alert("Trình duyệt không hỗ trợ GPS");

    // --- SỬ DỤNG SPIN CỦA CREATE PIN ---
    // Thay thế nội dung nút bằng thẻ span chứa ký tự ↻
    // Tăng font-size lên 18px cho vừa nút bấm
    gpsBtn.innerHTML = `<span class="spinner" style="font-size: 18px; margin:0;">↻</span>`;
    gpsBtn.style.pointerEvents = "none";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Trả lại icon cũ
        gpsBtn.innerHTML = defaultIcon;
        gpsBtn.style.pointerEvents = "auto";

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMainMarker([lat, lng], "Vị trí của bạn");
        map.flyTo([lat, lng], 16);
      },
      (err) => {
        // Trả lại icon cũ khi lỗi
        gpsBtn.innerHTML = defaultIcon;
        gpsBtn.style.pointerEvents = "auto";
        console.warn("GPS Error:", err);
        alert("Không thể lấy vị trí.");
      }
    );
  });

  controlsContainer.prepend(gpsBtn);
}
