import {
  State,
  DOM,
  // [MAP LOGIC] - Commented
  // setMapReference as setMapRefState,
} from "./services/core.js";
import { DataManager } from "./services/data.js";
import {
  renderEmptyState,
  loadSelectedChatToUI,
  hideSearchWrapper,
  appendMessageToUI, // <-- ADDED: so chat page can directly render incoming payloads
} from "./components/message_ui.js";
import { renderSidebar } from "./components/sidebar_ui.js";
import { sendMessage } from "./logic.js";

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

  DOM.btnOpenForm = document.getElementById("btnOpenForm");
  
  const openFormPage = () => {
    window.open("/medical_form", "_blank");
  };

 // Header button click
  if (DOM.btnOpenForm) {
    DOM.btnOpenForm.onclick = openFormPage;
  }

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

  // --- NEW: process pending medical payloads from localStorage (from the map)
  async function processPendingMedical() {
    const key = "pending_medical_message";
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      let data;
      // const response = await fetch("/chat/static/mock_responses/patientData.json");
      const response = await fetch("/api/get-all-patient-data");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      data = await response.json();
      // A friendly text to display above the card
      const textToSend = `Medical booking / pass received from Map: ${payload.patient?.name || "Booking"}`;

      // Ensure a conversation exists
      if (!State.selectedId) {
        try {
          const newChat = await DataManager.create("New chat");
          if (newChat) {
            State.conversations.unshift(newChat);
            State.selectedId = newChat.id;
            DataManager.saveGuestData();
            renderSidebar();
          }
        } catch (err) {
          console.warn("Could not create chat to receive pending medical message:", err);
        }
      }

      // Append UI message (bot/model) with payload
      appendMessageToUI("model", textToSend, data);

      // Save into guest conversations (mirror logic.js storage behavior)
      const currentChat = State.conversations.find((c) => c.id == State.selectedId);
      if (!State.isLoggedIn && currentChat) {
        const now = Date.now();
        currentChat.messages = currentChat.messages || [];
        const botMsg = {
          role: "model",
          text: textToSend,
          created_at: now,
          data: data,
        };
        currentChat.messages.push(botMsg);
        currentChat.updated_at = now;
        DataManager.saveGuestData();
        renderSidebar();
      }

    } catch (err) {
      console.error("Failed to process pending medical message:", err);
    } finally {
      // remove so it's not processed twice
      try { localStorage.removeItem(key); } catch (e) {}
    }
  }

  // Immediately check on load (if map opened chat in new tab)
  processPendingMedical();

  // Also listen for storage events (map may set the key from another tab)
  window.addEventListener("storage", (e) => {
    if (e.key === "pending_medical_message") {
      processPendingMedical();
    }
  });

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
