import { SmartGuideController } from "./guide_controller.js";
import {
  MOCK_SCENARIO,
  GLOBAL_GUIDE_DATA,
  setGlobalGuideData,
  _normalizeGuideData,
} from "./guide_data.js";

let guideApp = null;

// Tải dữ liệu khi file js được load
fetch("/chat/static/mock_responses/guide.json")
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Guide data loaded:", data);
    if (data.guides) {
      setGlobalGuideData(data.guides);
    }
  })
  .catch((err) => console.error("❌ Load guide JSON failed:", err));

export async function startGuideFlow(locationNameOrData) {
  let scenarioData = null;

  // Trường hợp 1: Truyền vào tên địa điểm (String) -> Tìm trong JSON đã load
  if (typeof locationNameOrData === "string") {
    const found = GLOBAL_GUIDE_DATA.find(
      (item) => item.location && item.location.Ten === locationNameOrData
    );
    if (found) {
      scenarioData = await _normalizeGuideData(found);
    } else {
      console.warn(`⚠️ No guide found for: ${locationNameOrData}`);
    }
  }
  // Trường hợp 2: Truyền vào Object dữ liệu trực tiếp (từ Backend API trả về)
  else if (typeof locationNameOrData === "object") {
    // Nếu object đã đúng format scenario
    if (locationNameOrData.steps) {
      scenarioData = locationNameOrData;
    }
    // Nếu object dạng {location, guide} như guide.json
    else if (locationNameOrData.location && locationNameOrData.guide) {
      scenarioData = await _normalizeGuideData(locationNameOrData);
    }
  }

  if (scenarioData) {
    // Khởi tạo controller mới với dữ liệu vừa chuẩn hóa
    guideApp = new SmartGuideController(scenarioData);
    guideApp._set(locationNameOrData);
    guideApp.start(locationNameOrData.title || scenarioData.title);
  } else {
    // Thông báo lỗi ra Chat UI
    if (window.appendMessageToUI) {
      window.appendMessageToUI(
        "model",
        `Sorry, I don't have detailed guide data for this location yet.`
      );
    }
  }
}

// Global Binding để HTML onclick gọi được
window.nextStep = (id) => guideApp && guideApp.nextStep(id);
window.submitIssue = (id) => guideApp && guideApp.submitIssue(id);
window.toggleIssueForm = (id, show) =>
  guideApp && guideApp.toggleIssueForm(id, show);
