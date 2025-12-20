// static/scripts/app/translate/logic.js

import { State, DOM } from "./services/core.js";
import { DataManager } from "./services/data.js";
import { renderSidebar } from "./components/sidebar_ui.js";
import { renderEmptyState, appendMessageToBox } from "./components/box_ui.js";

// Helper UI
export function hideSearchWrapper() {
  if (DOM.searchWrapper) DOM.searchWrapper.style.display = "none";
  if (DOM.searchInput) DOM.searchInput.value = "";
}

// 1. Load Chat Cũ
export async function loadSelectedChatToUI() {
  renderEmptyState(); // Xóa màn hình
  if (!State.selectedId) return;

  const msgs = await DataManager.getMessages(State.selectedId);
  msgs.forEach((m) => {
    // role: 'user' (left), 'model' (right)
    const type = m.role === "user" ? "left" : "right";
    appendMessageToBox(m.content, type, m.speaker_role);
  });
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
  if (State.isLoggedIn) {
    // Gửi tin nhắn user lên server
    await DataManager.sendMessage(State.selectedId, text, speakerRole);

    // Auto Rename nếu tên đang là default
    const conv = State.conversations.find((c) => c.id == State.selectedId);
    if (conv && (conv.title === "New Translation" || !conv.title)) {
      const newTitle = text.slice(0, 40);
      await DataManager.rename(State.selectedId, newTitle);
      renderSidebar();
    }
  }

  // E. Mock Response (Giả lập phản hồi dịch - Đợi Backend thật)
  setTimeout(() => {
    const translatedText = `(Dịch) ${text}`;

    // Lưu Bot Msg cho Guest
    if (!State.isLoggedIn && currentChat) {
      currentChat.messages.push({
        role: "model",
        content: translatedText,
        speaker_role: speakerRole,
        created_at: new Date().toISOString(),
      });
      DataManager.saveGuestData();
    }

    // Hiện Bot Msg lên UI
    appendMessageToBox(translatedText, "right", speakerRole);
  }, 600);
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
