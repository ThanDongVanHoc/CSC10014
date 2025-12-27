/**
 * js/map/components/MedicalMap.js
 * FINAL VERSION: Dual UI (Popup + Sidebar) + DB Integration + Backend Enriched Data
 *
 * Added: openChatWithPayload(payload) — posts payload to existing chat tab or opens a new chat tab
 */
import { state } from "../state.js";
import { MedicalService } from "../services/medicalService.js";
import { poiSidebarUI } from "./POISidebar.js"; 

let medicalLayer = null;
let isMedicalMode = false;
let toggleBtn = null;

// Helper: Map màu từ Backend (Text) sang Frontend (Hex)
const getColorHex = (colorName) => {
  const mapping = {
    'Red': '#ef4444',    // Đỏ - Khẩn cấp
    'Orange': '#f59e0b', // Cam - Trung bình
    'Green': '#10b981',  // Xanh - Ổn định
    'Yellow': '#eab308'  // Vàng
  };
  return mapping[colorName] || '#3b82f6'; // Mặc định xanh dương
};

// ----------------- NEW: Cross-tab helper -----------------
/**
 * Try to append payload to an already-open chat tab:
 *  - If a window named 'medical_chat' exists, postMessage(payload) to it and focus
 *  - Otherwise, store payload in localStorage.pending_medical_message and open /chat in a window named 'medical_chat'
 *
 * payload should be JSON-serializable (patient booking object, hospital info, etc.)
 */
export function openChatWithPayload(payload) {
  try {
    // Ensure payload is serializable
    const safePayload = JSON.parse(JSON.stringify(payload || {}));

    // Try to get existing named window (this returns a Window object if an existing window/tab used the same name)
    const existing = window.open("", "medical_chat");

    if (existing && !existing.closed) {
      // Focus it
      try { existing.focus(); } catch (e) {}
      // Use postMessage (same-origin) so chat can process immediately
      try {
        existing.postMessage({ type: "medical_payload", payload: safePayload }, window.location.origin);
      } catch (err) {
        // If postMessage fails, fallback to localStorage + storage event
        localStorage.setItem("pending_medical_message", JSON.stringify(safePayload));
        // inform the existing window by focusing it (it will also check localStorage on focus/load)
        try { existing.focus(); } catch (e) {}
      }
    } else {
      // No existing chat window — write to localStorage and open a new named tab so the new tab will pick it up
      try { localStorage.setItem("pending_medical_message", JSON.stringify(safePayload)); } catch (e) {}
      // Open the chat page in a named window so later calls can reuse it
      window.open("/chat", "medical_chat");
    }
  } catch (err) {
    console.error("openChatWithPayload failed:", err);
    // last fallback: open chat and let user know
    window.open("/chat", "medical_chat");
  }
}
// ----------------- END new helper -----------------

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

