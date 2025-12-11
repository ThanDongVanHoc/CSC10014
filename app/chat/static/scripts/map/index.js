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
  initMapEvents(map);


  const transportButtons = document.querySelectorAll(".t-btn");
  const transportPanel = document.querySelector('.transport-panel');
  // Start compact to save space
  if (transportPanel) transportPanel.classList.add('compact');

  // Detect whether the device supports hover (pointer devices)
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  transportButtons.forEach((trans_btn, idx) => {
    trans_btn.dataset.i = idx;

    // Selection behavior (always): change active and update state
    trans_btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      transportButtons.forEach((btn) => btn.classList.remove("active"));
      trans_btn.classList.add("active");
      updateState("flag_pin", false);
      updateState("currentMode", trans_btn.dataset.travel);
      if (state.startMarker && state.endMarker) drawRoute();

      // For touch devices, toggle collapse/expand on click so user can see options
      if (!supportsHover && transportPanel) {
        transportPanel.classList.remove('expanded');
        transportPanel.classList.add('compact');
      }
    });
  });

  // If device supports hover, rely on CSS :hover for expansion (no JS needed)
  if (!supportsHover && transportPanel) {
    // For touch devices: tap active icon to expand, tap outside to collapse
    transportPanel.addEventListener('click', (e) => {
      // if clicked on panel but not on a button, toggle expanded state
      if (e.target && !e.target.classList.contains('t-btn')) {
        // ignore
        return;
      }
      // If already expanded, do nothing here (selection collapses after click)
      if (transportPanel.classList.contains('compact')) {
        transportPanel.classList.remove('compact');
        transportPanel.classList.add('expanded');
      }
    });

    document.addEventListener('click', (e) => {
      if (!transportPanel) return;
      if (!transportPanel.contains(e.target)) {
        transportPanel.classList.remove('expanded');
        transportPanel.classList.add('compact');
      }
    });
  }
  
  // 9. Expose (Công khai) các hàm cần thiết ra Global Window
  // Để các đoạn mã HTML String (onclick="...") có thể gọi được
  window.MapGuideUI = MapGuideUI;
  window.updateMapForGuideStep = updateMapForGuideStep;

  return {
    map,
    pinLocationToMap,
    MapGuideUI,
    clearAllLayers,
  };
}
