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
    this.activeTab = "overview";
    this.currentData = null; // Lưu dữ liệu để dùng lại khi re-render
    this.pinMarker = null; // Marker của POI này nếu được lưu
    this.tempMarker = null;
    this.selectedServices = new Set();
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

    const { id, image, name, intro, location, phone, website, services } =
      poiData;

    const displayPhone = phone ? phone : "Not available";

    // Nếu đang mở đúng POI này rồi thì không render lại
    if (this.activePoiId === id && this.sidebar.classList.contains("active")) {
      return;
    }

    if (this.activePoiId !== poiData.id) {
      this.activeTab = "overview";
    }

    this.activePoiId = id;

    // Render khung sườn chính HTML
    this.sidebar.innerHTML = `
        <div class="sidebar-header-wrapper">
             <div class="sidebar-header-img" style="background-image: url('${
               image || ""
             }');"></div>
             <button class="sidebar-close-btn" id="btn-close-sidebar"><span class="material-symbols-rounded">close</span></button>
        </div>

        <div class="sidebar-tabs">
            <button class="tab-btn ${
              this.activeTab === "overview" ? "active" : ""
            }" data-tab="overview">Overview</button>
            <button class="tab-btn ${
              this.activeTab === "services" ? "active" : ""
            }" data-tab="services">Services</button>
        </div>

        <div class="sidebar-body-container">
            <div id="tab-overview" class="tab-content ${
              this.activeTab === "overview" ? "active" : ""
            }">
                <div class="sidebar-info-header">
                    <h3 class="sidebar-title">${name}</h3>
                    <span class="sidebar-category">${intro || "Hospital"}</span>
                </div>
                <div class="sidebar-actions"></div>
                <div class="sidebar-details">
                    <div class="info-row"><div class="info-icon"><span class="material-symbols-rounded">location_on</span></div><div class="info-text">${location}</div></div>
                    <div class="info-row"><div class="info-icon"><span class="material-symbols-rounded">call</span></div><div class="info-text">${
                      phone || "Not available"
                    }</div></div>
                    <div class="info-row"><div class="info-icon"><span class="material-symbols-rounded">public</span></div><div class="info-text"><a href="${website}" target="_blank" class="info-link">Website</a></div></div>
                </div>
            </div>

            <div id="tab-services" class="tab-content ${
              this.activeTab === "services" ? "active" : ""
            }">
                <div class="service-search-box">
                    <span class="material-symbols-rounded search-icon-small">search</span>
                    <input type="text" class="service-search-input" placeholder="Search services...">
                </div>
                <div id="service-list-container">
                    ${this.renderServicesList(services)} 
                </div>
            </div>
        </div>
    `;

    this.sidebar.classList.add("active");

    this.setupTabs();

    const searchInput = this.sidebar.querySelector(".service-search-input");
    if (searchInput) {
      // Reset ô tìm kiếm mỗi khi mở sidebar mới
      searchInput.value = "";
      this.selectedServices.clear(); // Reset lựa chọn tiền

      // Sự kiện nhập liệu
      searchInput.oninput = (e) => {
        this.handleServiceSearch(e.target.value);
      };
    }

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

  getServiceMetadata(name) {
    if (!name)
      return {
        group: "General Services",
        icon: "local_hospital",
        colorClass: "icon-gray",
      };

    const n = name.toLowerCase();

    // 1. Group: Chẩn đoán hình ảnh (Imaging)
    // Cập nhật thêm: EEG (điện não), Bone density/Osteoporosis (đo loãng xương)
    if (
      n.match(
        /x-ray|radiography|mri|magnetic|ct scan|tomography|ultrasound|sonography|endoscopy|ecg|electrocardiogram|eeg|electroencephalogram|bone|density|osteoporosis/
      )
    ) {
      return {
        group: "Diagnostic Imaging",
        icon: "radiology",
        colorClass: "icon-blue",
      };
    }

    // 2. Group: Xét nghiệm (Laboratory)
    // Cập nhật thêm: Lipid (mỡ máu), Urea (Ure), Cell/Cytology (Tế bào)
    if (
      n.match(
        /test|blood|urine|biochemical|hematology|glucose|sugar|cholesterol|lipid|liver|kidney|renal|analysis|urea|cell|cytology/
      )
    ) {
      return {
        group: "Laboratory & Tests",
        icon: "biotech",
        colorClass: "icon-red",
      };
    }

    // 3. Group: Khám & Tư vấn (Consultation)
    // Khớp với: Khám bệnh, cấp cứu, hội chẩn
    if (
      n.match(
        /consultation|examination|exam|check-up|clinical|emergency|diagnosis/
      )
    ) {
      return {
        group: "Consultation",
        icon: "stethoscope",
        colorClass: "icon-green",
      };
    }

    // 4. Group: Răng Hàm Mặt (Dental)
    // Khớp với: Nhổ, lấy cao, trám, hàn
    if (
      n.match(
        /dental|tooth|teeth|extraction|filling|scaling|dentist|root canal/
      )
    ) {
      return {
        group: "Dental Care",
        icon: "dentistry",
        colorClass: "icon-teal",
      };
    }

    // 5. Group: Thủ thuật & Phẫu thuật (Surgery/Procedures)
    // Khớp với: Phẫu thuật, bó bột (cast), khâu (suture), thay băng (dressing)
    if (
      n.match(/surgery|operation|procedure|suture|cast|dressing|wound|incision/)
    ) {
      return {
        group: "Procedures & Surgery",
        icon: "medical_services",
        colorClass: "icon-purple",
      };
    }

    // 6. Group: Nội trú (Inpatient)
    // Khớp với: Giường, lưu bệnh
    if (n.match(/bed|room|inpatient|ward|overnight/)) {
      return {
        group: "Inpatient Services",
        icon: "bed",
        colorClass: "icon-orange",
      };
    }

    // Mặc định
    return {
      group: "General Services",
      icon: "local_hospital",
      colorClass: "icon-gray",
    };
  }

  // --- 3. LOGIC MÀU GIÁ ---
  getPriceInfo(priceStr) {
    const cleanString = String(priceStr).replace(/[^0-9]/g, "");
    const priceVal = parseFloat(cleanString);

    if (isNaN(priceVal)) return { class: "price-normal", val: priceStr };
    const formatted = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(priceVal);

    if (priceVal < 500000) return { class: "price-low", val: formatted };
    if (priceVal < 3000000) return { class: "price-med", val: formatted };
    return { class: "price-high", val: formatted };
  }

  // --- 4. RENDER GIAO DIỆN ACCORDION ---
  renderServicesList(services) {
    // Lưu ý: Không clear selectedServices ở đây nữa để giữ trạng thái khi switch qua lại
    if (!services || services.length === 0) {
      return `<div class="empty-state"><span class="material-symbols-rounded" style="font-size:32px">assignment_late</span><br>No services listed</div>`;
    }

    // A. Gom nhóm (Giữ nguyên logic cũ của bạn)
    const groups = {};
    const sortOrder = [
      "Consultation",
      "Diagnostic Imaging",
      "Laboratory & Tests",
      "Dental Care",
      "Surgery & Procedures",
      "General Services",
    ];

    services.forEach((svc) => {
      const meta = this.getServiceMetadata(svc.service_name);
      if (!groups[meta.group]) groups[meta.group] = [];
      svc._meta = meta;
      groups[meta.group].push(svc);
    });

    // B. Tạo HTML
    let html = "";
    const allKeys = [...new Set([...sortOrder, ...Object.keys(groups)])];

    allKeys.forEach((groupName) => {
      const list = groups[groupName];
      if (list && list.length > 0) {
        html += `
            <details class="service-group-accordion">
                <summary class="group-summary">
                    <span class="group-name">${groupName}</span>
                    <span class="group-badge">${list.length}</span>
                    <span class="material-symbols-rounded arrow-icon">expand_more</span>
                </summary>
                <div class="group-content">
                    ${list.map((svc) => this.renderServiceRow(svc)).join("")}
                </div>
            </details>
        `;
      }
    });

    html += this.renderFooterHTML();
    return html;
  }

  toggleService(checkbox) {
    // SỬA: Lấy Tên dịch vụ (data-id) thay vì Giá tiền
    const serviceName = checkbox.dataset.id;

    if (checkbox.checked) {
      this.selectedServices.add(serviceName);
    } else {
      this.selectedServices.delete(serviceName);
    }

    // Tính tổng tiền thì vẫn duyệt qua DOM để lấy giá, nên không ảnh hưởng
    this.updateFooterUI();
  }

  // Cách tính tổng chuẩn hơn: Duyệt tất cả checkbox đang checked
  updateFooterUI() {
    const footer = this.sidebar.querySelector("#cost-footer");

    // Kiểm tra xem có dịch vụ nào được chọn không dựa trên Set
    if (this.selectedServices.size === 0) {
      footer.classList.remove("visible");
      return;
    }

    footer.classList.add("visible");

    // Lọc ra các object dịch vụ từ dữ liệu gốc dựa trên Set các tên đã chọn
    // Lưu ý: this.currentData.services chứa toàn bộ dịch vụ
    const selectedItems = (this.currentData.services || []).filter((svc) =>
      this.selectedServices.has(svc.service_name)
    );

    let total = 0;
    selectedItems.forEach((svc) => {
      // Parse giá tiền từ dữ liệu gốc (giống logic cũ của bạn)
      const p = parseFloat(String(svc.price).replace(/[^0-9]/g, "")) || 0;
      total += p;
    });

    const totalStr = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(total);

    // Cập nhật text
    const countDisplay = this.sidebar.querySelector("#count-display");
    const totalDisplay = this.sidebar.querySelector("#total-display");

    if (countDisplay)
      countDisplay.innerText = `${this.selectedServices.size} services`;
    if (totalDisplay) totalDisplay.innerText = totalStr;
  }

  renderServiceRow(svc) {
    const priceInfo = this.getPriceInfo(svc.price);
    const vipIcon = svc.is_vip
      ? `<span class="material-symbols-rounded vip-star">star</span>`
      : ``;

    // Kiểm tra xem dịch vụ này đã được tick chưa để thêm attribute 'checked'
    // Lưu ý: Logic selectedServices của bạn đang lưu theo Price, nên ta check theo Price
    const cleanPrice =
      parseFloat(String(svc.price).replace(/[^0-9]/g, "")) || 0;
    const isChecked = this.selectedServices.has(svc.service_name)
      ? "checked"
      : "";

    return `
      <div class="service-row">
          <input type="checkbox" class="svc-checkbox" 
              data-id="${svc.service_name}" 
              data-price="${svc.price}"
              ${isChecked}
              onchange="poiSidebarUI.toggleService(this)">
          
          <div class="svc-icon-box ${svc._meta.colorClass}">
              <span class="material-symbols-rounded">${svc._meta.icon}</span>
          </div>
          <div class="svc-info">
              <div class="svc-name">${vipIcon}${svc.service_name}</div>
              <div class="svc-price ${priceInfo.class}">${priceInfo.val}</div>
          </div>
      </div>
    `;
  }

  // Helper: Tạo HTML Footer
  renderFooterHTML() {
    return `
        <div id="cost-footer" class="cost-estimator-footer">
            <div class="cost-content">
                <div class="cost-header">
                    <span class="material-symbols-rounded cost-icon">receipt_long</span>
                    <span class="cost-label">Estimated Cost</span>
                </div>
                <div class="cost-value">
                    <span class="total-price-text" id="total-display">0 ₫</span>
                    <span class="item-count-badge" id="count-display">0 services</span>
                </div>
            </div>
        </div>
      `;
  }

  renderSearchResults(services) {
    if (!services || services.length === 0) {
      return (
        `<div class="empty-state">No matching services found</div>` +
        this.renderFooterHTML()
      );
    }

    let html = `<div class="search-results-flat" style="padding: 10px 16px;">`;

    // Duyệt và vẽ từng dòng
    services.forEach((svc) => {
      // Đảm bảo có metadata
      if (!svc._meta) svc._meta = this.getServiceMetadata(svc.service_name);
      html += this.renderServiceRow(svc);
    });

    html += `</div>`;
    html += this.renderFooterHTML();
    return html;
  }

  handleServiceSearch(keyword) {
    const container = this.sidebar.querySelector("#service-list-container");
    const allServices = this.currentData.services || [];

    // Chuẩn hóa từ khóa
    const term = keyword ? keyword.toLowerCase().trim() : "";

    if (term === "") {
      // TRƯỜNG HỢP 1: Ô tìm kiếm trống -> Quay về GROUP view
      container.innerHTML = this.renderServicesList(allServices);
    } else {
      // TRƯỜNG HỢP 2: Có từ khóa -> Filter & Render FLAT view
      const filtered = allServices.filter((svc) =>
        (svc.service_name || "").toLowerCase().includes(term)
      );
      container.innerHTML = this.renderSearchResults(filtered);
    }

    // Quan trọng: Cập nhật lại trạng thái Footer (hiện tiền) nếu đang có item được chọn
    this.updateFooterUI();
  }

  setupTabs() {
    const tabs = this.sidebar.querySelectorAll(".tab-btn");
    const contents = this.sidebar.querySelectorAll(".tab-content");

    tabs.forEach((tab) => {
      tab.onclick = () => {
        // Cập nhật biến trạng thái
        this.activeTab = tab.dataset.tab;

        // UI Update: Xóa active cũ
        tabs.forEach((t) => t.classList.remove("active"));
        contents.forEach((c) => c.classList.remove("active"));

        // UI Update: Active mới
        tab.classList.add("active");
        const targetId = `tab-${this.activeTab}`;
        const targetContent = this.sidebar.querySelector(`#${targetId}`);
        if (targetContent) targetContent.classList.add("active");
      };
    });
  }

  // Đóng Sidebar
  close() {
    if (this.sidebar) {
      this.sidebar.classList.remove("active");
      this.activePoiId = null;
      this.currentData = null;
      this.activeTab = "overview";
      this.selectedServices.clear();
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
window.poiSidebarUI = poiSidebarUI;
