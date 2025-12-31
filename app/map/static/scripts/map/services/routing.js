import { state, updateState } from "../state.js";

const OSRM_SERVERS = {
  driving: "/map/proxy_route/driving",
  motor: "/map/proxy_route/motor",
  walking: "/map/proxy_route/walking",
};

const MODE_MAP = {
  driving: "driving",
  Motorcycling: "motor",
  walking: "walking",
};

export function initTransportPanel() {
  const transportButtons = document.querySelectorAll(".t-btn");
  const transportPanel = document.querySelector(".transport-panel");

  if (transportPanel) transportPanel.classList.add("compact");

  const supportsHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;

  transportButtons.forEach((trans_btn, idx) => {
    trans_btn.dataset.i = idx;

    if (trans_btn.classList.contains("active")) {
      updateState("currentMode", trans_btn.dataset.travel);
    }

    trans_btn.addEventListener("click", (ev) => {
      ev.stopPropagation();

      transportButtons.forEach((btn) => btn.classList.remove("active"));
      trans_btn.classList.add("active");

      updateState("flag_pin", false);
      updateState("currentMode", trans_btn.dataset.travel);

      if (state.startMarker && state.endMarker) {
        drawRoute();
      }

      if (!supportsHover && transportPanel) {
        transportPanel.classList.remove("expanded");
        transportPanel.classList.add("compact");
      }
    });
  });

  if (!supportsHover && transportPanel) {
    transportPanel.addEventListener("click", (e) => {
      if (e.target && !e.target.classList.contains("t-btn")) {
        return;
      }
      if (transportPanel.classList.contains("compact")) {
        transportPanel.classList.remove("compact");
        transportPanel.classList.add("expanded");
      }
    });

    document.addEventListener("click", (e) => {
      if (!transportPanel) return;
      if (!transportPanel.contains(e.target)) {
        transportPanel.classList.remove("expanded");
        transportPanel.classList.add("compact");
      }
    });
  }
}

export async function drawRoute() {
  const { startMarker, endMarker, map, currentMode, routeLayer } = state;

  if (!startMarker || !endMarker || !map || !currentMode) return;
  if (routeLayer) map.removeLayer(routeLayer);

  const { turnOffPoi } = await import("../components/POIManager.js");
  turnOffPoi();
  map.closePopup();

  const s = startMarker.getLatLng();
  const e = endMarker.getLatLng();
  const osrmKey = MODE_MAP[currentMode];

  const infoPanel = document.getElementById("routeInfoDisplay");
  const elTime = document.getElementById("infoDuration");
  const elDist = document.getElementById("infoDistance");

  if (infoPanel) infoPanel.classList.add("hidden");

  if (!osrmKey || !OSRM_SERVERS[osrmKey]) return;

  const serverPath = OSRM_SERVERS[osrmKey];
  const url = `${serverPath}/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();

    if (data.code !== "Ok" || !data.routes || !data.routes.length) {
      return alert("No route found between the selected points.");
    }

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);

    const km = (route.distance / 1000).toFixed(1);
    let mins = route.duration / 60;
    const scale = { driving: 1, motor: 0.65, walking: 4, bike: 2.5 };

    // Bước 1: Nhân với scale
    mins = Math.round(mins * (scale[osrmKey] || 1));

    if (osrmKey != "motor") {
      mins = route.duration / 60;
      mins = Math.round(mins);
    }

    let timeString = `${mins} min`;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      timeString = `${h}h ${m}m`;
    }

    const newRouteLayer = L.polyline(coords, {
      color: "#0078ff",
      weight: 6,
      opacity: 0.8,
      lineCap: "round",
    }).addTo(map);

    map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] });
    updateState("routeLayer", newRouteLayer);

    if (infoPanel && elTime && elDist) {
      elTime.innerText = timeString;
      elDist.innerText = `${km} km`;
      infoPanel.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    alert("Map server connection error. Please try again.");
  }
}
