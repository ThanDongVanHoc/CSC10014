/**
 * js/map/components/MedicalMap.js
 * FINAL VERSION: Dual UI (Popup + Sidebar) + DB Integration
 */
import { state } from "../state.js";
import { MedicalService } from "../services/medicalService.js";
import { poiSidebarUI } from "./POISidebar.js"; 
import { findPlace } from "./POIManager.js"; // Import hàm vừa nâng cấp

let medicalLayer = null;
let isMedicalMode = false;
let toggleBtn = null;

// Demo Data (Dùng làm mốc tọa độ và fallback nếu DB chưa có dữ liệu)
const HOSPITALS = [
  { id: "loc_1", name: "Bệnh viện Chợ Rẫy", lat: 10.755, lng: 106.665, type: "General Hospital" },
  { id: "loc_2", name: "Đại học Y Dược", lat: 10.752, lng: 106.660, type: "University Hospital" },
  { id: "loc_3", name: "Bệnh viện Từ Dũ", lat: 10.768, lng: 106.678, type: "Maternity Hospital" },
  { id: "loc_4", name: "Nhi Đồng 1", lat: 10.770, lng: 106.668, type: "Children's Hospital" },
  { id: "loc_5", name: "Phòng khám Quốc tế", lat: 10.760, lng: 106.690, type: "Private Clinic" },
];

export function initMedicalHeatmap() {
  const controlsContainer = document.querySelector(".map-controls");
  if (!controlsContainer) return;

  toggleBtn = document.createElement("button");
  toggleBtn.className = "map-btn map-btn-medical";
  toggleBtn.title = "Medical Heatmap";
  toggleBtn.innerHTML = `
    <i class="fas fa-heartbeat"></i>
    <span class="btn-tooltip">Medical Map</span>
  `;
  
  toggleBtn.onclick = toggleMedicalMode;
  controlsContainer.insertBefore(toggleBtn, controlsContainer.firstChild);
}

async function toggleMedicalMode() {
  isMedicalMode = !isMedicalMode;
  const { map } = state;

  if (isMedicalMode) {
    toggleBtn.classList.add("active");
    toggleBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i>`;

    if (!medicalLayer) {
      medicalLayer = L.layerGroup().addTo(map);
    } else {
      medicalLayer.addTo(map);
    }

    await renderMedicalMarkers();

    toggleBtn.innerHTML = `
        <i class="fas fa-heartbeat"></i>
        <span class="btn-tooltip">Medical Map</span>
    `;
  } else {
    toggleBtn.classList.remove("active");
    if (medicalLayer) map.removeLayer(medicalLayer);
  }
}

async function renderMedicalMarkers() {
  if (!medicalLayer) return;
  medicalLayer.clearLayers();

  for (const demoHospital of HOSPITALS) {
    // CHẠY SONG SONG 3 REQUEST ĐỂ TỐI ƯU TỐC ĐỘ
    const [prices, stats, dbInfo] = await Promise.all([
        MedicalService.getHospitalPrices(demoHospital.id).catch(() => ({ items: [] })),
        MedicalService.getRealTimeStats(demoHospital.id),
        findPlace(demoHospital.name, demoHospital.lat, demoHospital.lng) // Tìm trong DB bằng tọa độ
    ]);

    // GỘP DỮ LIỆU: Ưu tiên dữ liệu từ DB, nếu không có thì dùng demo
    const hospital = {
        ...demoHospital, // Dữ liệu cơ bản
        address: dbInfo?.location || demoHospital.address || "Đang cập nhật địa chỉ...",
        phone: dbInfo?.phone_number || demoHospital.phone || "---",
        website: dbInfo?.website || "#",
        image: dbInfo?.img || "https://via.placeholder.com/300x200?text=No+Image", // Ảnh từ DB
        intro: dbInfo?.intro || demoHospital.type // Intro từ DB
    };

    const color = stats.colorCode;

    // 1. Heatmap Zone
    L.circle([hospital.lat, hospital.lng], {
      color: color,
      fillColor: color,
      fillOpacity: 0.25,
      opacity: 0.6,
      radius: 150 + (stats.waitTimeMinutes * 2),
      weight: 2,
      className: 'med-pulse-anim'
    }).addTo(medicalLayer);

    // 2. Custom Marker Icon
    const iconHtml = `
      <div class="med-marker-wrapper">
        <div class="med-pin" style="background-color: ${color}; border-color: ${stats.demand === 'High Demand' ? '#fee2e2' : '#fff'}">
          <i class="fas fa-hospital-user" style="color: white; font-size: 18px;"></i>
        </div>
        <div class="med-badge-time" style="color: ${color}; border-color: ${color}">
          ${stats.waitTimeMinutes}m
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: "med-marker-container",
      iconSize: [46, 56],
      iconAnchor: [23, 56],
      popupAnchor: [0, -60] // Đẩy popup lên cao để không che marker
    });

    const marker = L.marker([hospital.lat, hospital.lng], { icon: customIcon }).addTo(medicalLayer);

    // 3. POPUP (Hiển thị Giá & Stats)
    const popupContent = buildHorizontalPopup(hospital, stats, prices, color);
    
    marker.bindPopup(popupContent, { 
      maxWidth: 500, 
      className: "med-custom-popup",
      closeButton: false,
      autoPan: true
    });

    // Event listeners cho nút trong Popup
    marker.on('popupopen', () => {
      const routeBtn = document.getElementById(`btn-route-${hospital.id}`);
      const bookBtn = document.getElementById(`btn-book-${hospital.id}`);

      if (routeBtn) {
        routeBtn.addEventListener('click', () => {
          handleRouteClick(hospital);
        });
      }
      if (bookBtn) {
        bookBtn.addEventListener('click', () => {
          alert(`Booking appointment at ${hospital.name}...`);
        });
      }
    });

    // 4. SIDEBAR (Hiển thị Info chi tiết từ DB)
    marker.on('click', (e) => {
        // Không stopPropagation để Popup vẫn mở
        const { map } = state;

        // A. FlyTo
        map.flyTo([hospital.lat + 0.003, hospital.lng], 16, {
            animate: true,
            duration: 1.5
        });

        // B. Chuẩn bị data cho Sidebar (Ưu tiên dùng data từ DB đã gộp ở trên)
        // Fix đường dẫn ảnh nếu cần (giống trong POIManager)
        let rawImg = hospital.image;
        if (rawImg && !rawImg.startsWith("http")) {
             rawImg = `/chat/pois/${rawImg.replace(/\\/g, "/")}`;
        }

        const poiData = {
            id: hospital.id, // ID logic
            name: hospital.name,
            intro: hospital.intro,
            image: rawImg,
            location: hospital.address,
            phone: hospital.phone,
            website: hospital.website,
            latlng: L.latLng(hospital.lat, hospital.lng)
        };

        // C. Mở Sidebar
        // Truyền null vào tham số thứ 2 để Sidebar KHÔNG tự động ẩn/quản lý marker này
        poiSidebarUI.open(poiData, null);
    });
  }
}

