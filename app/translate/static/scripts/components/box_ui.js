import { DOM } from "../services/core.js";

// Xóa trắng tin nhắn (dùng khi load chat mới hoặc new chat)
export function renderEmptyState() {
  DOM.panels.forEach((panel) => {
    const list = panel.querySelector(".tr-messages");
    if (list) list.innerHTML = "";
  });
  // Mặc định focus vào panel đầu tiên (Patient)
  if (DOM.panels[0]) setActivePanel(DOM.panels[0]);
}

// Vẽ tin nhắn lên đúng panel dựa vào speakerRole
export function appendMessageToBox(text, type, speakerRole) {
  // type: 'left' (User nói) | 'right' (Bot/Dịch nói)
  // speakerRole: 'patient' | 'doctor'

  // Tìm panel đích
  const targetPanel = DOM.panels.find((p) => p.dataset.role === speakerRole);
  if (!targetPanel) return;

  const list = targetPanel.querySelector(".tr-messages");
  if (!list) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `tr-msg tr-msg--${type}`;

  let bubbleClass = "tr-bubble";
  if (type === "left") {
    bubbleClass += " tr-bubble--user";
    // Nếu là Doctor nói -> màu xanh lá
    if (speakerRole === "doctor") bubbleClass += " tr-bubble--green";
  } else {
    // Bot dịch -> màu trắng xám
    bubbleClass += " tr-bubble--bot";
  }

  msgDiv.innerHTML = `
    <button class="${bubbleClass}" type="button">
      ${escapeHtml(text)}
    </button>
  `;

  list.appendChild(msgDiv);
  list.scrollTop = list.scrollHeight;
}

// Xử lý Active Panel (Hiện input, border xanh)
export function setActivePanel(activePanel) {
  DOM.panels.forEach((p) => {
    const composer = p.querySelector(".tr-composer");
    const input = p.querySelector(".tr-input");

    if (p === activePanel) {
      p.classList.add("tr-panel--active");
      if (composer) composer.classList.remove("tr-composer--hidden");
      if (input) input.focus();
    } else {
      p.classList.remove("tr-panel--active");
      if (composer) composer.classList.add("tr-composer--hidden");
    }
  });
}

// Helper chống XSS
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
