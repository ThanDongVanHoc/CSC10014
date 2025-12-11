import { state, updateState } from "../state.js";

const OSRM_SERVERS = {
  driving: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  motor: "https://routing.openstreetmap.de/routed-bike/route/v1/driving",
  walking: "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
};

const MODE_MAP = {
  driving: "driving",
  Motorcycling: "motor", // Lưu ý: Chữ M viết hoa khớp với HTML data-travel
  walking: "walking",
};

// --- HÀM KHỞI TẠO PANEL & NÚT BẤM ---
export function initTransportPanel() {
  const transportButtons = document.querySelectorAll(".t-btn");
  const transportPanel = document.querySelector(".transport-panel");

  // Thu gọn panel lúc đầu để tiết kiệm diện tích
  if (transportPanel) transportPanel.classList.add("compact");

  // Kiểm tra thiết bị có hỗ trợ hover (chuột) không
  const supportsHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;

  transportButtons.forEach((trans_btn, idx) => {
    trans_btn.dataset.i = idx;

    // === [FIX QUAN TRỌNG] ===
    // Tự động cập nhật state ngay khi chạy nếu nút đang có class active từ HTML
    if (trans_btn.classList.contains("active")) {
      updateState("currentMode", trans_btn.dataset.travel);
    }
    // ========================

    // Xử lý sự kiện Click chọn phương tiện
    trans_btn.addEventListener("click", (ev) => {
      ev.stopPropagation();

      // UI Update
      transportButtons.forEach((btn) => btn.classList.remove("active"));
      trans_btn.classList.add("active");

      // Logic Update
      updateState("flag_pin", false);
      updateState("currentMode", trans_btn.dataset.travel);

      // Nếu đã có đủ 2 điểm Start/End thì vẽ lại đường ngay
      if (state.startMarker && state.endMarker) {
        drawRoute();
      }

      // Trên điện thoại (không có hover): click xong thì thu gọn lại
      if (!supportsHover && transportPanel) {
        transportPanel.classList.remove("expanded");
        transportPanel.classList.add("compact");
      }
    });
  });

  // Xử lý đóng/mở Panel trên thiết bị cảm ứng (không có hover CSS)
  if (!supportsHover && transportPanel) {
    transportPanel.addEventListener("click", (e) => {
      // Nếu click vào nút phương tiện thì bỏ qua (đã xử lý ở trên)
      if (e.target && !e.target.classList.contains("t-btn")) {
        return;
      }
      // Click vào vùng trống của panel -> Mở rộng ra
      if (transportPanel.classList.contains("compact")) {
        transportPanel.classList.remove("compact");
        transportPanel.classList.add("expanded");
      }
    });

    // Click ra ngoài thì thu gọn lại
    document.addEventListener("click", (e) => {
      if (!transportPanel) return;
      if (!transportPanel.contains(e.target)) {
        transportPanel.classList.remove("expanded");
        transportPanel.classList.add("compact");
      }
    });
  }
}

// --- HÀM VẼ ĐƯỜNG ---
export async function drawRoute() {
  const { startMarker, endMarker, map, currentMode, routeLayer } = state;

  // 1. Kiểm tra đầu vào
  if (!startMarker || !endMarker || !map || !currentMode) return;

  // 2. Dọn dẹp layer cũ
  if (routeLayer) map.removeLayer(routeLayer);

  // Dynamic import để tránh vòng lặp dependency nếu có
  const { turnOffPoi } = await import("../components/POIManager.js");
  turnOffPoi();
  map.closePopup();

  const s = startMarker.getLatLng();
  const e = endMarker.getLatLng();
  const osrmKey = MODE_MAP[currentMode];

  // UI Elements
  const infoPanel = document.getElementById("routeInfoDisplay");
  const elTime = document.getElementById("infoDuration");
  const elDist = document.getElementById("infoDistance");

  if (infoPanel) infoPanel.classList.add("hidden");

  if (!osrmKey || !OSRM_SERVERS[osrmKey]) return;

  // 3. Gọi API OSRM
  const serverUrl = OSRM_SERVERS[osrmKey];
  const baseUrl = serverUrl.substring(0, serverUrl.lastIndexOf("/"));
  const profile = serverUrl.substring(serverUrl.lastIndexOf("/") + 1);
  const url = `${baseUrl}/${profile}/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== "Ok" || !data.routes || !data.routes.length) {
      return alert("Không tìm thấy đường đi.");
    }

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);

    // 4. Tính toán
    const km = (route.distance / 1000).toFixed(1);
    let mins = route.duration / 60;

    const scale = { driving: 1, motor: 1.1, walking: 5, bike: 2.5 };
    mins = Math.round(mins * (scale[osrmKey] || 1));

    let timeString = `${mins} min`;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      timeString = `${h}h ${m}m`;
    }

    // 5. Vẽ đường
    const newRouteLayer = L.polyline(coords, {
      color: "#0078ff",
      weight: 6,
      opacity: 0.8,
      lineCap: "round",
    }).addTo(map);

    map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] });
    updateState("routeLayer", newRouteLayer);

    // 6. Cập nhật UI
    if (infoPanel && elTime && elDist) {
      elTime.innerText = timeString;
      elDist.innerText = `${km} km`;
      infoPanel.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
