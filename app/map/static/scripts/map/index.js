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
import { initMedicalHeatmap } from "./components/MedicalMap.js"; 


export function initMap() {
  // 1. Initialize Map
  const map = L.map("map").setView([10.762622, 106.660172], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OSM contributors",
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