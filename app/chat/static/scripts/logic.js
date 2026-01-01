import { initChat} from "./chat/index.js";

async function initialize() {
  console.log("🚀 logic.js loaded: Initializing app...");

  // 3. KHỞI TẠO CHAT SYSTEM
  await initChat();

  try {
      await fetch("/chat/clear_session", { method: "POST" });
      console.log("🧹 Session cleared for a fresh start.");
    } catch (err) {
      console.error("Failed to clear session:", err);
    }

  // 4. XỬ LÝ UI RESIZE
  const hideBtn = document.getElementById("hideBtn");
  const showBtn = document.getElementById("showSidebar");

  if (hideBtn) {
    hideBtn.addEventListener("click", () => {
      setTimeout(invalidateMapSize, 300);
    });
  }

  if (showBtn) {
    showBtn.addEventListener("click", () => {
      setTimeout(invalidateMapSize, 300);
    });
  }

  // 5. DỌN DẸP SESSION
  window.addEventListener("beforeunload", () => {
    navigator.sendBeacon("/chat/clear_session");
  });
}

document.addEventListener("DOMContentLoaded", initialize);