export async function toggleMedicalMode() {
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
  
  const dataElement = document.getElementById('medical-results-data');
  let hospitalsToRender = [];
  
  // 1. ĐỌC DỮ LIỆU TỪ BACKEND (Đã có sẵn lat, lng, address...)
  if (dataElement) {
    try {
      const sessionData = JSON.parse(dataElement.textContent);
      if (sessionData.hospitals && sessionData.hospitals.length > 0) {
        hospitalsToRender = sessionData.hospitals;
        console.log(`Loaded ${hospitalsToRender.length} hospitals from AI Session.`);
      }
    } catch (e) {
      console.warn("Could not parse session medical data.");
    }
  }

  if (hospitalsToRender.length === 0) {
      console.log("No hospitals found.");
      return;
  }

  // 2. DUYỆT VÀ VẼ (Đã tối ưu: Không tìm tọa độ nữa)
  for (const h of hospitalsToRender) {
    // Nếu dữ liệu thiếu tọa độ thì bỏ qua (An toàn)
    if (!h.lat || !h.lng) continue;

    // A. Lấy giá dịch vụ (Vẫn cần gọi mock service hoặc API riêng cho giá)
    // Dùng catch để dù lỗi lấy giá cũng không chặn việc vẽ map
    const prices = await MedicalService.getHospitalPrices(h.id).catch(() => ({ items: [] }));

    // B. Chuẩn bị dữ liệu hiển thị (Mapping từ UI Context của Backend)
    const ui = h.ui_context || {};
    
    // Logic màu sắc
    const color = getColorHex(ui.heatmap_color);
    
    // Logic Stats (Dùng dữ liệu Backend trả về)
    const stats = {
        waitTimeDisplay: ui.wait_time_display || "N/A",
        distanceDisplay: ui.distance_display || "N/A",
        urgency: ui.urgency_tag || "Normal",
        rating: h.final_score || 0, // Điểm AI chấm
        isOpen: true // Giả định
    };

    // Logic Thông tin (Dùng dữ liệu DB đã Enrich)
    const hospitalInfo = {
        ...h,
        image: h.image || "https://cdn.bookingcare.vn/fo/w828/2019/01/10/162817-benh-vien-tu-du.jpg",
        address: h.address || h.location || "On update ...",
        intro: (h.description || h.intro || "No description available.").toLowerCase()
    };

    // C. VẼ VÒNG TRÒN (Heatmap Circle)
    const waitNum = parseInt(stats.waitTimeDisplay) || 30;
    L.circle([h.lat, h.lng], {
      color: color,
      fillColor: color,
      fillOpacity: 0.15,
      opacity: 0.5,
      radius: 100 + (waitNum * 1.5), 
      weight: 1,
      className: 'med-pulse-anim'
    }).addTo(medicalLayer);

    // D. CUSTOM MARKER ICON
    const iconHtml = `
      <div class="med-marker-wrapper">
        <div class="med-pin" style="background-color: ${color}; border-color: ${stats.urgency === 'HIGH' ? '#fee2e2' : '#fff'}">
          <i class="fas fa-hospital-user" style="color: white; font-size: 18px;"></i>
        </div>
        <div class="med-badge-time" style="color: ${color}; border-color: ${color}">
          ${stats.rating}
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: "med-marker-container",
      iconSize: [46, 56],
      iconAnchor: [23, 56],
      popupAnchor: [0, -60]
    });

    const marker = L.marker([h.lat, h.lng], { icon: customIcon }).addTo(medicalLayer);

    // E. POPUP (Hiển thị Giá & Stats)
    const popupContent = buildHorizontalPopup(hospitalInfo, stats, prices, color);
    
    marker.bindPopup(popupContent, { 
      maxWidth: 450, 
      className: "med-custom-popup",
      closeButton: false,
      autoPan: true
    });

    // Event listeners cho nút trong Popup
    marker.on('popupopen', () => {
      const routeBtn = document.getElementById(`btn-route-${h.id}`);
      const bookBtn = document.getElementById(`btn-book-${h.id}`);

      if (routeBtn) {
        routeBtn.addEventListener('click', () => {
          handleRouteClick(h);
        });
      }
      if (bookBtn) {
        // Replace the old booking behavior with opening/appending to chat
        bookBtn.addEventListener('click', async () => {
            // 1. Lưu lại nội dung cũ của nút để khôi phục sau này
            const originalContent = bookBtn.innerHTML;
            
            try {
                bookBtn.disabled = true;
                bookBtn.innerHTML = `<span class="spinner"></span> Loading...`; // Bạn có thể thêm CSS cho class .spinner
                bookBtn.style.cursor = 'not-allowed';

                const response = await fetch("/api/get-all-patient-data");

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // 3. Mở chat với dữ liệu lấy được
                openChatWithPayload(data);

            } catch (error) {
                console.error("Booking error:", error);
                alert("Error ");
            } finally {
                bookBtn.disabled = false;
                bookBtn.innerHTML = originalContent;
                bookBtn.style.cursor = 'pointer';
            }
        });
      }
    });

    // F. SIDEBAR (Hiển thị chi tiết khi Click Marker)
    marker.on('click', (e) => {
        const { map } = state;
        
        // FlyTo nhẹ nhàng
        map.flyTo([h.lat + 0.002, h.lng], 16, { animate: true, duration: 1.2 });

        // Chuẩn bị data cho Sidebar
        let rawImg = hospitalInfo.image;
        if (rawImg && !rawImg.startsWith("http") && !rawImg.startsWith("/")) {
             rawImg = `/map/pois/${rawImg.replace(/\\/g, "/")}`;
        }

        const poiData = {
            id: h.id,
            name: h.name,
            intro: hospitalInfo.intro,
            image: rawImg,
            location: hospitalInfo.address,
            phone: hospitalInfo.phone || "---",
            website: hospitalInfo.website || "#",
            latlng: L.latLng(h.lat, h.lng),
            services: h.services || [],
        };

        // Mở Sidebar
        poiSidebarUI.open(poiData, null);
    });
  }
}

// --- UTILS UI BUILDER ---
function buildHorizontalPopup(hospital, stats, prices, color) {
  // Lấy giá mẫu để hiển thị
  const emergencyPrice = prices.items?.find(i => i.service.includes("Cấp cứu"))?.price || 500000;
  const xrayPrice = prices.items?.find(i => i.service.includes("X-Quang"))?.price || 200000;
  
  const statusHtml = stats.isOpen 
    ? `<span class="med-status open"><i class="fas fa-clock"></i> 24/7 Service</span>`
    : `<span class="med-status closed"><i class="fas fa-door-closed"></i> Closed</span>`;

  return `
    <div class="med-popup-card">
      <div class="med-popup-left">
        <div>
          <div class="med-hospital-icon" style="background: ${color}">
            <i class="fas fa-hospital-alt"></i>
          </div>
          <div class="med-info">
            <div class="med-type" style="color:${color}">${stats.urgency} PRIORITY</div>
            <h3>${hospital.name}</h3>
            <div class="med-rating">
              ${renderStars(Math.min(stats.rating / 2, 5))} 
              <span style="color:#64748b; font-weight:400; margin-left:4px">(${stats.rating})</span>
            </div>
          </div>
        </div>
        ${statusHtml}
      </div>

      <div class="med-popup-right">
        <div class="med-stats-row">
          <div class="med-stat-box">
             <span class="med-stat-label">Wait Time</span>
             <span class="med-stat-value" style="color:${color}">${stats.waitTimeDisplay}</span>
          </div>
          <div class="med-stat-box">
             <span class="med-stat-label">Distance</span>
             <span class="med-stat-value">${stats.distanceDisplay}</span>
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
        </div>

        <div class="med-actions">
          <button id="btn-route-${hospital.id}" class="med-btn med-btn-route">
            <i class="fas fa-directions"></i>
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
  // Convert thang điểm 10 về 5 sao
  const r = Math.round(rating * 2) / 2; 
  for (let i = 1; i <= 5; i++) {
    if (i <= r) stars += '<i class="fas fa-star"></i>';
    else if (i - 0.5 === r) stars += '<i class="fas fa-star-half-alt"></i>';
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
                },
                createMarker: function() { return null; } // Ẩn marker mặc định của routing
            }).addTo(map);
        } else {
           const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
           window.open(url, '_blank');
        }
      },
      (error) => {
        alert("Không thể lấy vị trí hiện tại của bạn.");
      }
    );
  } else {
    alert("Trình duyệt không hỗ trợ Geolocation.");
  }
}
