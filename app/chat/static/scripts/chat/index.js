import {
  State,
  DOM,
  setMapReference as setMapRefState,
} from "./services/core.js"; 
import { DataManager } from "./services/data.js";
import {
  renderEmptyState,
  loadSelectedChatToUI,
  hideSearchWrapper,
} from "./components/message_ui.js";
import { renderSidebar } from "./components/sidebar_ui.js";
import { sendMessage } from "./logic.js";

// Export API
export function setMapReference(fn) {
  setMapRefState(fn);
}
export { hideSearchWrapper };

export async function initChat() {
  // 1. Map DOM
  DOM.convoListEl = document.getElementById("convoList");
  DOM.searchInput = document.getElementById("searchInput");
  DOM.searchWrapper = document.getElementById("searchWrapper");
  DOM.btnNew = document.getElementById("btnNew");
  DOM.convTitle = document.getElementById("convTitle");
  DOM.chatMessages = document.getElementById("chatMessages");
  DOM.chatInput = document.getElementById("chatInput");
  DOM.sendBtn = document.getElementById("sendBtn");
  DOM.hideBtn = document.getElementById("hideBtn");
  DOM.app = document.querySelector(".app");
  DOM.brandToggle = document.getElementById("brandToggle");
  DOM.btnSearchTrigger = document.getElementById("btnSearchTrigger");

  // 2. Data
  await DataManager.checkAuth();
  console.log("Chat Mode:", State.isLoggedIn ? "USER" : "GUEST");

  State.conversations = await DataManager.getConversations();
  if (State.conversations.length > 0) {
    State.selectedId = State.conversations[0].id;
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

  if (DOM.brandToggle)
    DOM.brandToggle.onclick = () => {
      if (DOM.app.classList.contains("sidebar-hidden")) expand();
      else {
        State.selectedId = null;
        renderEmptyState();
        DOM.convTitle.textContent = "New chat";
        renderSidebar();
        hideSearchWrapper();
        if (DOM.chatInput) DOM.chatInput.focus();
      }
    };

  // 4. Action Events
  if (DOM.btnNew)
    DOM.btnNew.onclick = () => {
      expand();
      State.selectedId = null;
      renderEmptyState();
      DOM.convTitle.textContent = "New chat";
      renderSidebar();
      hideSearchWrapper();
    };

  if (DOM.btnSearchTrigger)
    DOM.btnSearchTrigger.onclick = () => {
      expand();
      if (DOM.searchWrapper) DOM.searchWrapper.style.display = "block";
      setTimeout(() => DOM.searchInput && DOM.searchInput.focus(), 100);
    };

  if (DOM.searchInput)
    DOM.searchInput.oninput = (e) => renderSidebar(e.target.value);
  if (DOM.sendBtn) DOM.sendBtn.onclick = () => sendMessage(DOM.chatInput.value);
  if (DOM.chatInput)
    DOM.chatInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage(DOM.chatInput.value);
      }
    };

  // Mock Toggle
  try {
    const lbl = document.createElement("label");
    lbl.style.cssText = "margin-left:8px; font-size:13px;";
    lbl.innerHTML = `<input type="checkbox" id="mockToggle" ${
      window.USE_MOCK_CHAT_RESPONSE ? "checked" : ""
    }> Mock`;
    if (DOM.btnNew) DOM.btnNew.parentNode.appendChild(lbl);
    document
      .getElementById("mockToggle")
      ?.addEventListener(
        "change",
        (e) => (window.USE_MOCK_CHAT_RESPONSE = e.target.checked)
      );
  } catch (e) {}
}
