// js/chat/index.js
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
  // Mark this tab/window so other tabs can target it by name
  try {
    window.name = "medical_chat";
  } catch (e) {
    // ignore
  }

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
  // Accept an optional payload param (when delivered via postMessage).
  async function processPendingMedical(incomingPayload = null) {
    try {
      let payload = null;
      // If payload provided via postMessage, use it directly
      if (incomingPayload) {
        payload = incomingPayload;
      } else {
        const key = "pending_medical_message";
        const raw = localStorage.getItem(key);
        if (!raw) return;
        payload = JSON.parse(raw);
      }

      if (!payload) return;

      // If you still want to fetch enriched data from backend, keep this block.
      // Otherwise, you can use the payload as-is.
      let data = payload;
      try {
        // Optionally enrich from server. If you don't need it, comment this fetch out.
        const response = await fetch("/api/get-all-patient-data");
        if (response.ok) {
          const enriched = await response.json();
          // merge or replace depending on your logic — here we prefer payload but attach enriched as `data.enriched`
          data = Object.assign({}, payload, { enriched });
        }
      } catch (err) {
        // ignore enrichment errors; proceed with payload
        console.warn("Could not enrich payload, continuing with original payload", err);
      }

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
      // remove so it's not processed twice when using localStorage method
      try { localStorage.removeItem("pending_medical_message"); } catch (e) {}
    }
  }

  // Expose for cross-window calls (so other windows can call it directly if they have a reference)
  window.processPendingMedical = processPendingMedical;

  // Immediately check on load (if map opened chat in new tab)
  processPendingMedical();

  // Also listen for storage events (map may set the key from another tab)
  window.addEventListener("storage", (e) => {
    if (e.key === "pending_medical_message") {
      processPendingMedical();
    }
  });

  // Listen for postMessage events from other windows/tabs
  window.addEventListener("message", (e) => {
    // Security: accept only same-origin messages
    try {
      if (e.origin !== window.location.origin) return;
    } catch (err) {
      // some browsers may throw; be conservative
      return;
    }

    if (e.data && e.data.type === "medical_payload") {
      // e.data.payload may be included
      processPendingMedical(e.data.payload || null);
      // optionally bring chat UI to front or show a visual highlight
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
