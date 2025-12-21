// static/scripts/app/translate/logic.js

import { State, DOM } from "./services/core.js";
import { DataManager } from "./services/data.js";
import { renderSidebar } from "./components/sidebar_ui.js";
import {
  renderEmptyState,
  appendMessageToBox,
  showLoadingBubble,
  removeLoadingBubble,
} from "./components/box_ui.js";
import { AudioController } from "./components/audio_ui.js";

// Helper UI
export function hideSearchWrapper() {
  if (DOM.searchWrapper) DOM.searchWrapper.style.display = "none";
  if (DOM.searchInput) DOM.searchInput.value = "";
}

// 1. Load Chat Cũ
export async function loadSelectedChatToUI() {
  renderEmptyState();
  if (!State.selectedId) return;

  const msgs = await DataManager.getMessages(State.selectedId);
  msgs.forEach((m) => {
    const type = m.role === "user" ? "left" : "right";

    // KIỂM TRA: Nếu tin nhắn có audio -> Vẽ Voice Bubble
    if (m.audio_url) {
      const voiceHTML = AudioController.generateHTML(
        m.audio_url,
        m.duration_seconds
      );
      appendMessageToBox(voiceHTML, type, m.speaker_role, true);
    } else {
      // Nếu không -> Vẽ text bình thường
      appendMessageToBox(m.content, type, m.speaker_role, false);
    }
  });
}

function getLocalContext(limit = 2) {
  if (!State.selectedId) return [];
  const currentChat = State.conversations.find((c) => c.id == State.selectedId);
  if (!currentChat || !currentChat.messages) return [];

  // Lấy n tin nhắn gần nhất
  const recent = currentChat.messages.slice(-limit);
  return recent.map((m) => `${m.role} (${m.speaker_role}): ${m.content}`);
}

// 2. Xử lý Gửi Tin Nhắn (Logic chính)
export async function handleSendMessage(panel, inputElement) {
  const text = inputElement.value.trim();
  if (!text) return;
  hideSearchWrapper();

  // Xác định role (Patient/Doctor)
  const isDoctor = panel.dataset.role === "doctor";
  const speakerRole = isDoctor ? "doctor" : "patient";

  // A. Optimistic UI (Hiện ngay lập tức)
  appendMessageToBox(text, "left", speakerRole);
  inputElement.value = "";

  // B. Lazy Create (Nếu chưa có ID thì tạo mới)
  if (!State.selectedId) {
    const title = text.slice(0, 40);
    const newChat = await DataManager.create(title);
    if (newChat) {
      State.conversations.unshift(newChat);
      State.selectedId = newChat.id;
      DataManager.saveGuestData();
      renderSidebar();
    }
  }

  // C. Guest Logic (Lưu local)
  let currentChat = State.conversations.find((c) => c.id == State.selectedId);
  if (!State.isLoggedIn && currentChat) {
    const now = new Date().toISOString();
    currentChat.messages.push({
      role: "user",
      content: text,
      speaker_role: speakerRole,
      audio_url: null,
      duration_seconds: null,
      created_at: now,
    });
    currentChat.updated_at = now;
    // Rename nếu là tin đầu tiên
    if (currentChat.messages.length === 1)
      currentChat.title = text.slice(0, 40);

    DataManager.saveGuestData();
    renderSidebar();
  }

  // D. User Logic (Gửi server)
  const contextData = getLocalContext(2);
  const loader = showLoadingBubble("right", speakerRole);

  // 4. Gọi API
  try {
    const response = await fetch("/translate/api/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        conversation_id: State.selectedId,
        speaker_role: speakerRole,
        context: contextData,
      }),
    });

    const data = await response.json();
    removeLoadingBubble(loader);

    if (data.status === "success") {
      appendMessageToBox(data.translated_text, "right", speakerRole);

      // Nếu là Guest, phải tự lưu response của Model vào local
      if (!State.isLoggedIn) {
        let currentChat = State.conversations.find(
          (c) => c.id == State.selectedId
        );
        if (currentChat) {
          currentChat.messages.push({
            role: "model",
            content: data.translated_text,
            speaker_role: speakerRole,
            created_at: new Date().toISOString(),
          });
          DataManager.saveGuestData();
        }
      } else {
        renderSidebar(); // User thì refresh sidebar
      }
    } else {
      console.error(data);
      appendMessageToBox(
        "Error: " + (data.message || "Unknown"),
        "right",
        speakerRole
      );
    }
  } catch (err) {
    console.error(err);
    appendMessageToBox("Error: Connection failed.", "right", speakerRole);
  }
}

// 3. Reset về phiên mới
export function resetToNewSession() {
  State.selectedId = null;
  renderEmptyState();
  renderSidebar();

  // Xóa class active ở sidebar
  const activeItems = document.querySelectorAll(".convo-item.active");
  activeItems.forEach((el) => el.classList.remove("active"));
}
