import { state, updateState } from "../state.js";

const OSRM_SERVERS = {
    "driving": "https://routing.openstreetmap.de/routed-car/route/v1/driving",
    "motor":   "https://routing.openstreetmap.de/routed-bike/route/v1/driving",
    "walking": "https://routing.openstreetmap.de/routed-foot/route/v1/driving"
};

const MODE_MAP = {
    "driving": "driving",
    "Motorcycling": "motor",
    "walking": "walking"
};

export async function drawRoute() {
    const { startMarker, endMarker, map, currentMode, routeLayer } = state;

    // 1. Kiểm tra đầu vào
    if (!startMarker || !endMarker || !map || !currentMode) return;

    // 2. Dọn dẹp layer cũ
    if (routeLayer) map.removeLayer(routeLayer);
    const { turnOffPoi } = await import("../components/POIManager.js");
    turnOffPoi();
    map.closePopup(); // Đóng các popup cũ

    const s = startMarker.getLatLng();
    const e = endMarker.getLatLng();
    const osrmKey = MODE_MAP[currentMode];

    // UI Elements: Lấy các element để hiển thị thông tin
    const infoPanel = document.getElementById('routeInfoDisplay');
    const elTime = document.getElementById('infoDuration');
    const elDist = document.getElementById('infoDistance');

    // Reset UI: Tạm ẩn thông tin cũ khi đang load
    if(infoPanel) infoPanel.classList.add('hidden');

    if (!osrmKey || !OSRM_SERVERS[osrmKey]) return;

    // 3. Gọi API OSRM
    const serverUrl = OSRM_SERVERS[osrmKey];
    const baseUrl = serverUrl.substring(0, serverUrl.lastIndexOf("/"));
    const profile = serverUrl.substring(serverUrl.lastIndexOf("/") + 1);
    const url = `${baseUrl}/${profile}/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
            return alert("Không tìm thấy đường đi.");
        }

        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);

        // 4. Tính toán
        const km = (route.distance / 1000).toFixed(1);
        let mins = (route.duration / 60);

        const scale = { driving: 1, motor: 1.1, walking: 5, bike: 2.5 };
        mins = Math.round(mins * (scale[osrmKey] || 1));
        
        // Format lại thời gian cho đẹp (VD: 65 phút -> 1h 5p)
        let timeString = `${mins} min`;
        if (mins >= 60) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            timeString = `${h}h ${m}m`;
        }

        // 5. Vẽ đường
        const newRouteLayer = L.polyline(coords, {
            color: "#0078ff",
            weight: 6, // Đậm hơn chút cho đẹp
            opacity: 0.8,
            lineCap: 'round'
        }).addTo(map);
        
        // Zoom map vừa vặn với đường đi
        map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] });
        updateState("routeLayer", newRouteLayer);

        // 6. CẬP NHẬT UI TRÊN THANH CÔNG CỤ (Thay vì Popup)
        if (infoPanel && elTime && elDist) {
            elTime.innerText = timeString;
            elDist.innerText = `${km} km`;
            
            // Xóa class hidden để hiệu ứng trượt ra hoạt động
            infoPanel.classList.remove('hidden');
        }
            
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}