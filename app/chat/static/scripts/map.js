// map.js
export const icons = {
  blue: new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  red: new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  green: new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  yellow: new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  avatar_pin: L.divIcon({
    className: "custom-avatar-icon",
    html: `
              <div class="avatar-marker-container">
                  <div class="avatar-ripple"></div>
                  <img class="avatar-pin-img" src="/static/images/hcmus_avatar.jpg" alt="Avatar" />
              </div>
          `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -30],
  }),
};

// --- State Variables ---
export let map = null;
export let mainMarker = null;
export let startMarker = null;
export let endMarker = null;
export let routeLayer = null;
export let savedPins = [];
let locationMarker = null;
let flag_pin = true;
let currentMode = "driving";
let mapDragStart = null;
let isMapDragging = false;

// --- Helper Functions to Modify State (For external modules) ---

export function hasStartMarker() {
  return startMarker !== null;
}

export function hasEndMarker() {
  return endMarker !== null;
}

export function clearMapState() {
  // Hàm này giúp poi.js xóa state mà không cần truy cập trực tiếp biến
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  if (mainMarker) {
    map.removeLayer(mainMarker);
    mainMarker = null;
  }
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }
  if (savedPins.length > 0) {
    savedPins.forEach((pin) => map.removeLayer(pin));
    savedPins = [];
  }
  map.closePopup();
}

export function removeSavedPin(pinMarker) {
  if (map) map.removeLayer(pinMarker);
  savedPins = savedPins.filter((pin) => pin !== pinMarker);
}

// --- Core Functions ---

export function setStartPoint(latlng, name) {
  const popupContent = document.createElement("div");
  popupContent.innerHTML = `
      <div style="text-align: center; padding: 5px;"> 
          <b>🏁 Start</b><br>
          <small style="color: #666;">${latlng.lat.toFixed(
            5
          )}, ${latlng.lng.toFixed(5)}</small>
          <div style="margin: 5px 0 10px 0;">${name}</div>
          <button id="unpinBtn" style="background:#dc3550; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
              Unpin
          </button>
      </div>
  `;

  if (startMarker) map.removeLayer(startMarker);

  startMarker = L.marker(latlng, { icon: icons.green })
    .addTo(map)
    .bindPopup(popupContent)
    .openPopup();

  map.closePopup();
  if (endMarker) drawRoute();

  popupContent.querySelector("#unpinBtn").onclick = () => {
    map.removeLayer(startMarker);
    startMarker = null;
    if (routeLayer) map.removeLayer(routeLayer);
  };
}

export function setEndPoint(latlng, name) {
  const popupContent = document.createElement("div");
  popupContent.innerHTML = `
      <div style="text-align: center; padding: 5px;"> 
          <b>🎯 Destination</b><br>
          <small style="color: #666;">${latlng.lat.toFixed(
            5
          )}, ${latlng.lng.toFixed(5)}</small>
          <div style="margin: 5px 0 10px 0;">${name}</div>
          <button id="unpinBtn" style="background:#dc3545; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
              Unpin
          </button>
      </div>
  `;

  if (endMarker) map.removeLayer(endMarker);

  endMarker = L.marker(latlng, { icon: icons.red })
    .addTo(map)
    .bindPopup(popupContent)
    .openPopup();

  map.closePopup();
  if (startMarker) drawRoute();

  popupContent.querySelector("#unpinBtn").onclick = () => {
    map.removeLayer(endMarker);
    endMarker = null;
    if (routeLayer) map.removeLayer(routeLayer);
  };
}

export function savePinToMap(latlng, name) {
  const popupContent = document.createElement("div");
  popupContent.innerHTML = `
        <div style="text-align: center; padding: 5px;">
            <b>Saved pin:</b><br>
            <div style="margin: 5px 0 10px 0;">${name}</div>
            <button id="unpinBtn" style="background:#dc3545; color:white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                Unpin
            </button>
        </div>
    `;

  const savedPinMarker = L.marker(latlng, { icon: icons.yellow })
    .addTo(map)
    .bindPopup(popupContent);

  savedPins.push(savedPinMarker);

  popupContent.querySelector("#unpinBtn").onclick = () => {
    removeSavedPin(savedPinMarker);
  };
}

