import { state } from "../state.js";
import { clearMapState } from "../services/markerUtils.js";
import { poiSidebarUI } from "./POISidebar.js";

let poiLayer = null; // LayerGroup chứa các marker POI
let poiControl = null; // Control thanh lọc POI
let currentPoiType = null; // Loại POI đang chọn (vd: hospital)
let isPoiFetchingActive = true; // Trạng thái có đang fetch POI khi di chuyển map không
let activePoiId = null;

// Hàm xóa toàn bộ layer POI và reset state
export function clearAllLayers() {
  if (poiLayer) poiLayer.clearLayers();
  clearMapState();
  if (poiControl) {
    // Bỏ active class trên các nút filter
    poiControl
      .getContainer()
      .querySelectorAll(".poi-filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
  }
  currentPoiType = null;
  togglePoiFetching(false);
}

// Xử lý logic cuộn ngang (Scroll) cho thanh filter bằng chuột
function setupScrollLogic(poiContainer) {
  const prevBtn = poiContainer.querySelector(".poi-prev-btn");
  const nextBtn = poiContainer.querySelector(".poi-next-btn");

  let isDown = false;
  let startX;
  let scrollLeft;

  // Logic kéo thả chuột để scroll
  poiContainer.addEventListener("mousedown", (e) => {
    // Bỏ qua nếu click vào nút
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

  // Sự kiện click nút mũi tên trái/phải
  prevBtn.addEventListener("click", () => {
    poiContainer.scrollBy({ left: -260, behavior: "smooth" });
  });
  nextBtn.addEventListener("click", () => {
    poiContainer.scrollBy({ left: 260, behavior: "smooth" });
  });

  // Ẩn/hiện nút mũi tên tùy theo vị trí scroll
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

// Bật/tắt chế độ tự động tải POI khi di chuyển bản đồ
function togglePoiFetching(active) {
  const { map } = state;
  if (!map) return;
  isPoiFetchingActive = active;
  if (active) {
    map.on("moveend", fetchPOIsFromServer);
    if (currentPoiType) fetchPOIsFromServer();
  } else {
    map.off("moveend", fetchPOIsFromServer);
  }
}

function closeSidebar() {
  const sidebar = document.getElementById("poi-sidebar");
  if (sidebar) sidebar.classList.remove("active");
  activePoiId = null;
  poiSidebarUI.close();
}

// Hàm chính gọi API lấy POI dựa trên khung nhìn (bounds) của bản đồ
async function fetchPOIsFromServer() {
  const { map } = state;
  if (!currentPoiType || !isPoiFetchingActive) return;

  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  // URL API với tham số tọa độ khung nhìn
  const url = `/chat/pois?type=${currentPoiType}&south=${sw.lat}&west=${sw.lng}&north=${ne.lat}&east=${ne.lng}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Server error");
    const pois = await response.json();

    poiLayer.clearLayers(); // Xóa POI cũ

    pois.forEach((poi) => {
      const latlng = L.latLng(poi.lat, poi.lng);
      const name = poi.name;
      const currentId = poi.id;
      let rawImg = poi.img || poi.image;
      if (rawImg) {
        rawImg = rawImg.replace(/\\/g, "/"); // Fix lỗi đường dẫn ảnh Windows
      }

      // Chuẩn bị data cho Sidebar
      const sidebarData = {
        id: currentId,
        latlng: latlng,
        name: name,
        image: `/chat/pois/${rawImg}`,
        intro: poi.intro || "Địa điểm",
        location: poi.location || "Chưa có địa chỉ",
        phone: poi.phone_number || "---",
        website: poi.website || "#",
      };

      const marker = L.marker(latlng).addTo(poiLayer);

      // Khi click vào Marker POI
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        const sidebar = document.getElementById("poi-sidebar");

        activePoiId = currentId;

        // Bay đến vị trí marker
        map.flyTo(latlng, 17, { animate: true, duration: 1.2 });

        // Mở Sidebar chi tiết
        poiSidebarUI.open(sidebarData);
      });
    });
  } catch (err) {
    console.error(err);
  }
}

export function turnOffPoi() {
  if (poiLayer) poiLayer.clearLayers();
  if (poiControl) {
    const container = poiControl.getContainer();
    container.querySelectorAll(".poi-filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
  }
  poiSidebarUI.close();
  togglePoiFetching(false);
  currentPoiType = null;
}

// Hàm khởi tạo tính năng POI (được gọi từ index.js)
export function initPoiFeature() {
  const { map } = state;
  poiLayer = L.layerGroup().addTo(map);

  // Tạo Control tùy chỉnh cho thanh Filter
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
  poiControl.addTo(map);

  // Xử lý đóng Sidebar khi click map
  const sidebar = document.getElementById("poi-sidebar");
  L.DomEvent.disableClickPropagation(sidebar);
  L.DomEvent.disableScrollPropagation(sidebar);
  map.on("click", () => {
    closeSidebar();
  });

  // Kích hoạt logic scroll
  const container = poiControl.getContainer();
  setupScrollLogic(container);

  // Gán sự kiện click cho từng nút filter
  container.querySelectorAll(".poi-filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      // Reset trạng thái cũ
      if (poiLayer) poiLayer.clearLayers();
      clearMapState();
      closeSidebar();
      const poiType = button.getAttribute("data-query");
      if (currentPoiType === poiType) {
        currentPoiType = null;
        togglePoiFetching(false);
        // Update UI active button
        container
          .querySelectorAll(".poi-filter-btn")
          .forEach((btn) => btn.classList.remove("active"));
        return;
      }
      currentPoiType = poiType;

      togglePoiFetching(true);

      // Gọi API tải dữ liệu
      fetchPOIsFromServer();

      // Update UI active button
      container
        .querySelectorAll(".poi-filter-btn")
        .forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  togglePoiFetching(isPoiFetchingActive);
}
