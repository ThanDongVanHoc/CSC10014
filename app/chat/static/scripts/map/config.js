// Định nghĩa các icon Marker để sử dụng thống nhất trong toàn bộ ứng dụng
export const icons = {
  // Icon màu xanh dương (thường dùng cho điểm click bất kỳ)
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
  // Icon màu đỏ (thường dùng cho điểm Đích - End Point)
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
  // Icon màu xanh lá (thường dùng cho điểm Xuất phát - Start Point)
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
  // Icon màu vàng (thường dùng cho điểm đã Lưu - Saved Pin hoặc Location search)
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
  // Icon Avatar tùy chỉnh (HTML Icon)
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