export function setMarker(latlng, text) {
  const ll = L.latLng(latlng);
  if (mainMarker) map.removeLayer(mainMarker);

  mainMarker = L.marker(ll, { icon: icons.avatar_pin }).addTo(map);

  const popupDiv = document.createElement("div");
  popupDiv.innerHTML = `
        <div style="text-align: center; padding: 5px;"> 
            <b>${text || "Location: " + ll.toString()}</b><br>            
            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                <button class="btn-start" style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Start</button>
                <button class="btn-end" style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">End</button>
            </div>
        </div>
    `;

  mainMarker.bindPopup(popupDiv).openPopup();
  map.setView(ll, 17);

  popupDiv.querySelector(".btn-start").onclick = () =>
    setStartPoint(ll, text || "Location: " + ll.toString());
  popupDiv.querySelector(".btn-end").onclick = () =>
    setEndPoint(ll, text || "Location: " + ll.toString());
}

function createPin(latlng, name) {
  const marker = L.marker(latlng, { icon: icons.blue }).addTo(map);
  let isSaved = false;

  const popupDiv = document.createElement("div");
  L.DomEvent.disableClickPropagation(popupDiv);
  popupDiv.innerHTML = `
        <div style="text-align: center; padding: 5px;"> 
            <b>${name}</b><br>
            <small style="color: #666;">${latlng.lat.toFixed(
              5
            )}, ${latlng.lng.toFixed(5)}</small>
            <input type="text" placeholder="Take note" class="note-input" style="width: 90%; margin: 8px 0; padding: 4px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"> <br>
            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                <button class="btn-start" style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Start</button>
                <button class="btn-end" style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">End</button>
                <button class="btn-pin" style="flex: 1; background:#777; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Pin</button>
            </div>
        </div>
    `;

  const noteInput = popupDiv.querySelector(".note-input");

  popupDiv.querySelector(".btn-start").onclick = () => {
    const userNote = noteInput.value || name || "(No note !)";
    setStartPoint(latlng, userNote);
  };
  popupDiv.querySelector(".btn-end").onclick = () => {
    const userNote = noteInput.value || name || "(No note !)";
    setEndPoint(latlng, userNote);
  };

  marker.on("popupclose", function (e) {
    if (!isSaved) {
      map.removeLayer(marker);
      console.log("Marker tạm thời đã bị xóa.");
    }
  });

  popupDiv.querySelector(".btn-pin").onclick = () => {
    const userNote = noteInput.value || "(No note !)";
    isSaved = true;
    map.removeLayer(marker);
    marker.closePopup();
    savePinToMap(latlng, userNote);
  };

  marker.bindPopup(popupDiv).openPopup();
}

export async function drawRoute() {
  if (!startMarker || !endMarker) return;

  if (routeLayer) map.removeLayer(routeLayer);
  // Import động để tránh circular dependency, hoặc giả định poi.js xử lý việc clear riêng
  // Ở đây chúng ta chỉ vẽ, việc clear POI nên được xử lý bởi người gọi nếu cần

  const s = startMarker.getLatLng();
  const e = endMarker.getLatLng();
  const url = `https://router.project-osrm.org/route/v1/${currentMode}/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return alert("Can't find route!");

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
    const km = (route.distance / 1000).toFixed(1);
    let mins = (route.duration / 60).toFixed(0);

    const scale = { driving: 1, cycling: 3.3, walking: 10 };
    mins = Math.round(mins * (scale[currentMode] || 1));

    routeLayer = L.polyline(coords, { color: "#0078ff", weight: 5 }).addTo(map);
    map.fitBounds(routeLayer.getBounds());

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

export function pinLocationToMap(lat, lng, name, phone, website, distance) {
  if (!map) return;
  if (locationMarker) map.removeLayer(locationMarker);

  const latlng = L.latLng(lat, lng);
  locationMarker = L.marker(latlng, { icon: icons.yellow }).addTo(map);

  const phoneLink = phone
    ? `<a href="tel:${phone}" style="color: #0078ff;">${phone}</a>`
    : "Không có";
  const webLink = website
    ? `<a href="${
        website.startsWith("http") ? "" : "//"
      }${website}" target="_blank" style="color: #0078ff;">Website</a>`
    : "";
  const distanceText = distance
    ? `<br><small style="color: #666;">📍 ${distance.toFixed(1)} km</small>`
    : "";

  const popupDiv = document.createElement("div");
  popupDiv.innerHTML = `
        <div style="text-align: left; padding: 8px; min-width: 180px;">
            <b style="display: block; margin-bottom: 6px; color: #0b2b3a;">${name}</b>
            <small style="color: #666; display: block; margin-bottom: 6px;">📞 ${phoneLink}</small>
            ${
              webLink
                ? `<small style="display: block; margin-bottom: 6px;">${webLink}</small>`
                : ""
            }
            ${distanceText}
            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 8px;">
                <button class="btn-start" style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">Start</button>
                <button class="btn-end" style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">End</button>
            </div>
        </div>
    `;

  locationMarker.bindPopup(popupDiv).openPopup();
  map.setView(latlng, 17);

  popupDiv.querySelector(".btn-start").onclick = () =>
    setStartPoint(latlng, name);
  popupDiv.querySelector(".btn-end").onclick = () => setEndPoint(latlng, name);
}

