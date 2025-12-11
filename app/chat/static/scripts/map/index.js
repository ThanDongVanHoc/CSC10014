import { state, setMapInstance, updateState } from "./state.js";
import { pinLocationToMap } from "./services/markerUtils.js";
import { drawRoute } from "./services/routing.js";
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

  // 3. Khởi tạo sự kiện bản đồ (Click/Drag) 
  initMapEvents(map);

  // 4. Xử lý các nút chọn phương tiện (Transport Buttons)
  document.querySelectorAll(".transport-btns button").forEach((trans_btn) => {
    trans_btn.addEventListener("click", () => {
      document
        .querySelectorAll(".transport-btns button")
        .forEach((btn) => btn.classList.remove("active"));
      trans_btn.classList.add("active");

      updateState("flag_pin", false);
      updateState("currentMode", trans_btn.dataset.travel);

      if (state.startMarker && state.endMarker) drawRoute();
    });
  });

  // 5. Expose Global
  window.MapGuideUI = MapGuideUI;
  window.updateMapForGuideStep = updateMapForGuideStep;

  return {
    map,
    pinLocationToMap,
    MapGuideUI,
    clearAllLayers,
  };
}
