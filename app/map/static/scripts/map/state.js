// Object chứa toàn bộ biến trạng thái của bản đồ
export const state = {
  map: null, // Instance của Leaflet Map
  mainMarker: null, // Marker chính khi search địa điểm
  startMarker: null, // Marker điểm xuất phát
  endMarker: null, // Marker điểm đích
  routeLayer: null, // Layer vẽ đường đi (Polyline)
  savedPins: [], // Danh sách các marker đã lưu
  locationMarker: null, // Marker cho vị trí cụ thể (từ hàm pinLocationToMap)
  currentMode: "driving", // Chế độ di chuyển: driving, cycling, walking
  flag_pin: true, // Cờ kiểm soát việc click tạo pin hay không
  isMapDragging: false, // Trạng thái đang kéo map (để tránh click nhầm)
  mapDragStart: null, // Vị trí bắt đầu kéo map
};

// Hàm gán instance bản đồ sau khi khởi tạo xong (dùng ở index.js)
export function setMapInstance(map) {
  state.map = map;
}

// Hàm cập nhật giá trị cho state (setter chung)
export function updateState(key, value) {
  state[key] = value;
}

// Hàm thêm pin vào danh sách đã lưu
export function addToSavedPins(pin) {
  state.savedPins.push(pin);
}

// Hàm xóa pin khỏi danh sách đã lưu
export function removeFromSavedPins(pin) {
  state.savedPins = state.savedPins.filter((p) => p !== pin);
}