export function invalidateMapSize() {
  if (map) map.invalidateSize();
}

// --- Map Guide Logic (Giữ lại trong map.js vì liên quan chặt đến core map functions) ---
let currentStepMarker = null;
let guideContainer = null;
let currentGuideMarker = null;
let suggestionMarkers = [];

window.updateMapForGuideStep = function (lat, lng, title, zoomLevel = 18) {
  if (!map) return;
  if (currentStepMarker) map.removeLayer(currentStepMarker);
  if (!lat || !lng) return;

  const stepIcon = new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  map.flyTo([lat, lng], zoomLevel, { animate: true, duration: 1.5 });
  currentStepMarker = L.marker([lat, lng], { icon: stepIcon }).addTo(map);
  currentStepMarker
    .bindPopup(
      `<div style="text-align:center;"><b style="color:#6f42c1">STEP: ${title}</b><br>📍 Vị trí này</div>`
    )
    .openPopup();
};

window.MapGuideUI = {
  init: function () {
    if (document.querySelector(".map-guide-container")) return;
    guideContainer = document.createElement("div");
    guideContainer.className = "map-guide-container";
    document.getElementById("map").appendChild(guideContainer);
  },
  renderStep: function (stepData, totalSteps, currentIndex, callbacks) {
    this.init();
    const icon =
      stepData.type === "move" ? "🛵" : stepData.type === "doc" ? "📄" : "📍";
    let suggestionHtml = "";
    if (stepData.suggestion_query) {
      suggestionHtml = `<div class="smart-suggestion-btn" onclick="window.MapGuideUI.triggerSuggestion('${
        stepData.suggestion_query
      }')"><i class="fas fa-search-location"></i> ${
        stepData.suggestion_text || "Tìm địa điểm hỗ trợ gần đây"
      }</div>`;
    }

    guideContainer.innerHTML = `
          <div class="map-guide-card">
            <div class="guide-overlay-header"><span class="guide-progress-text">Hướng dẫn chi tiết</span><span class="guide-step-badge">${
              currentIndex + 1
            } / ${totalSteps}</span></div>
            <div class="guide-overlay-body">
              <div class="guide-step-title">${icon} ${stepData.title}</div>
              <div class="guide-step-desc">${stepData.desc}</div>
              ${suggestionHtml}
              <div id="step-extra-${stepData.id}" style="margin-top:10px"></div>
              <div id="problem-form-${
                stepData.id
              }" style="display:none; margin-top:10px;">
                <input id="problem-input-${
                  stepData.id
                }" class="guide-problem-input" placeholder="Mô tả sự cố (ví dụ: bãi xe hết chỗ)" />
                <div style="display:flex; gap:8px; margin-top:8px;">
                  <button class="btn-submit-issue" onclick="window.submitIssue(${
                    stepData.id
                  })">Gửi vấn đề</button>
                  <button class="btn-cancel-issue" onclick="window.toggleIssueForm(${
                    stepData.id
                  }, false)">Hủy</button>
                </div>
              </div>
              <div id="solution-box-${
                stepData.id
              }" class="ai-solution-box" style="display:none; margin-top:10px;">
                <div class="solution-title">Gợi ý từ AI</div>
                <div id="solution-content-${
                  stepData.id
                }" class="solution-content"></div>
              </div>
              <div id="action-buttons-${
                stepData.id
              }" class="guide-overlay-actions">
                ${
                  currentIndex > 0
                    ? `<button class="action-btn btn-undo" id="btn-guide-undo"><i class="fas fa-undo"></i></button>`
                    : ""
                }
                <button class="action-btn btn-issue" id="btn-guide-issue-${
                  stepData.id
                }"><i class="fas fa-exclamation-triangle"></i> Sự cố</button>
                <button class="action-btn btn-next" id="btn-guide-next-${
                  stepData.id
                }">${
      currentIndex === totalSteps - 1 ? "Hoàn tất" : "Tiếp theo"
    } <i class="fas fa-arrow-right"></i></button>
              </div>
            </div>
          </div>
        `;

    const btnNext = document.getElementById(`btn-guide-next-${stepData.id}`);
    if (btnNext)
      btnNext.onclick = () => {
        if (typeof callbacks.onNext === "function") callbacks.onNext();
      };
    const btnUndo = document.getElementById("btn-guide-undo");
    if (btnUndo)
      btnUndo.onclick = () => {
        if (typeof callbacks.onUndo === "function") callbacks.onUndo();
      };
    const issueBtn = document.getElementById(`btn-guide-issue-${stepData.id}`);
    if (issueBtn)
      issueBtn.onclick = () => {
        window.toggleIssueForm(stepData.id, true);
      };
    this.updateMapCamera(stepData);
  },
  updateMapCamera: function (step) {
    if (!map) return;
    if (currentGuideMarker) map.removeLayer(currentGuideMarker);
    if (step.lat && step.lng) {
      map.flyTo([step.lat, step.lng], 17, { duration: 1.5 });
      currentGuideMarker = L.marker([step.lat, step.lng], {
        icon: new L.Icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      }).addTo(map);
    }
  },
  triggerSuggestion: function (query) {
    suggestionMarkers.forEach((m) => map.removeLayer(m));
    suggestionMarkers = [];
    alert(`🤖 Đang tìm "${query}" gần vị trí của bạn...`);
    const center = map.getCenter();
    const nearby1 = [center.lat + 0.001, center.lng + 0.001];
    const nearby2 = [center.lat - 0.001, center.lng - 0.0005];
    [nearby1, nearby2].forEach((loc, i) => {
      const marker = L.marker(loc, {
        icon: new L.Icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      })
        .addTo(map)
        .bindPopup(`<b>${query} ${i + 1}</b><br>Cách bạn 150m`)
        .openPopup();
      suggestionMarkers.push(marker);
    });
    map.flyTo(center, 16);
  },
  handleTrouble: function (solutionText) {
    try {
      document
        .querySelectorAll('[id^="solution-box-"]')
        .forEach((b) => (b.style.display = "block"));
      document
        .querySelectorAll('[id^="solution-content-"]')
        .forEach((c) => (c.innerHTML = solutionText));
    } catch (e) {
      console.warn(e);
    }
    try {
      alert("💡 AI Solution:\n" + solutionText);
    } catch (e) {}
  },
  close: function () {
    if (guideContainer) guideContainer.innerHTML = "";
    if (currentGuideMarker) map.removeLayer(currentGuideMarker);
    suggestionMarkers.forEach((m) => map.removeLayer(m));
  },
};

