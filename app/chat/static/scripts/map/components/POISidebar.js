import { state } from "../state.js";
import {
  updateMarkerState,
  setMainMarker,
  setPOIEndPoint,
  setPOIStartPoint,
  savePOIPinToMap,
  removeSavedPin,
  setNormalStartPoint,
} from "../services/markerUtils.js";
import { drawRoute } from "../services/routing.js";

export class PoiSidebar {
  constructor(sidebarId = "poi-sidebar") {
    this.sidebar = document.getElementById(sidebarId);
    this.activePoiId = null; // ID của POI đang mở
    this.currentData = null; // Lưu dữ liệu để dùng lại khi re-render
    this.pinMarker = null; // Marker của POI này nếu được lưu
    this.tempMarker = null;
  }

  // Mở Sidebar với dữ liệu POI
  open(poiData, linkedMarker = null, activeType = null) {
    if (!this.sidebar) return;
    if (this.tempMarker && state.map) {
      state.map.removeLayer(this.tempMarker);
      this.tempMarker = null;
    }
    if (linkedMarker) {
      this.tempMarker = linkedMarker;
    }
    this.currentData = poiData;

    const { id, image, name, category, location, phone, website } = poiData;

    // Nếu đang mở đúng POI này rồi thì không render lại
    if (this.activePoiId === id && this.sidebar.classList.contains("active")) {
      return;
    }

    this.activePoiId = id;

    // Render khung sườn chính HTML
    this.sidebar.innerHTML = `
        <div class="sidebar-header-wrapper">
             <div class="sidebar-header-img" style="background-image: url('${image}');"></div>
             <button class="sidebar-close-btn" id="btn-close-sidebar">
                <span class="material-symbols-rounded">close</span>
             </button>
        </div>

        <div class="sidebar-body-container">
            <div class="sidebar-info-header">
                <h3 class="sidebar-title">${name}</h3>
                <span class="sidebar-category">${category}</span>
            </div>

            <div class="sidebar-actions"></div>

            <div class="sidebar-details">
                <div class="info-row">
                    <div class="info-icon">
                        <span class="material-symbols-rounded">location_on</span>
                    </div>
                    <div class="info-text">${location}</div>
                </div>
                <div class="info-row">
                    <div class="info-icon">
                        <span class="material-symbols-rounded">call</span>
                    </div>
                    <div class="info-text">${phone}</div>
                </div>
                <div class="info-row">
                    <div class="info-icon">
                        <span class="material-symbols-rounded">public</span>
                    </div>
                    <div class="info-text">
                        <a href="${website}" target="_blank" class="info-link">Truy cập Website</a>
                    </div>
                </div>
            </div>
        </div>
    `;

    this.sidebar.classList.add("active");

    // Mặc định hiển thị 4 nút chức năng (Route, Start, End, Pin)
    if (activeType) {
      this.renderActiveState(activeType);
    } else {
      this.renderDefaultActions();
    }

    // Sự kiện nút đóng sidebar
    const closeBtn = this.sidebar.querySelector("#btn-close-sidebar");
    if (closeBtn) closeBtn.onclick = () => this.close();
  }

  // Đóng Sidebar
  close() {
    if (this.sidebar) {
      this.sidebar.classList.remove("active");
      this.activePoiId = null;
      this.currentData = null;
      if (this.tempMarker && state.map) {
        state.map.removeLayer(this.tempMarker);
        this.tempMarker = null;
      }
    }
  }

  // --- HÀM RENDER TRẠNG THÁI MẶC ĐỊNH (4 NÚT) ---
  renderDefaultActions() {
    const container = this.sidebar.querySelector(".sidebar-actions");
    if (!container) return;

    // Reset layout lưới về 4 cột
    container.style.gridTemplateColumns = "repeat(4, 1fr)";

    container.innerHTML = `
        <button class="action-item btn-route">
            <div class="action-icon-circle"><span class="material-symbols-rounded">directions</span></div>
            <span class="action-label">Route</span>
        </button>
        <button class="action-item btn-start">
            <div class="action-icon-circle"><span class="material-symbols-rounded">near_me</span></div>
            <span class="action-label">Start</span>
        </button>
        <button class="action-item btn-end">
            <div class="action-icon-circle"><span class="material-symbols-rounded">flag</span></div>
            <span class="action-label">End</span>
        </button>
        <button class="action-item btn-pin">
            <div class="action-icon-circle"><span class="material-symbols-rounded">bookmark</span></div>
            <span class="action-label">Pin</span>
        </button>
    `;

    // Gán sự kiện cho 4 nút
    const { latlng, name } = this.currentData;

    this.bindBtn(".btn-route", () => {
      if (this.tempMarker && state.map) {
        state.map.removeLayer(this.tempMarker);
        this.tempMarker = null;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const userLatLng = L.latLng(userLat, userLng);
        setPOIEndPoint(latlng, name, this.currentData, false);
        const nMainMarker = setMainMarker(
          [userLat, userLng],
          "You are here",
          false
        );
        nMainMarker.closePopup();
        setNormalStartPoint(userLatLng, "You are here", false);
        drawRoute();
      });
    });

