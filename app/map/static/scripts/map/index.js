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


export function initMap() {
  // 1. Initialize Map
  const map = L.map("map").setView([10.762622, 106.660172], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OSM contributors",
  }).addTo(map);

  setMapInstance(map);

  initPoiFeature();
  initMapOverlay(map);
  initSearchService(map);
  initGPSControl(map);
  initMapEvents(map);

  // 3. Initialize transport panel
  initTransportPanel();

  // 5. Expose necessary functions globally
  window.MapGuideUI = MapGuideUI;
  window.updateMapForGuideStep = updateMapForGuideStep;

  return {
    map,
    pinLocationToMap,
    MapGuideUI,
    clearAllLayers,
  };
}


// Notification system
function showNotification(title, message, duration = 3000) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    padding: 16px 20px;
    max-width: 320px;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    border-left: 4px solid #667eea;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; gap: 12px;">
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 13px; color: #64748b;">${message}</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" 
        style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px;">
        ✕
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after duration
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, duration);
  
  // Add animation styles if not already present
  if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.innerHTML = `
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Export notification function for use in other modules
window.showNotification = showNotification;