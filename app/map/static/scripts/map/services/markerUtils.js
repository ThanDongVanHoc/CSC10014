// js/map/services/markerUtils.js
import {
  state,
  updateState,
  addToSavedPins,
  removeFromSavedPins,
} from "../state.js";
import { icons } from "../config.js";
import { drawRoute } from "./routing.js";
import { poiSidebarUI } from "../components/POISidebar.js";

// --- Helper Functions to Modify State ---

// Hàm cập nhật trạng thái marker (Start/End) và xóa marker cũ tương ứng
export function updateMarkerState(type, newValue) {
  const { map, startMarker, endMarker, mainMarker, routeLayer } = state;
  let currentMarker = type === "start" ? startMarker : endMarker;

  // Xóa marker cũ nếu nó không phải là mainMarker (tránh xóa nhầm marker chính)
  if (currentMarker && currentMarker !== mainMarker) {
    map.removeLayer(currentMarker);
  }

  // Cập nhật state mới
  if (type === "start") {
    updateState("startMarker", newValue);
  } else {
    updateState("endMarker", newValue);
  }

  // Nếu thay đổi điểm start/end thì phải xóa đường dẫn cũ đi
  if (routeLayer) {
    map.removeLayer(routeLayer);
    updateState("routeLayer", null);
  }
}

// Xóa một pin đã lưu khỏi bản đồ và state
export function removeSavedPin(pinMarker) {
  const { map } = state;
  if (map) map.removeLayer(pinMarker);
  removeFromSavedPins(pinMarker);
}

// Hàm dọn dẹp toàn bộ bản đồ (Reset state)
export function clearMapState() {
  const { map, routeLayer, mainMarker, startMarker, endMarker, savedPins } =
    state;
  if (!map) return;

  if (routeLayer) {
    map.removeLayer(routeLayer);
    updateState("routeLayer", null);
  }
  if (startMarker) {
    map.removeLayer(startMarker);
    updateState("startMarker", null);
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    updateState("endMarker", null);
  }
  // Xóa tất cả các pin đã lưu
  if (savedPins.length > 0) {
    savedPins.forEach((pin) => map.removeLayer(pin));
    updateState("savedPins", []);
  }
  map.closePopup();
}

// Hàm helper xóa điểm Start cũ
export function clearOldStart() {
  const { startMarker, mainMarker, map } = state;
  if (startMarker && startMarker !== mainMarker) {
    map.removeLayer(startMarker);
  }
}

// Đặt điểm Start thông thường (có Popup và nút Unpin)
export function setNormalStartPoint(latlng, name, shouldDraw = true) {
  const { map, mainMarker, endMarker } = state;

  // Kiểm tra xem vị trí mới có trùng với Main Marker (Avatar) không
  let isAtAvatar = false;
  if (mainMarker) {
    const avatarPos = mainMarker.getLatLng();
    if (avatarPos.distanceTo(latlng) < 2) {
      isAtAvatar = true;
    }
  }

  clearOldStart();

  // Tạo nội dung Popup HTML
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

  let newStartMarker;
  // Chọn icon dựa trên vị trí (Avatar hay Green Icon)
  if (!isAtAvatar) {
    newStartMarker = L.marker(latlng, { icon: icons.green })
      .addTo(map)
      .bindPopup(popupContent)
      .openPopup();
  } else {
    newStartMarker = L.marker(latlng, { icon: icons.avatar_pin })
      .addTo(map)
      .bindPopup(popupContent)
      .openPopup();
  }

  updateState("startMarker", newStartMarker);

  map.closePopup();
  // Tự động vẽ đường nếu đã có điểm đích
  if (shouldDraw && endMarker) drawRoute();

  // Gắn sự kiện cho nút Unpin trong Popup
  const btn = popupContent.querySelector("#unpinBtn");
  if (btn) {
    btn.onclick = () => {
      updateMarkerState("start", null);
    };
  }
}

// Đặt điểm Start cho POI (Không có Popup, dùng Sidebar)
export function setPOIStartPoint(
  latlng,
  name,
  extraData = {},
  shouldDraw = true
) {
  clearOldStart();
  poiSidebarUI.close();
  const marker = L.marker(latlng, {
    icon: icons.green,
    zIndexOffset: 10,
  }).addTo(state.map);
  if (extraData) {
    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      poiSidebarUI.open(extraData, null, "start");
    });
  }
  updateState("startMarker", marker);
  if (shouldDraw && state.endMarker) drawRoute();
}

// Hàm helper xóa điểm End cũ
export function clearEndPoint() {
  const { endMarker, mainMarker, map } = state;
  if (endMarker && endMarker !== mainMarker) {
    map.removeLayer(endMarker);
  }
}

