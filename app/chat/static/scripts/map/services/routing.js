import { state, updateState } from "../state.js";

// Hàm chính để vẽ tuyến đường
export async function drawRoute() {
  const { startMarker, endMarker, map, currentMode, routeLayer } = state;

  // Chỉ vẽ khi có đủ điểm đầu, điểm cuối và map
  if (!startMarker || !endMarker || !map) return;

  // Xóa đường cũ nếu đã tồn tại
  if (routeLayer) map.removeLayer(routeLayer);
  const {turnOffPoi} = await import("../components/POIManager.js");  
  turnOffPoi();
  map.closePopup();

  const s = startMarker.getLatLng();
  const e = endMarker.getLatLng();

  // Gọi API OSRM (Open Source Routing Machine)
  const url = `https://router.project-osrm.org/route/v1/${currentMode}/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    // Nếu không tìm thấy đường
    if (!data.routes?.length) return alert("Can't find route!");

    const route = data.routes[0];
    // Đảo ngược tọa độ vì GeoJSON là [lng, lat] còn Leaflet là [lat, lng]
    const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);

    // Tính toán khoảng cách (km) và thời gian (phút)
    const km = (route.distance / 1000).toFixed(1);
    let mins = (route.duration / 60).toFixed(0);

    // Điều chỉnh thời gian ước lượng tùy theo phương tiện
    const scale = { driving: 1, cycling: 3.3, walking: 10 };
    mins = Math.round(mins * (scale[currentMode] || 1));

    // Vẽ đường đi mới
    const newRouteLayer = L.polyline(coords, {
      color: "#0078ff",
      weight: 5,
    }).addTo(map);
    map.fitBounds(newRouteLayer.getBounds()); // Zoom map vừa khít đường đi

    // Cập nhật state để quản lý layer này
    updateState("routeLayer", newRouteLayer);

    // Hiển thị Popup thông tin ở giữa quãng đường
    const mid = coords[Math.floor(coords.length / 2)];
    L.popup()
      .setLatLng(mid)
      .setContent(
        `${currentMode.toUpperCase()}<br>📏 ${km} km<br>⏱️ ${mins} minutes`
      )
      .openOn(map);
  } catch (err) {
    alert("Lỗi khi tải tuyến đường: " + err);
  }
}
