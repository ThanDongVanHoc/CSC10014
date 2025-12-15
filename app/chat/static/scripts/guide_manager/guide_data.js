export const MOCK_SCENARIO = {
  title: "Thủ tục Sao y tại UBND",
  steps: [
    {
      id: 1,
      type: "doc",
      title: "Chuẩn bị hồ sơ",
      desc: "Bạn cần bản gốc + 3 bản photo CMND/CCCD. Nếu chưa photo, hãy tìm tiệm photo gần nhất.",
      lat: 10.776,
      lng: 106.7,
      suggestion_query: "tiệm photo",
      suggestion_text: "🔍 Tìm tiệm photo gần đây",
      troubles: [
        {
          keywords: ["quên", "gốc"],
          solution:
            "Bạn bắt buộc phải về lấy bản gốc. Không thể sao y nếu thiếu.",
        },
        {
          keywords: ["photo", "tiệm"],
          solution:
            "Nhấn nút 'Tìm tiệm photo' ở trên, tôi sẽ chỉ đường cho bạn.",
        },
      ],
    },
    {
      id: 2,
      type: "move",
      title: "Di chuyển đến Bãi xe",
      desc: "Đi đến bãi giữ xe cổng sau đường Lê Thánh Tôn. Đừng để xe ở cổng chính.",
      lat: 10.7766,
      lng: 106.7008,
      suggestion_query: "bãi xe",
      suggestion_text: "🅿️ Tìm bãi xe gần đây",
      fallback_desc: "Vincom Center",
      fallback_lat: 10.778,
      fallback_lng: 106.7015,
      troubles: [
        {
          keywords: ["hết chỗ", "đầy", "full"],
          solution:
            "Đừng lo! Tôi tìm thấy bãi xe **Vincom Center** đối diện. Đã cập nhật bản đồ.",
        },
        {
          keywords: ["đóng cửa", "nghỉ"],
          solution:
            "Nếu bãi xe đóng cửa, hãy thử gửi ở hầm Vincom hoặc đi bộ từ phía Parkson.",
        },
      ],
    },
    {
      id: 3,
      type: "action",
      title: "Lấy số & Nộp hồ sơ",
      desc: "Vào quầy số 5. Bấm nút 'Sao y'. Chờ gọi số.",
      lat: 10.7769,
      lng: 106.7009,
    },
    {
      id: 4,
      type: "finish",
      title: "Nhận kết quả",
      desc: "Kiểm tra dấu mộc đỏ và nhận lại bản gốc.",
      lat: 10.7769,
      lng: 106.7009,
    },
  ],
};

// ==========================================
// 1. DATA MANAGEMENT
// ==========================================
export let GLOBAL_GUIDE_DATA = []; // Nơi lưu trữ data từ guide.json

// Hàm chuẩn hóa dữ liệu từ guide.json thành format mà Controller hiểu
// guide_data.js
export async function _normalizeGuideData(guideItem) {
  if (!guideItem || !guideItem.guide || !guideItem.location) return null;

  const loc = guideItem.location;
  const rawGuide = guideItem.guide;
  const baseLat = parseFloat(loc.Lat);
  const baseLng = parseFloat(loc.Lng);

  // Dùng Promise.all để chờ kiểm tra tất cả các bước
  const processedSteps = await Promise.all(rawGuide.steps.map(async (step) => {
    let formsInfo = null;

    // Nếu bước này có yêu cầu ID form, gọi backend kiểm tra
    if (step.required_forms_id) {
        try {
            const res = await fetch(`/chat/forms/info/${step.required_forms_id}`);
            if (res.ok) {
                formsInfo = await res.json();
            } else {
                console.warn(`❌ Form ID "${step.required_forms_id}" không tồn tại.`);
                formsInfo = null;
            }
        } catch (error) {
            console.error("Lỗi kết nối khi lấy form:", error);
            formsInfo = null;
        }
    }

    return {
      ...step,
      lat: step.lat ? parseFloat(step.lat) : baseLat,
      lng: step.lng ? parseFloat(step.lng) : baseLng,
      desc: step.desc || "Thực hiện theo hướng dẫn.",
      forms_data: formsInfo 
    };
  }));

  return {
    title: rawGuide.title || `Hướng dẫn tại ${loc.Ten}`,
    steps: processedSteps,
  };
}
export function setGlobalGuideData(data) {
  GLOBAL_GUIDE_DATA = data;
}
