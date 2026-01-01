// js/map/index.js
import { setMapInstance } from "./state.js";
import { pinLocationToMap } from "./services/markerUtils.js";
import { initTransportPanel } from "./services/routing.js";
import { initPoiFeature, clearAllLayers } from "./components/POIManager.js";
import { initMapOverlay } from "./components/Overlay.js";
import { MapGuideUI, updateMapForGuideStep } from "./components/MapGuide.js";
import { initSearchService } from "./services/search.js";
import { initGPSControl } from "./components/GPSControl.js";
import { initMapEvents } from "./services/mapEvents.js";
// --- NEW IMPORT ---
import { initMedicalHeatmap, toggleMedicalMode } from "./components/MedicalMap.js";


export function initMap() {
  // 1. Initialize Map
  const map = L.map("map").setView([10.762622, 106.660172], 12);

  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Maps'
  }).addTo(map);

  setMapInstance(map);

  // Initialize existing features
  initPoiFeature();
  initMapOverlay(map);
  initSearchService(map);
  initGPSControl(map);
  initMapEvents(map);

  // --- NEW: Initialize Medical Heatmap ---
  initMedicalHeatmap();

  const medicalDataRaw = document.getElementById('medical-results-data');
  if (medicalDataRaw) {
    const hospitals = JSON.parse(medicalDataRaw.textContent);

    if (hospitals && hospitals.hospitals.length > 0) {

      console.log("Detecting AI results, auto-activating Medical Mode...");
      toggleMedicalMode(); // Gọi hàm này để nó tự chạy render và đổi icon nút

      if (hospitals.hospitals[0]) {
        map.flyTo([hospitals.hospitals[0].lat, hospitals.hospitals[0].lng], 14);
      }
    }
  }

  // 3. Initialize transport panel
  initTransportPanel();

  // 5. Expose necessary functions globally
  window.MapGuide = MapGuideUI;
  MapGuideUI.init();
  window.updateMapForGuideStep = updateMapForGuideStep;
  window.pinLocationToMap = pinLocationToMap;

  return {
    map
  };
}