import {
  map,
  savePinToMap,
  setStartPoint,
  setEndPoint,
  clearMapState,
  hasStartMarker, // <--- Import mới
  hasEndMarker, // <--- Import mới
} from "./map.js";

// ... (Giữ nguyên code phần đầu: biến, clearAllLayers, setupScrollLogic, togglePoiFetching)
let poiLayer = null;
let poiControl = null;
let currentPoiType = null;
let isPoiFetchingActive = true;

function clearAllLayers() {
  if (poiLayer) poiLayer.clearLayers();
  clearMapState();
  if (poiControl) {
    poiControl
      .getContainer()
      .querySelectorAll(".poi-filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
  }
  currentPoiType = null;
  togglePoiFetching(false);
}

// ... (Giữ nguyên setupScrollLogic, togglePoiFetching)
function setupScrollLogic(poiContainer) {
  // Code cũ giữ nguyên
  const prevBtn = poiContainer.querySelector(".poi-prev-btn");
  const nextBtn = poiContainer.querySelector(".poi-next-btn");

  let isDown = false;
  let startX;
  let scrollLeft;

  poiContainer.addEventListener("mousedown", (e) => {
    if (
      e.target.closest(".poi-filter-btn") ||
      e.target.closest(".poi-next-btn") ||
      e.target.closest(".poi-prev-btn")
    )
      return;
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
    let newScrollLeft = scrollLeft - walk;
    const maxScrollLeft = poiContainer.scrollWidth - poiContainer.clientWidth;
    if (newScrollLeft < 0) newScrollLeft = 0;
    if (newScrollLeft > maxScrollLeft) newScrollLeft = maxScrollLeft;
    poiContainer.scrollLeft = newScrollLeft;
  });

  prevBtn.addEventListener("click", () => {
    poiContainer.scrollBy({ left: -260, behavior: "smooth" });
  });
  nextBtn.addEventListener("click", () => {
    poiContainer.scrollBy({ left: 260, behavior: "smooth" });
  });

  function updateScrollButtons() {
    if (!poiContainer) return;
    const scrollLeft = poiContainer.scrollLeft;
    const scrollWidth = poiContainer.scrollWidth;
    const clientWidth = poiContainer.clientWidth;

    if (scrollWidth <= clientWidth + 10) {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      return;
    }
    prevBtn.style.display = scrollLeft > 10 ? "inline-block" : "none";
    nextBtn.style.display =
      scrollLeft + clientWidth < scrollWidth - 10 ? "inline-block" : "none";
  }

  poiContainer.addEventListener("scroll", updateScrollButtons);
  setTimeout(updateScrollButtons, 100);

  const resizeObserver = new ResizeObserver(() => {
    updateScrollButtons();
  });
  resizeObserver.observe(poiContainer);
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

async function fetchPOIsFromServer() {
  if (!currentPoiType || !isPoiFetchingActive) return;

  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const url = `/chat/pois?type=${currentPoiType}&south=${sw.lat}&west=${sw.lng}&north=${ne.lat}&east=${ne.lng}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Lỗi khi gọi server");
    const pois = await response.json();

    poiLayer.clearLayers();
    pois.forEach((poi) => {
      const latlng = L.latLng(poi.lat, poi.lng);
      const name = poi.description;
      const popupDiv = document.createElement("div");

      // ... (Giữ nguyên HTML popup)
      popupDiv.innerHTML = `
        <div style="text-align: center; padding: 5px;"> 
            <b>${name}</b><br>
            <small style="color: #666;">${latlng.lat.toFixed(
              5
            )}, ${latlng.lng.toFixed(5)}</small>
            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 10px;">
                <button class="poi-start-btn" style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Start</button>
                <button class="poi-end-btn" style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">End</button>
                <button class="poi-pin-btn" style="flex: 1; background:#777; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Pin</button>
            </div>
        </div>
      `;

      const marker = L.marker(latlng).addTo(poiLayer);

      // === LOGIC MỚI ===

      // 1. Khi bấm Start
      popupDiv.querySelector(".poi-start-btn").onclick = () => {
        // Tạo marker Cờ Xanh chính thức
        setStartPoint(latlng, name);

        // Xóa marker POI này đi (để người dùng thấy nó "biến" thành cờ Xanh)
        poiLayer.removeLayer(marker);

        // Nếu đã có End -> nghĩa là đã vẽ được đường -> Xóa sạch các POI thừa
        if (hasEndMarker()) {
          poiLayer.clearLayers();
          togglePoiFetching(false); // Tắt tự động tải thêm POI khi di chuyển map
        }
      };

      // 2. Khi bấm End
      popupDiv.querySelector(".poi-end-btn").onclick = () => {
        // Tạo marker Cờ Đỏ chính thức
        setEndPoint(latlng, name);

        // Xóa marker POI này đi
        poiLayer.removeLayer(marker);

        // Nếu đã có Start -> nghĩa là đã vẽ được đường -> Xóa sạch các POI thừa
        if (hasStartMarker()) {
          poiLayer.clearLayers();
          togglePoiFetching(false);
        }
      };

      // =================

      popupDiv.querySelector(".poi-pin-btn").onclick = () => {
        savePinToMap(latlng, name);
        map.closePopup();
      };
      marker.bindPopup(popupDiv);
    });
  } catch (error) {
    console.error("Lỗi khi tải POI từ server:", error);
  }
}

// ... (Giữ nguyên initPoiFeature)
export function initPoiFeature(mapInstance) {
  // ... (Giữ nguyên nội dung initPoiFeature)
  poiLayer = L.layerGroup().addTo(mapInstance);

  const PoiFilterControl = L.Control.extend({
    onAdd: function (map) {
      const container = L.DomUtil.create("div", "poi-filter-container");
      L.DomEvent.disableClickPropagation(container);
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

  poiControl = new PoiFilterControl({ position: "topleft" });
  poiControl.addTo(mapInstance);

  const container = poiControl.getContainer();
  setupScrollLogic(container);

  container.querySelectorAll(".poi-filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      clearAllLayers();
      togglePoiFetching(true);
      const poiType = button.getAttribute("data-query");
      currentPoiType = poiType;
      fetchPOIsFromServer();
      container
        .querySelectorAll(".poi-filter-btn")
        .forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  togglePoiFetching(isPoiFetchingActive);
}

export { clearAllLayers };
