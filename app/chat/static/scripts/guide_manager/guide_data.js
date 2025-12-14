export const MOCK_SCENARIO = {
  title: "Thủ tục Sao y tại UBND",
  steps: [
    {
      id: 1,
      type: 'doc',
      title: "Chuẩn bị hồ sơ",
      desc: "Bạn cần bản gốc + 3 bản photo CMND/CCCD. Nếu chưa photo, hãy tìm tiệm photo gần nhất.",
      lat: 10.7760, lng: 106.7000,
      suggestion_query: "tiệm photo",
      suggestion_text: "🔍 Tìm tiệm photo gần đây",
      troubles: [
        { keywords: ["quên", "gốc"], solution: "Bạn bắt buộc phải về lấy bản gốc. Không thể sao y nếu thiếu." },
        { keywords: ["photo", "tiệm"], solution: "Nhấn nút 'Tìm tiệm photo' ở trên, tôi sẽ chỉ đường cho bạn." }
      ]
    },
    {
      id: 2,
      type: 'move',
      title: "Di chuyển đến Bãi xe",
      desc: "Đi đến bãi giữ xe cổng sau đường Lê Thánh Tôn. Đừng để xe ở cổng chính.",
      lat: 10.7766, lng: 106.7008,
      suggestion_query: "bãi xe",
      suggestion_text: "🅿️ Tìm bãi xe gần đây",
      fallback_desc: "Vincom Center",
      fallback_lat: 10.7780, fallback_lng: 106.7015,
      troubles: [
        { keywords: ["hết chỗ", "đầy", "full"], solution: "Đừng lo! Tôi tìm thấy bãi xe **Vincom Center** đối diện. Đã cập nhật bản đồ." },
        { keywords: ["đóng cửa", "nghỉ"], solution: "Nếu bãi xe đóng cửa, hãy thử gửi ở hầm Vincom hoặc đi bộ từ phía Parkson." }
      ]
    },
    {
      id: 3,
      type: 'action',
      title: "Lấy số & Nộp hồ sơ",
      desc: "Vào quầy số 5. Bấm nút 'Sao y'. Chờ gọi số.",
      lat: 10.7769, lng: 106.7009
    },
    {
      id: 4,
      type: 'finish',
      title: "Nhận kết quả",
      desc: "Kiểm tra dấu mộc đỏ và nhận lại bản gốc.",
      lat: 10.7769, lng: 106.7009
    }
  ]
};

// ==========================================
// 1. DATA MANAGEMENT
// ==========================================
export let GLOBAL_GUIDE_DATA = []; // Nơi lưu trữ data từ guide.json

// Hàm chuẩn hóa dữ liệu từ guide.json thành format mà Controller hiểu
export function _normalizeGuideData(guideItem) {
    if (!guideItem || !guideItem.guide || !guideItem.location) return null;

    const loc = guideItem.location;
    const rawGuide = guideItem.guide;
    
    // Lấy tọa độ gốc từ Location (vì trong steps đang bị null)
    const baseLat = parseFloat(loc.Lat);
    const baseLng = parseFloat(loc.Lng);

    return {
        title: rawGuide.title || `Hướng dẫn tại ${loc.Ten}`,
        steps: rawGuide.steps.map(step => ({
            ...step,
            // Nếu step không có tọa độ riêng, dùng tọa độ của địa điểm
            lat: step.lat ? parseFloat(step.lat) : baseLat,
            lng: step.lng ? parseFloat(step.lng) : baseLng,
            // Fallback nếu thiếu desc
            desc: step.desc || "Thực hiện theo hướng dẫn của cán bộ.",
        }))
    };
}
export function setGlobalGuideData(data) {
  GLOBAL_GUIDE_DATA = data;
}