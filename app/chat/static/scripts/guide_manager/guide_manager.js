import { SmartGuideController } from "./guide_controller.js";
import {
  MOCK_SCENARIO,
  GLOBAL_GUIDE_DATA,
  setGlobalGuideData,
  _normalizeGuideData,
} from "./guide_data.js";

// ==========================================
// 3. INITIALIZATION & EXPORT
// ==========================================
let guideApp = null;

// Tải dữ liệu khi file js được load
// CHÚ Ý: Đường dẫn này phải đúng với nơi bạn phục vụ file guide.json
// Nếu bạn đang dùng Flask static, nó có thể là /static/mock_responses/guide.json hoặc /chat/static...
fetch("/chat/static/mock_responses/guide.json")
  .then((res) => res.json())
  .then((data) => {
    console.log("Guide data loaded:", data);
    if (data.guides) {
      // Thay vì gán trực tiếp, dùng hàm setter từ guide_data.js
      setGlobalGuideData(data.guides);
    }
  })
  .catch((err) => console.error("Load guide JSON failed:", err));

// Hàm Main được gọi từ chat.js
export function startGuideFlow(locationNameOrData) {
  let scenarioData = null;

  // Trường hợp 1: Truyền vào tên địa điểm (String) -> Tìm trong JSON đã load
  if (typeof locationNameOrData === "string") {
    const found = GLOBAL_GUIDE_DATA.find(
      (item) => item.location && item.location.Ten === locationNameOrData
    );
    if (found) {
      scenarioData = _normalizeGuideData(found);
    } else {
      // Fallback: Nếu không tìm thấy, thử tìm gần đúng hoặc báo lỗi
      console.warn(`Không tìm thấy hướng dẫn cho: ${locationNameOrData}`);
      // Có thể dùng MOCK_SCENARIO ở đây nếu muốn test
      // scenarioData = MOCK_SCENARIO;
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
      scenarioData = _normalizeGuideData(locationNameOrData);
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
        `Xin lỗi, tôi chưa có dữ liệu hướng dẫn chi tiết cho địa điểm này.`
      );
    }
  }
}

// Global Binding để HTML onclick gọi được
window.nextStep = (id) => guideApp && guideApp.nextStep(id);
window.submitIssue = (id) => guideApp && guideApp.submitIssue(id);
window.toggleIssueForm = (id, show) =>
  guideApp && guideApp.toggleIssueForm(id, show);
// window.searchSuggestion đã được bind trong performSuggestion
