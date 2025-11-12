const icons = {
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
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41],
        popupAnchor: [1, -34], shadowSize: [41, 41]
    }),

    yellow: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41],
        popupAnchor: [1, -34], shadowSize: [41, 41]
    })
};

let map = null;
let mainMarker = null;
let locationMarker = null; 
let startMarker = null;
let endMarker = null;
let routeLayer = null;
let flag_pin = true;
let currentMode = "driving";
let savedPins = []; // Dung de luu cac marker duoc pin

// BIẾN TOÀN CỤC MỚI DÙNG CHO POI VÀ QUẢN LÝ TRẠNG THÁI
let poiLayer = null; // Layer cho các POI
let poiControl = null; // Control chứa các nút filter POI
let currentPoiType = null; // Loại POI đang được chọn
let isPoiFetchingActive = true; // Trạng thái cho phép fetch POI tự động

function clearAllLayers() {
  // Xóa POI
  if (poiLayer) poiLayer.clearLayers();

  // Xóa đường đi
  if (routeLayer) map.removeLayer(routeLayer);
  routeLayer = null;

  // Xóa marker tạm thời (khi tìm kiếm/click)
  if (mainMarker) map.removeLayer(mainMarker);
  mainMarker = null;

  if (startMarker) map.removeLayer(startMarker);
  startMarker = null;

  if (endMarker) map.removeLayer(endMarker);
  endMarker = null;

  savedPins.forEach((pin) => {
    map.removeLayer(pin);
  });

  savedPins = [];

  map.closePopup();

  // Tắt highlight nút filter POI
  if (poiControl) {
    poiControl
      .getContainer()
      .querySelectorAll(".poi-filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
  }

  // Đặt lại trạng thái POI và Tắt tải POI tự động
  currentPoiType = null;
  togglePoiFetching(false);
}

function togglePoiFetching(active) {
  if (!map) return;

  isPoiFetchingActive = active;

  if (active) {
    map.on("moveend", fetchPOIsFromServer);
    if (currentPoiType) fetchPOIsFromServer();
  } else {
    map.off("moveend", fetchPOIsFromServer);
  }
}

function setStartPoint(latlng, name) {
  const popupContent = document.createElement("div");

  // Dùng name làm nội dung
  popupContent.innerHTML = `
      <div style="text-align: center; padding: 5px;"> 
          <b>🏁 Start</b><br>
          <small style="color: #666;">${latlng.lat.toFixed(
            5
          )}, ${latlng.lng.toFixed(5)}</small>
          
          <div style="margin: 5px 0 10px 0;">${name}</div>

          <button id="unpinBtn" style="background:#dc3545; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
              Unpin
          </button>
      </div>
  `;

  // Xóa marker cũ nếu có
  if (startMarker) {
    map.removeLayer(startMarker);
  }

  // Tạo marker mới
  startMarker = L.marker(latlng, { icon: icons.green })
    .addTo(map)
    .bindPopup(popupContent)
    .openPopup();

  map.closePopup(); // Đóng popup của marker (POI) cũ
  if (endMarker) drawRoute(); // Vẽ đường nếu đã có điểm End

  // Gắn sự kiện cho nút Unpin
  popupContent.querySelector("#unpinBtn").onclick = () => {
    map.removeLayer(startMarker);
    startMarker = null;
    if (routeLayer) map.removeLayer(routeLayer);
  };
}

function setEndPoint(latlng, name) {
  const popupContent = document.createElement("div");

  // Dùng name làm nội dung
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

  // Xóa marker cũ nếu có
  if (endMarker) {
    map.removeLayer(endMarker);
  }

  // Tạo marker mới
  endMarker = L.marker(latlng, { icon: icons.red })
    .addTo(map)
    .bindPopup(popupContent)
    .openPopup();

  map.closePopup(); // Đóng popup của marker (POI) cũ
  if (startMarker) drawRoute(); // Vẽ đường nếu đã có điểm Start

  // Gắn sự kiện cho nút Unpin
  popupContent.querySelector("#unpinBtn").onclick = () => {
    map.removeLayer(endMarker);
    endMarker = null;
    if (routeLayer) map.removeLayer(routeLayer);
  };
}

function savePinToMap(latlng, name) {
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

  const savedPinMarker = L.marker(latlng, { icon: icons.blue })
    .addTo(map)
    .bindPopup(popupContent);

  // Thêm vào danh sách quản lý
  savedPins.push(savedPinMarker);

  // Gắn sự kiện cho nút Unpin
  popupContent.querySelector("#unpinBtn").onclick = () => {
    map.removeLayer(savedPinMarker);
    savedPins = savedPins.filter((pin) => pin !== savedPinMarker);
  };
}

function setMarker(latlng, text) {
  if (mainMarker) map.removeLayer(mainMarker);

  mainMarker = L.marker(latlng).addTo(map);

  const popupDiv = document.createElement("div");
  popupDiv.innerHTML = `
        <div style="text-align: center; padding: 5px;"> 
            <b>${text || "Location: " + latlng.toString()}</b><br>            

            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Start
                </button>

                <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    End
                </button>
            </div>
        </div>
    `;

  mainMarker.bindPopup(popupDiv).openPopup();
  map.setView(latlng, 17);

  const [startBtn, endBtn] = popupDiv.querySelectorAll("button");

  startBtn.onclick = () =>
    setStartPoint(latlng, text || "Location: " + latlng.toString());

  endBtn.onclick = () =>
    setEndPoint(latlng, text || "Location: " + latlng.toString());
}

function createPin(latlng, name) {
  const marker = L.marker(latlng, { icon: icons.blue }).addTo(map);
  let isSaved = false;

  const popupDiv = document.createElement("div");
  popupDiv.innerHTML = `
        <div style="text-align: center; padding: 5px;"> 
            <b>${name}</b><br>
            <small style="color: #666;">${latlng.lat.toFixed(
              5
            )}, ${latlng.lng.toFixed(5)}</small>
            
            <input type="text" 
               placeholder="Take note" 
               class="note-input" 
               style="width: 90%; margin: 8px 0; padding: 4px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"> 
               <br>

            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Start
                </button>
                <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    End
                </button>
                <button style="flex: 1; background:#777; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Pin
                </button>
            </div>
        </div>
    `;

  const [startBtn, endBtn, pinBtn] = popupDiv.querySelectorAll("button");
  const noteInput = popupDiv.querySelector(".note-input");

  startBtn.onclick = () => {
    const userNote = noteInput.value || name || "(No note !)";
    setStartPoint(latlng, userNote);
  };

  endBtn.onclick = () => {
    const userNote = noteInput.value || name || "(No note !)";
    setEndPoint(latlng, userNote);
  };

  marker.on("popupclose", function (e) {
    if (!isSaved) {
      map.removeLayer(marker);
      console.log("Marker tạm thời đã bị xóa.");
    }
  });

  pinBtn.onclick = () => {
    const userNote = noteInput.value || "(No note !)";
    isSaved = true; // Đánh dấu đã lưu để không bị xóa khi đóng popup
    map.removeLayer(marker);
    marker.closePopup();
    savePinToMap(latlng, userNote);
  };

  marker.bindPopup(popupDiv).openPopup();
}

async function drawRoute() {
  if (!startMarker || !endMarker) return;

  if (routeLayer) map.removeLayer(routeLayer);
  if (poiLayer) poiLayer.clearLayers();
  togglePoiFetching(false);

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

async function fetchPOIsFromServer() {
  if (!currentPoiType || !isPoiFetchingActive) {
    return;
  }

  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const url = `/chat/pois?type=${currentPoiType}&south=${sw.lat}&west=${sw.lng}&north=${ne.lat}&east=${ne.lng}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Lỗi khi gọi server");
    }

    const pois = await response.json();

    // Xóa pin cũ và vẽ pin mới
    poiLayer.clearLayers();
    pois.forEach((poi) => {
      const latlng = L.latLng(poi.lat, poi.lng);
      const name = poi.description;

      // 1. Tạo nội dung popup bằng HTML
      const popupDiv = document.createElement("div");
      popupDiv.innerHTML = `
        <div style="text-align: center; padding: 5px;"> 
            <b>${name}</b><br>
            <small style="color: #666;">${latlng.lat.toFixed(
              5
            )}, ${latlng.lng.toFixed(5)}</small>
            
            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 10px;">
                <button class="poi-start-btn" style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Start
                </button>
                <button class="poi-end-btn" style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    End
                </button>

                <button class="poi-pin-btn" style="flex: 1; background:#777; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Pin
                </button>
            </div>
        </div>
      `;

      // 2. Tạo marker và thêm vào POI layer
      const marker = L.marker(latlng).addTo(poiLayer);

      // 3. Tìm các nút bên trong HTML
      const startBtn = popupDiv.querySelector(".poi-start-btn");
      const endBtn = popupDiv.querySelector(".poi-end-btn");
      const pinBtn = popupDiv.querySelector(".poi-pin-btn"); // <-- Thêm dòng này

      // 4. Gắn sự kiện click
      startBtn.onclick = () => {
        setStartPoint(latlng, name);
      };

      endBtn.onclick = () => {
        setEndPoint(latlng, name);
      };

      pinBtn.onclick = () => {
        savePinToMap(latlng, name);
        map.closePopup();
      };

      // 5. Gắn popup vào marker
      marker.bindPopup(popupDiv);
    });
  } catch (error) {
    console.error("Lỗi khi tải POI từ server:", error);
  }
}

function initPoiFeature(map) {
  // Tạo layer riêng cho các POI và gán vào biến toàn cục
  poiLayer = L.layerGroup().addTo(map);

  // TẠO RA CUSTOM CONTROL
  const PoiFilterControl = L.Control.extend({
    onAdd: function (map) {
      const container = L.DomUtil.create("div", "poi-filter-container");
      L.DomEvent.disableClickPropagation(container);

      // === CẬP NHẬT HTML: Thêm nút "poi-prev-btn" và "poi-next-btn" ===
      container.innerHTML = `
                <button class="poi-prev-btn"><i class="fa-solid fa-chevron-left"></i></button>

                <button class="poi-filter-btn" data-query="hospital"><i class="fa-solid fa-hospital"></i> Hospital</button>
                <button class="poi-filter-btn" data-query="notary-office"><i class="fa-solid fa-gavel"></i> Notary Office</button>
                <button class="poi-filter-btn" data-query="peoples-committee"><i class="fa-solid fa-building-columns"></i> People's Committee</button>
                <button class="poi-filter-btn" data-query="police"><i class="fa-solid fa-shield-halved"></i> Police</button>
                <button class="poi-filter-btn" data-query="medical-center"><i class="fa-solid fa-briefcase-medical"></i> Medical Center</button>
                <button class="poi-filter-btn" data-query="immigration-office"><i class="fa-solid fa-passport"></i> Immigration Office</button>
                <button class="poi-filter-btn" data-query="consulate"><i class="fa-solid fa-flag"></i> Consulate</button>
                
                <button class="poi-next-btn"><i class="fa-solid fa-chevron-right"></i></button>
            `;
      return container;
    },
    onRemove: function (map) {},
  });

  // THÊM CONTROL VÀO BẢN ĐỒ
  poiControl = new PoiFilterControl({ position: "topleft" });
  poiControl.addTo(map);

  // === PHẦN LOGIC MỚI CHO THANH CUỘN ===

  // Lấy tham chiếu đến các phần tử
  const poiContainer = poiControl.getContainer();
  const prevBtn = poiContainer.querySelector(".poi-prev-btn");
  const nextBtn = poiContainer.querySelector(".poi-next-btn");

  // 1. LOGIC KÉO-ĐỂ-CUỘN (DRAG-TO-SCROLL)
  let isDown = false;
  let startX;
  let scrollLeft;

  poiContainer.addEventListener("mousedown", (e) => {
    // Bỏ qua nếu click vào một trong các nút
    if (
      e.target.closest(".poi-filter-btn") ||
      e.target.closest(".poi-next-btn") ||
      e.target.closest(".poi-prev-btn")
    ) {
      return;
    }
    e.preventDefault();
    isDown = true;
    startX = e.pageX - poiContainer.offsetLeft;
    scrollLeft = poiContainer.scrollLeft;
  });
  poiContainer.addEventListener("mouseleave", () => {
    isDown = false;
  });
  poiContainer.addEventListener("mouseup", () => {
    isDown = false;
  });
  poiContainer.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - poiContainer.offsetLeft;
    const walk = x - startX;

    // 1. Tính toán vị trí cuộn mới
    let newScrollLeft = scrollLeft - walk;

    // 2. Lấy ra vị trí cuộn tối đa (tổng chiều rộng - chiều rộng nhìn thấy)
    const maxScrollLeft = poiContainer.scrollWidth - poiContainer.clientWidth;

    // 3. Giới hạn giá trị (không cho cuộn lố)
    if (newScrollLeft < 0) {
      newScrollLeft = 0; // Không cho cuộn lố về bên trái
    }
    if (newScrollLeft > maxScrollLeft) {
      newScrollLeft = maxScrollLeft; // Không cho cuộn lố về bên phải
    }

    // 4. Gán giá trị đã được giới hạn
    poiContainer.scrollLeft = newScrollLeft;
  });

  // 2. LOGIC CLICK CHO NÚT MŨI TÊN

  // Nút TRÁI (<)
  prevBtn.addEventListener("click", () => {
    poiContainer.scrollBy({ left: -260, behavior: "smooth" });
  });

  // Nút PHẢI (>)
  nextBtn.addEventListener("click", () => {
    poiContainer.scrollBy({ left: 260, behavior: "smooth" });
  });

  // 3. LOGIC TỰ ĐỘNG ẨN/HIỆN NÚT (Giống Google Maps)
  function updateScrollButtons() {
    if (!poiContainer) return;

    const scrollLeft = poiContainer.scrollLeft;
    const scrollWidth = poiContainer.scrollWidth;
    const clientWidth = poiContainer.clientWidth;

    // Hiển thị nút TRÁI nếu không ở đầu
    prevBtn.style.display = scrollLeft > 0 ? "inline-block" : "none";

    // Hiển thị nút PHẢI nếu chưa cuộn đến cuối
    // (Cần 1 khoảng đệm nhỏ 1px cho chính xác)
    nextBtn.style.display =
      scrollLeft + clientWidth < scrollWidth - 1 ? "inline-block" : "none";
  }

  // Gắn sự kiện "scroll" để tự cập nhật nút
  poiContainer.addEventListener("scroll", updateScrollButtons);

  // Chạy 1 lần lúc đầu để kiểm tra (dùng setTimeout để chờ DOM)
  setTimeout(updateScrollButtons, 100);

  // === HẾT PHẦN LOGIC MỚI ===

  // GẮN SỰ KIỆN CLICK CHO CÁC NÚT FILTER (Giữ nguyên code cũ của bạn)
  poiControl
    .getContainer()
    .querySelectorAll(".poi-filter-btn") // Chỉ chọn nút filter
    .forEach((button) => {
      button.addEventListener("click", () => {
        clearAllLayers();

        // B2: Kích hoạt tải POI tự động
        togglePoiFetching(true);

        // B3: Cập nhật loại POI và fetch
        const poiType = button.getAttribute("data-query");
        currentPoiType = poiType;
        fetchPOIsFromServer();

        // Highlight nút được chọn
        poiControl
          .getContainer()
          .querySelectorAll(".poi-filter-btn")
          .forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
      });
    });

  // GẮN SỰ KIỆN TỰ ĐỘNG CẬP NHẬT KHI ZOOM/PAN (Giữ nguyên)
  togglePoiFetching(isPoiFetchingActive);
}

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

  initPoiFeature(map);

  map.on("click", (e) => {
    if (flag_pin) createPin(e.latlng, "Marked Point");
    else flag_pin = true;
  });

  return { map };
}

export function invalidateMapSize() {
    if (map) map.invalidateSize();
}

export function pinLocationToMap(lat, lng, name, phone, website, distance) {
    if (!map) return;

    if(locationMarker){
        map.removeLayer(locationMarker); 
    }
    
    const latlng = L.latLng(lat, lng);
    locationMarker = L.marker(latlng, { icon: icons.yellow }).addTo(map);
    
    const popupDiv = document.createElement('div');
    const phoneLink = phone ? `<a href="tel:${phone}" style="color: #0078ff; text-decoration: none;">${phone}</a>` : 'Không có';
    const webLink = website ? `<a href="${website.startsWith('http') ? '' : '//'}${website}" target="_blank" style="color: #0078ff; text-decoration: none;">Website</a>` : '';
    const distanceText = distance ? `<br><small style="color: #666;">📍 ${distance.toFixed(1)} km</small>` : '';
    
    popupDiv.innerHTML = `
        <div style="text-align: left; padding: 8px; min-width: 180px;">
            <b style="display: block; margin-bottom: 6px; color: #0b2b3a;">${name}</b>
            <small style="color: #666; display: block; margin-bottom: 6px;">
                📞 ${phoneLink}
            </small>
            ${webLink ? `<small style="display: block; margin-bottom: 6px;">${webLink}</small>` : ''}
            ${distanceText}
            
            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 8px;">
                <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">
                    Start
                </button>
                <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">
                    End
                </button>
            </div>
        </div>
    `;

    const [startBtn, endBtn] = popupDiv.querySelectorAll('button');
    locationMarker.bindPopup(popupDiv).openPopup();
    map.setView(latlng, 17);

    startBtn.onclick = () =>
        setStartPoint(latlng, text || "Location: " + latlng.toString());

    endBtn.onclick = () =>
        setEndPoint(latlng, text || "Location: " + latlng.toString());
}