// --- Initialization ---

export function initMap() {
  map = L.map("map").setView([10.762622, 106.660172], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OSM contributors",
  }).addTo(map);

  L.Control.geocoder({ defaultMarkGeocode: false })
    .on("markgeocode", function (e) {
      setMarker(e.geocode.center, e.geocode.name);
    })
    .addTo(map);

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

  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "useGPS") {
      if (!navigator.geolocation) return alert("Not support Geolocation");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMarker(
            [pos.coords.latitude, pos.coords.longitude],
            "You are here"
          );
        },
        (err) => alert("Can't' detect location: " + err.message)
      );
    }
  });

  document.querySelectorAll(".transport-btns button").forEach((trans_btn) => {
    trans_btn.addEventListener("click", () => {
      document
        .querySelectorAll(".transport-btns button")
        .forEach((btn) => btn.classList.remove("active"));
      trans_btn.classList.add("active");
      flag_pin = false;
      currentMode = trans_btn.dataset.travel;
      if (startMarker && endMarker) drawRoute();
    });
  });

  map.on("mousedown", (e) => {
    mapDragStart = { x: e.originalEvent.clientX, y: e.originalEvent.clientY };
    isMapDragging = false;
  });

  map.on("mousemove", (e) => {
    if (mapDragStart) {
      const deltaX = e.originalEvent.clientX - mapDragStart.x;
      const deltaY = e.originalEvent.clientY - mapDragStart.y;
      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 5)
        isMapDragging = true;
    }
  });

  map.on("click", (e) => {
    if (!isMapDragging) {
      if (flag_pin) createPin(e.latlng, "Marked Point");
      else flag_pin = true;
    }
    mapDragStart = null;
    isMapDragging = false;
  });

  map.on("mouseup", () => {
    mapDragStart = null;
    isMapDragging = false;
  });

  return {
    map,
    pinLocationToMap,
    setStartPoint,
    setEndPoint,
    savePinToMap,
    hasStartMarker,
    hasEndMarker,
  };
}
