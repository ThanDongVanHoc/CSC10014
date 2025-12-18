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
                console.warn(`❌ Form ID "${step.required_forms_id}" does not exist.`);
                formsInfo = null;
            }
        } catch (error) {
            console.error("Error fetching form info:", error);
            formsInfo = null;
        }
    }

    return {
      ...step,
      lat: step.lat ? parseFloat(step.lat) : baseLat,
      lng: step.lng ? parseFloat(step.lng) : baseLng,
      desc: step.desc || "Follow the instructions.",
      forms_data: formsInfo 
    };
  }));

  return {
    title: rawGuide.title || ` Guide for ${loc.Ten}`,
    steps: processedSteps,
  };
}
export function setGlobalGuideData(data) {
  GLOBAL_GUIDE_DATA = data;
}