    this.bindBtn(".btn-start", () => {
      if (this.tempMarker && state.map) {
        state.map.removeLayer(this.tempMarker);
        this.tempMarker = null;
      }
      setPOIStartPoint(latlng, name, this.currentData);
      this.renderActiveState("start"); // Chuyển sang giao diện 2 nút (Route & Unpin)
    });

    this.bindBtn(".btn-end", () => {
      if (this.tempMarker && state.map) {
        state.map.removeLayer(this.tempMarker);
        this.tempMarker = null;
      }
      setPOIEndPoint(latlng, name, this.currentData);
      this.renderActiveState("end"); // Chuyển sang giao diện 2 nút
    });

    this.bindBtn(".btn-pin", () => {
      if (this.tempMarker && state.map) {
        state.map.removeLayer(this.tempMarker);
        this.tempMarker = null;
      }
      this.pinMarker = savePOIPinToMap(latlng, name, this.currentData);
      this.renderActiveState("pin"); // Chuyển sang giao diện 2 nút
    });
  }

  // --- HÀM RENDER TRẠNG THÁI ĐÃ CHỌN (2 NÚT) ---
  renderActiveState(type) {
    // type: 'start', 'end', 'pin' (Để biết đang ở trạng thái nào)
    const container = this.sidebar.querySelector(".sidebar-actions");
    if (!container) return;

    // Chuyển layout thành 2 cột
    container.style.gridTemplateColumns = "1fr 1fr";

    container.innerHTML = `
        <button class="action-item btn-route">
            <div class="action-icon-circle"><span class="material-symbols-rounded">directions</span></div>
            <span class="action-label">Route</span>
        </button>
        
        <button class="action-item btn-unpin" style="color: #dc3550;">
            <div class="action-icon-circle"><span class="material-symbols-rounded">bookmark_remove</span></div>
            <span class="action-label">Unpin</span>
        </button>
    `;

    const { latlng, name } = this.currentData;

    // Gán sự kiện nút Route (giống như trên)
    this.bindBtn(".btn-route", () => {
      if (this.tempMarker && state.map) {
        state.map.removeLayer(this.tempMarker);
        this.tempMarker = null;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const userLatLng = L.latLng(userLat, userLng);
        setPOIEndPoint(latlng, name, this.currentData, false);
        const nMainMarker = setMainMarker(
          [userLat, userLng],
          "You are here",
          false
        );
        nMainMarker.closePopup();
        setNormalStartPoint(userLatLng, "You are here", false);
        drawRoute();
      });
    });

    // Gán sự kiện nút Unpin (Hủy chọn)
    this.bindBtn(".btn-unpin", () => {
      // 1. Xóa marker trên bản đồ tương ứng với type
      if (type === "start") updateMarkerState("start", null);
      if (type === "end") updateMarkerState("end", null);
      if (type === "pin") {
        removeSavedPin(this.pinMarker);
        this.pinMarker = null;
      }
      // 2. Quay trở lại giao diện 4 nút ban đầu
      this.renderDefaultActions();
      this.close();
    });
  }

  // Helper gán sự kiện click ngắn gọn
  bindBtn(selector, callback) {
    const btn = this.sidebar.querySelector(selector);
    if (btn) {
      btn.onclick = (e) => {
        if (e) L.DomEvent.stopPropagation(e);
        callback();
      };
    }
  }
}

// Export một instance duy nhất để dùng chung
export const poiSidebarUI = new PoiSidebar("poi-sidebar");