// Đặt điểm End thông thường
export function setNormalEndPoint(latlng, name, shouldDraw = true) {
  const { map, mainMarker, startMarker } = state;
  let isAtAvatar = false;
  if (mainMarker) {
    const avatarPos = mainMarker.getLatLng();
    if (avatarPos.distanceTo(latlng) < 2) {
      isAtAvatar = true;
    }
  }

  clearEndPoint();

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

  let newEndMarker;
  if (!isAtAvatar) {
    newEndMarker = L.marker(latlng, { icon: icons.red })
      .addTo(map)
      .bindPopup(popupContent)
      .openPopup();
  } else {
    newEndMarker = L.marker(latlng, { icon: icons.avatar_pin })
      .addTo(map)
      .bindPopup(popupContent)
      .openPopup();
  }

  updateState("endMarker", newEndMarker);

  map.closePopup();
  if (shouldDraw && startMarker) drawRoute();

  const btn = popupContent.querySelector("#unpinBtn");
  if (btn) {
    btn.onclick = () => {
      updateMarkerState("end", null);
    };
  }
}

// Đặt điểm End cho POI
export function setPOIEndPoint(
  latlng,
  name,
  extraData = {},
  shouldDraw = true
) {
  clearEndPoint();
  poiSidebarUI.close();
  const marker = L.marker(latlng, { icon: icons.red, zIndexOffset: 10 }).addTo(
    state.map
  );
  if (extraData) {
    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      poiSidebarUI.open(extraData, null, "end");
    });
  }
  updateState("endMarker", marker);
  if (shouldDraw && state.startMarker) drawRoute();
}

// Lưu một Pin thông thường vào bản đồ (từ click)
export function saveNormalPinToMap(latlng, name) {
  const { map } = state;
  poiSidebarUI.close();
  const popupContent = document.createElement("div");
  popupContent.innerHTML = `
        <div style="text-align: center; padding: 5px;">
            <b>📍 Saved pin</b><br>
            <div style="margin: 5px 0 10px 0;">${name}</div>
            <button id="unpinBtn" style="background:#dc3545; color:white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                Unpin
            </button>
        </div>
    `;

  const savedPinMarker = L.marker(latlng, { icon: icons.yellow })
    .addTo(map)
    .bindPopup(popupContent);

  addToSavedPins(savedPinMarker);

  const btn = popupContent.querySelector("#unpinBtn");
  if (btn) {
    btn.onclick = () => {
      removeSavedPin(savedPinMarker);
    };
  }
}

// Lưu Pin từ POI (trả về marker để Sidebar quản lý)
export function savePOIPinToMap(latlng, name, extraData = {}) {
  const savedPinMarker = L.marker(latlng, { icon: icons.yellow }).addTo(
    state.map
  );
  addToSavedPins(savedPinMarker);
  if (extraData) {
    savedPinMarker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      poiSidebarUI.open(extraData, null, "pin");
    });
  }
  return savedPinMarker;
}

// Hàm set marker chính (thường dùng khi search địa chỉ)
export function setMainMarker(latlng, text, shouldFly = true) {
  const { map, mainMarker } = state;
  const ll = L.latLng(latlng);

  // Xóa marker cũ nếu có
  if (mainMarker) map.removeLayer(mainMarker);

  const newMainMarker = L.marker(ll, { icon: icons.avatar_pin }).addTo(map);
  updateState("mainMarker", newMainMarker);

  // Popup cho Main Marker có nút Start/End
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

  newMainMarker.bindPopup(popupDiv).openPopup();
  if (shouldFly) map.flyTo(ll, 17, { animate: true, duration: 1.2 });

  // Gắn sự kiện cho các nút trong Popup
  popupDiv.querySelector(".btn-start").onclick = () =>
    setNormalStartPoint(ll, text || "Location: " + ll.toString());
  popupDiv.querySelector(".btn-end").onclick = () =>
    setNormalEndPoint(ll, text || "Location: " + ll.toString());
  return newMainMarker;
}

