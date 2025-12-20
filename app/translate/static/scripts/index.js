// static/scripts/app/translate/index.js

import { State, DOM } from "./services/core.js";
import { DataManager } from "./services/data.js";
import { renderSidebar } from "./components/sidebar_ui.js";
import { renderEmptyState, setActivePanel } from "./components/box_ui.js";
import {
  handleSendMessage,
  loadSelectedChatToUI,
  resetToNewSession,
  hideSearchWrapper,
} from "./logic.js";

// Init Function
export async function initTranslate() {
  console.log("🚀 Init Translate App (Chat Logic Version)...");

  // 1. Map DOM (Đảm bảo ID trong translate_block.html khớp)
  DOM.convoListEl = document.getElementById("convoList");
  DOM.searchInput = document.getElementById("searchInput");
  DOM.searchWrapper = document.getElementById("searchWrapper");
  DOM.btnNew = document.getElementById("btnNew");
  DOM.hideBtn = document.getElementById("hideBtn");
  DOM.app = document.querySelector(".app");
  DOM.brandToggle = document.getElementById("brandToggle");
  DOM.btnSearchTrigger = document.getElementById("btnSearchTrigger");
  DOM.sidebarLogo = document.querySelector(".sidebar-logo");

  // Panels (Patient & Doctor)
  DOM.panels = Array.from(document.querySelectorAll(".tr-panel"));

  // 2. Data & State
  await DataManager.checkAuth();
  console.log("Mode:", State.isLoggedIn ? "USER" : "GUEST");

  State.conversations = await DataManager.getConversations();
  if (State.conversations.length > 0) {
    State.selectedId = State.conversations[0].id; // Chọn cái mới nhất
    await loadSelectedChatToUI();
  } else {
    renderEmptyState();
  }
  renderSidebar();

  // 3. Sidebar Events
  const expand = () => DOM.app.classList.remove("sidebar-hidden");

  if (DOM.hideBtn)
    DOM.hideBtn.onclick = () => {
      DOM.app.classList.add("sidebar-hidden");
      hideSearchWrapper();
    };

  if (DOM.brandToggle) {
    DOM.brandToggle.onclick = () => {
      // Kiểm tra: Nếu sidebar đang ẩn (có class sidebar-hidden)
      if (DOM.app.classList.contains("sidebar-hidden")) {
        // -> Mở sidebar ra
        expand();
      } else {
        // -> Nếu đang mở rồi thì bấm vào sẽ là Tạo chat mới
        handleNewChat();
      }
    };
  }

  // 4. Action Events
  const handleNewChat = () => {
    resetToNewSession();
    if (window.innerWidth < 768) DOM.app.classList.add("sidebar-hidden");
    hideSearchWrapper();
  };

  if (DOM.btnNew) DOM.btnNew.onclick = handleNewChat;
  if (DOM.sidebarLogo) {
    DOM.sidebarLogo.style.cursor = "pointer";
    DOM.sidebarLogo.onclick = handleNewChat;
  }

  if (DOM.btnSearchTrigger)
    DOM.btnSearchTrigger.onclick = () => {
      expand();
      if (DOM.searchWrapper) {
        const isHidden = DOM.searchWrapper.style.display === "none";
        DOM.searchWrapper.style.display = isHidden ? "block" : "none";
        if (isHidden && DOM.searchInput) DOM.searchInput.focus();
      }
    };

  if (DOM.searchInput)
    DOM.searchInput.oninput = (e) => renderSidebar(e.target.value);

  // 5. Box Events (Gắn sự kiện Gửi cho từng Panel)
  DOM.panels.forEach((panel) => {
    const sendBtn = panel.querySelector(".tr-iconbtn--send");
    const input = panel.querySelector(".tr-input");
    const pickBtn = panel.querySelector(".tr-pick");
    const body = panel.querySelector(".tr-panel__body");

    // Click Active Panel
    if (pickBtn)
      pickBtn.onclick = (e) => {
        e.stopPropagation();
        setActivePanel(panel);
      };
    if (body) body.onclick = () => setActivePanel(panel);

    // Gửi tin nhắn
    if (sendBtn && input) {
      const doSend = () => handleSendMessage(panel, input);
      sendBtn.onclick = doSend;
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          doSend();
        }
      };
    }
  });

  console.log("✅ Translate App Started!");
}

// Auto Init
document.addEventListener("DOMContentLoaded", initTranslate);
