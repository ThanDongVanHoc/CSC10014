import { state, updateState } from "../state.js";
import { createPin } from "./markerUtils.js";

export function initMapEvents(map) {
  // 1. Bắt đầu nhấn chuột (Mousedown)
  map.on("mousedown", (e) => {
    // Lưu lại tọa độ bắt đầu nhấn
    updateState("mapDragStart", {
      x: e.originalEvent.clientX,
      y: e.originalEvent.clientY,
    });
    updateState("isMapDragging", false);
  });

  // 2. Di chuyển chuột (Mousemove)
  map.on("mousemove", (e) => {
    // Nếu chưa nhấn chuột mà di chuyển thì bỏ qua
    if (!state.mapDragStart) return;

    // Tính khoảng cách di chuyển
    const deltaX = e.originalEvent.clientX - state.mapDragStart.x;
    const deltaY = e.originalEvent.clientY - state.mapDragStart.y;

    // Nếu di chuyển chuột > 5px thì coi là hành động KÉO (Drag)
    // (Dùng Pytago tính cạnh huyền)
    if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 5) {
      updateState("isMapDragging", true);
    }
  });

  // 3. Nhả chuột (Mouseup)
  map.on("mouseup", () => {
    // Reset lại trạng thái
    updateState("mapDragStart", null);
    setTimeout(() => {
      updateState("isMapDragging", false);
    }, 0);
  });

  // 4. Sự kiện Click (Quan trọng nhất)
  map.on("click", (e) => {
    // Nếu vừa mới kéo map xong thì KHÔNG làm gì cả (tránh tạo Pin nhầm)
    if (state.isMapDragging) return;

    // Logic tạo Pin
    if (state.flag_pin) {
      createPin(e.latlng, "Marked Point");
    } else {
      // Nếu đang tắt tạo pin (ví dụ vừa chọn phương tiện xong), bật lại cho lần sau
      updateState("flag_pin", true);
    }

    // Dọn dẹp
    updateState("mapDragStart", null);
  });
}