// Tạo Pin tạm thời khi click vào bản đồ
// Tạo Pin tạm thời khi click vào bản đồ (Có Reverse Geocoding)
export function createPin(latlng, name) {
  const { map } = state;
  const marker = L.marker(latlng, { icon: icons.blue }).addTo(map);
  let isSaved = false;

  // 1. Biến lưu tên địa điểm.
  // Nếu là click chuột (Marked Point) thì để placeholder, còn nếu từ search thì dùng luôn.
  let resolvedName = name === "Marked Point" ? "Getting address..." : name;
  const isNeedReverse = name === "Marked Point";

  poiSidebarUI.close();

  // Tạo ID ngẫu nhiên để lát nữa cập nhật lại nội dung thẻ <b>
  const titleId = `pin-title-${Date.now()}`;

  const popupDiv = document.createElement("div");
  L.DomEvent.disableClickPropagation(popupDiv);

  // HTML Popup: Thêm ID cho thẻ <b> và style cho icon xoay (loading)
  popupDiv.innerHTML = `
        <div style="text-align: center; padding: 5px;"> 
            <b id="${titleId}">
                ${resolvedName} 
                ${isNeedReverse ? '<span class="spinner">↻</span>' : ""}
            </b><br>
            <small style="color: #666;">${latlng.lat.toFixed(
              5
            )}, ${latlng.lng.toFixed(5)}</small>
            <input type="text" placeholder="Note..." class="note-input" style="width: 90%; margin: 8px 0; padding: 4px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"> <br>
            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                <button class="btn-start" style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Start</button>
                <button class="btn-end" style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">End</button>
                <button class="btn-pin" style="flex: 1; background:#777; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Pin</button>
            </div>
        </div>
    `;

  const noteInput = popupDiv.querySelector(".note-input");

  // 2. Logic gọi API Nominatim (Reverse Geocoding)
  if (isNeedReverse) {
    // Cấu hình: zoom=18 (chi tiết nhất), accept-language=vi (ưu tiên tiếng Việt)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1&accept-language=vi`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        // Lấy tên hiển thị (Ưu tiên tên ngắn gọn nếu có, không thì lấy display_name full)
        const newName = data.display_name || "Location not found";
        resolvedName = newName; // Cập nhật biến để dùng cho nút bấm

        // Cập nhật giao diện (Xóa spinner, hiện tên mới)
        const titleEl = popupDiv.querySelector(`#${titleId}`);
        if (titleEl) titleEl.innerText = newName;
      })
      .catch((err) => {
        console.warn("Reverse geocode failed:", err);
        const titleEl = popupDiv.querySelector(`#${titleId}`);
        if (titleEl) titleEl.innerText = "Vị trí đã chọn";
        resolvedName = "Selected Location";
      });
  }

  // 3. Xử lý các nút (Sử dụng biến resolvedName đã được cập nhật)
  popupDiv.querySelector(".btn-start").onclick = () => {
    const userNote = noteInput.value || resolvedName;
    setNormalStartPoint(latlng, userNote);
  };
  popupDiv.querySelector(".btn-end").onclick = () => {
    const userNote = noteInput.value || resolvedName;
    setNormalEndPoint(latlng, userNote);
  };

  marker.on("popupclose", function (e) {
    if (!isSaved) {
      map.removeLayer(marker);
      console.log("Marker tạm thời đã bị xóa.");
    }
  });

  popupDiv.querySelector(".btn-pin").onclick = () => {
    const userNote = noteInput.value || resolvedName; // Lưu với tên mới tìm được
    isSaved = true;
    map.removeLayer(marker);
    marker.closePopup();
    saveNormalPinToMap(latlng, userNote);
  };

  marker.bindPopup(popupDiv).openPopup();
  return marker;
}

export function setPoiMarker(latlng, name, extraData = {}) {
  const { map } = state;
  if (!map) return;

  poiSidebarUI.close();
  const ll = L.latLng(latlng);
  map.flyTo(latlng, 17, { animate: true, duration: 1.2 });
  const poiMarker = L.marker(ll, { icon: icons.blue }).addTo(map);
  let rawImg = extraData.img;
  if (rawImg) {
    rawImg = rawImg.replace(/\\/g, "/"); // Fix lỗi đường dẫn ảnh Windows
  }

  const data = {
    id: extraData.id,
    latlng: ll,
    name: extraData.name || name,
    image: `/chat/pois/${rawImg}` || "",
    intro: extraData.intro || "Search Result",
    location: extraData.location || "---",
    phone: extraData.phone_number || "---",
    website: extraData.website || "#",
  };
  poiSidebarUI.open(data, poiMarker);
  return poiMarker;
}
// Hàm ghim địa điểm cụ thể (dùng cho tính năng search location bên ngoài)
export function pinLocationToMap(lat, lng, name, extraData = {}) {
  const { map, locationMarker } = state;
  if (!map) return;
  if (locationMarker) map.removeLayer(locationMarker);

  const latlng = L.latLng(lat, lng);
  const newLocationMarker = L.marker(latlng, { icon: icons.yellow }).addTo(map);
  updateState("locationMarker", newLocationMarker);

  map.flyTo(latlng, 17, { animate: true, duration: 1.2 });
  let rawImg = extraData.img;
  if (rawImg) {
    rawImg = rawImg.replace(/\\/g, "/"); // Fix lỗi đường dẫn ảnh Windows
  }

  // Chuẩn bị dữ liệu để hiển thị Sidebar
  const sidebarData = {
    id: extraData.id,
    latlng: latlng,
    name: name,
    image: `/chat/pois/${rawImg}`,
    intro: extraData.intro || "Search Result",
    location: extraData.location || "---",
    phone: extraData.phone_number || "---",
    website: extraData.website || "#",
  };

  if (poiSidebarUI) {
    poiSidebarUI.open(sidebarData);
    newLocationMarker.on('click', function(e) {
      poiSidebarUI.open(sidebarData);
    });
  } else {
    console.error("poiSidebarUI is not initialized");
  }
}

// Hàm refresh lại kích thước bản đồ (cần thiết khi thay đổi layout/fullscreen)
export function invalidateMapSize() {
  const { map } = state;
  if (map) map.invalidateSize();
}

export async function checkIsPoi(lat, lng, name) {
  const params = new URLSearchParams({
    lat: lat,
    lng: lng,
    name: name,
  });
  const url = `/chat/check_poi?${params.toString()}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Server error");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking POI:", error);
    return false;
  }
}
