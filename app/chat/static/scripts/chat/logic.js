import { State, DOM } from "./services/core.js";
import { DataManager, getLocationOrDefault } from "./services/data.js";
import {
  hideSearchWrapper,
  appendMessageToUI,
  appendLocationCardsToUI,
} from "./components/message_ui.js";
import { renderSidebar } from "./components/sidebar_ui.js";

export async function sendMessage(text) {
  if (!text.trim()) return;
  hideSearchWrapper();

  const emptyState = document.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  appendMessageToUI("user", text);
  DOM.chatInput.value = "";

  // Tạo chat mới nếu cần
  if (!State.selectedId) {
    const newChat = await DataManager.create("New chat");
    if (newChat) {
      State.conversations.unshift(newChat);
      State.selectedId = newChat.id;
      DataManager.saveGuestData();
      renderSidebar();
    }
  }

  // GUEST logic: Lưu User msg
  let currentChat = State.conversations.find((c) => c.id == State.selectedId);
  if (!State.isLoggedIn && currentChat) {
    const now = Date.now();
    currentChat.messages.push({ role: "user", text: text, created_at: now });
    currentChat.updated_at = now;
    if (currentChat.messages.length === 1)
      currentChat.title = text.slice(0, 40);
    DataManager.saveGuestData();
    renderSidebar();
  }

  // Loading
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg bot loading";
  loadingDiv.innerHTML = `<span class="ai-icon">✨</span><div class="ai-loader"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>`;
  DOM.chatMessages.appendChild(loadingDiv);
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;

  try {
    const { lat, lng } = await getLocationOrDefault();

    let data;
    if (window.USE_MOCK_CHAT_RESPONSE) {
      const resp = await fetch("/chat/static/mock_responses/guide.json");
      data = await resp.json();
    } else {
      const res = await fetch("/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          convo_id: State.selectedId,
          user_lat: lat,
          user_lng: lng,
        }),
      });
      data = await res.json();
    }

    loadingDiv.remove();

    const reply = data.reply || "No response from server.";
    if (data.guide && window.startGuideFlowFromData)
      window.startGuideFlowFromData(data.guide);

    if (data.convo_id && data.convo_id != State.selectedId) {
      State.selectedId = data.convo_id;
      if (State.isLoggedIn)
        State.conversations = await DataManager.getConversations();
    }

    // USER logic: Rename & Update
    if (State.isLoggedIn) {
      const conv = State.conversations.find((c) => c.id == State.selectedId);
      if (conv) {
        conv.updated_at = new Date().toISOString();
        if (conv.title === "New chat" || !conv.title) {
          const newTitle = text.slice(0, 40);
          await DataManager.rename(State.selectedId, newTitle);
          DOM.convTitle.textContent = newTitle.slice(0, 20) + "...";
        }
        renderSidebar(DOM.searchInput.value);
      }
    }

    appendMessageToUI("model", reply);

    // GUEST logic: Lưu Bot msg
    currentChat = State.conversations.find((c) => c.id == State.selectedId);
    if (!State.isLoggedIn && currentChat) {
      const now = Date.now();
      currentChat.messages.push({
        role: "model",
        text: reply,
        created_at: now,
      });
      currentChat.updated_at = now;
      DataManager.saveGuestData();
      renderSidebar();
    }

    if (data.locations) appendLocationCardsToUI(data.locations);
  } catch (e) {
    console.error(e);
    loadingDiv.remove();
    appendMessageToUI("model", "Server error. Please try again later.");
  }
}
