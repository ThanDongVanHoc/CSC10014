import { state, setMapInstance, updateState } from "./state.js";
import {
  setMainMarker,
  setPoiMarker,
  createPin,
  pinLocationToMap,
  checkIsPoi,
} from "./services/markerUtils.js";
import { drawRoute } from "./services/routing.js";
import {
  initPoiFeature,
  clearAllLayers,
  turnOffPoi,
} from "./components/POIManager.js";
import { initMapOverlay } from "./components/Overlay.js";
import { MapGuideUI, updateMapForGuideStep } from "./components/MapGuide.js";

// Hàm khởi tạo chính, được gọi từ file HTML
export function initMap() {
  // 1. Khởi tạo Leaflet Map
  const map = L.map("map").setView([10.762622, 106.660172], 12);

  // 2. Thêm Tile Layer (Lớp nền bản đồ từ OpenStreetMap)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OSM contributors",
  }).addTo(map);

  // 3. Lưu instance map vào state global
  setMapInstance(map);

  // 4. Khởi tạo các tính năng phụ trợ
  initPoiFeature(); // Tính năng POI (Địa điểm)
  initMapOverlay(map); // Tính năng Fullscreen/Overlay

  L.Control.geocoder({ defaultMarkGeocode: false })
    .on("markgeocode", async function (e) {
      const { map, routeLayer } = state;
      turnOffPoi();
      map.closePopup();
      if (routeLayer) map.removeLayer(routeLayer);
      const { center, name } = e.geocode;
      const poiCheck = await checkIsPoi(center.lat, center.lng, name);
      if (poiCheck && poiCheck.isPPoi) {
        const dbData = poiCheck.poi;
        setPoiMarker([dbData.lat, dbData.lng], dbData.name, dbData);
      } else {
        map.flyTo(center, 17, { animate: true, duration: 1.2 });
        createPin(center, name);
      }
    })
    .addTo(map);

  // 6. Thêm nút định vị GPS
  const locateControl = L.control({ position: "topright" });
  locateControl.onAdd = function () {
    const el = L.DomUtil.create("div", "");
    L.DomEvent.disableClickPropagation(el);
    el.style.cssText =
      "background:white;padding:6px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.12);";
    el.innerHTML =
      '<button id="useGPS" style="background:transparent;border:0;cursor:pointer">📍 My GPS</button>';
    return el;
  };
  locateControl.addTo(map);

  // Sự kiện click nút GPS
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "useGPS") {
      if (!navigator.geolocation) return alert("Not support Geolocation");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMainMarker(
            [pos.coords.latitude, pos.coords.longitude],
            "You are here"
          );
        },
        (err) => alert("Can't' detect location: " + err.message)
      );
    }
  });


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

  // 8. Logic xử lý Dragging Map để phân biệt với Click
  map.on("mousedown", (e) => {
    updateState("mapDragStart", {
      x: e.originalEvent.clientX,
      y: e.originalEvent.clientY,
    });
    updateState("isMapDragging", false);
  });

  map.on("mousemove", (e) => {
    if (state.mapDragStart) {
      const deltaX = e.originalEvent.clientX - state.mapDragStart.x;
      const deltaY = e.originalEvent.clientY - state.mapDragStart.y;
      // Nếu di chuyển chuột > 5px thì coi là đang drag
      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 5)
        updateState("isMapDragging", true);
    }
  });

  // Sự kiện Click Map (Tạo Pin)
  map.on("click", (e) => {
    if (!state.isMapDragging) {
      if (state.flag_pin) createPin(e.latlng, "Marked Point");
      else updateState("flag_pin", true);
    }
    updateState("mapDragStart", null);
    updateState("isMapDragging", false);
  });

  map.on("mouseup", () => {
    updateState("mapDragStart", null);
    updateState("isMapDragging", false);
  });

  // 9. Expose (Công khai) các hàm cần thiết ra Global Window
  // Để các đoạn mã HTML String (onclick="...") có thể gọi được
  window.MapGuideUI = MapGuideUI;
  window.updateMapForGuideStep = updateMapForGuideStep;

  // Trả về các hàm API của map module
  return {
    map,
    pinLocationToMap,
    MapGuideUI,
    clearAllLayers,
  };
}
