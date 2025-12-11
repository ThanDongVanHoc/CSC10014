import { setMapInstance } from "./state.js";
import { pinLocationToMap } from "./services/markerUtils.js";
// Import hàm initTransportPanel từ routing.js
import { initTransportPanel } from "./services/routing.js";
import { initPoiFeature, clearAllLayers } from "./components/POIManager.js";
import { initMapOverlay } from "./components/Overlay.js";
import { MapGuideUI, updateMapForGuideStep } from "./components/MapGuide.js";
import { initSearchService } from "./services/search.js";
import { initGPSControl } from "./components/GPSControl.js";
import { initMapEvents } from "./services/mapEvents.js";

export function initMap() {
  // 1. Khởi tạo Map
  const map = L.map("map").setView([10.762622, 106.660172], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OSM contributors",
  }).addTo(map);

  setMapInstance(map);

  // 2. Khởi tạo các thành phần UI/Tính năng
  initPoiFeature();
  initMapOverlay(map);
  initSearchService(map);
  initGPSControl(map);
  initMapEvents(map);

  // 3. Khởi tạo thanh điều khiển phương tiện (Logic nằm bên routing.js)
  initTransportPanel();

  // 4. Expose các hàm cần thiết ra Global để HTML gọi được
  window.MapGuideUI = MapGuideUI;
  window.updateMapForGuideStep = updateMapForGuideStep;

  return {
    map,
    pinLocationToMap,
    MapGuideUI,
    clearAllLayers,
  };
}