// --- UTILS (Giữ nguyên logic render UI) ---

function buildHorizontalPopup(hospital, stats, prices, color) {
  const emergencyPrice = prices.items.find(i => i.service === "Cấp cứu")?.price || 0;
  const xrayPrice = prices.items.find(i => i.service === "X-Quang")?.price || 0;
  
  const statusHtml = stats.isOpen !== false // Giả định true nếu không có data
    ? `<span class="med-status open"><i class="fas fa-clock"></i> Open Now</span>`
    : `<span class="med-status closed"><i class="fas fa-door-closed"></i> Closed</span>`;

  return `
    <div class="med-popup-card">
      <div class="med-popup-left">
        <div>
          <div class="med-hospital-icon" style="background: ${color}">
            <i class="fas fa-hospital-alt"></i>
          </div>
          <div class="med-info">
            <div class="med-type">${hospital.type}</div>
            <h3>${hospital.name}</h3>
            <div class="med-rating">
              ${renderStars(stats.rating || 4.5)} 
              <span style="color:#64748b; font-weight:400; margin-left:4px">(${stats.rating || 4.5})</span>
            </div>
          </div>
        </div>
        ${statusHtml}
      </div>

      <div class="med-popup-right">
        <div class="med-stats-row">
          <div class="med-stat-box">
             <span class="med-stat-label">Avg Wait</span>
             <span class="med-stat-value" style="color:${color}">${stats.waitTimeMinutes} min</span>
          </div>
          <div class="med-stat-box">
             <span class="med-stat-label">Distance</span>
             <span class="med-stat-value">${stats.distanceKm} km</span>
          </div>
        </div>

        <div class="med-prices">
          <div class="med-price-item">
            <span>🚑 Emergency</span>
            <span class="med-price-val">${emergencyPrice.toLocaleString()} ₫</span>
          </div>
          <div class="med-price-item">
            <span>🩻 X-Ray Scan</span>
            <span class="med-price-val">${xrayPrice.toLocaleString()} ₫</span>
          </div>
          <div class="med-price-item">
            <span>🩺 Consultation</span>
            <span class="med-price-val">150.000 ₫</span>
          </div>
        </div>

        <div class="med-actions">
          <button id="btn-route-${hospital.id}" class="med-btn med-btn-route">
            <i class="fas fa-directions"></i> Route
          </button>
          <button id="btn-book-${hospital.id}" class="med-btn med-btn-book" style="background:${color}">
            Book Now
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) stars += '<i class="fas fa-star"></i>';
    else if (i - 0.5 === rating) stars += '<i class="fas fa-star-half-alt"></i>';
    else stars += '<i class="far fa-star" style="color:#cbd5e1"></i>';
  }
  return stars;
}

function handleRouteClick(destination) {
  const { map } = state;
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        if (typeof L.Routing !== 'undefined') {
            L.Routing.control({
                waypoints: [
                    L.latLng(userLat, userLng),
                    L.latLng(destination.lat, destination.lng)
                ],
                routeWhileDragging: true,
                lineOptions: {
                    styles: [{color: '#3b82f6', opacity: 0.8, weight: 6}]
                }
            }).addTo(map);
        } else {
           const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
           window.open(url, '_blank');
        }
      },
      (error) => {
        alert("Unable to retrieve your location.");
      }
    );
  } else {
    alert("Geolocation is not supported.");
  }
}