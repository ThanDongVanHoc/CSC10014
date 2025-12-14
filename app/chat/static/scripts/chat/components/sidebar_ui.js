import { State, DOM } from "../services/core.js"; 
import { DataManager } from "../services/data.js";
import { hideSearchWrapper, loadSelectedChatToUI } from "./message_ui.js";

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(
    date.getDate()
  )}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function renderSidebar(filter = "") {
  DOM.convoListEl.innerHTML = "";
  const f = filter.trim().toLowerCase();

  State.conversations.sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
  );

  State.conversations.forEach((c) => {
    const rawTitle =
      c.title ||
      (c.messages && c.messages[0]
        ? c.messages[0].text.slice(0, 20)
        : "New chat");
    const title =
      rawTitle.length > 20 ? rawTitle.slice(0, 20) + "..." : rawTitle;

    if (f && !title.toLowerCase().includes(f)) return;

    const item = document.createElement("div");
    item.className = "convo-item" + (c.id == State.selectedId ? " active" : "");
    item.innerHTML = `
            <div class="chat-item">
                <div>
                    <div class="convo-title">${title}</div>
                    <div class="convo-sub">${formatTime(c.updated_at)}</div>
                </div>
                <div class="chat-options"><span class="dots">⋯</span></div>
            </div>`;

    item.addEventListener("click", (e) => {
      if (e.target.closest(".chat-options")) return;
      hideSearchWrapper();
      State.selectedId = c.id;
      if (DOM.searchInput) DOM.searchInput.value = "";
      renderSidebar();
      loadSelectedChatToUI();
    });

    item.querySelector(".dots").addEventListener("click", (e) => {
      e.stopPropagation();
      createDropdownMenu(e, c);
    });

    DOM.convoListEl.appendChild(item);
  });
}

function createDropdownMenu(event, convo) {
  const dotsBtn = event.currentTarget || event.target;
  if (dotsBtn.classList.contains("dots-active")) return;

  document.querySelectorAll(".dropdown-menu").forEach((e) => e.remove());
  document
    .querySelectorAll(".dots")
    .forEach((e) => e.classList.remove("dots-active"));

  dotsBtn.classList.add("dots-active");
  const menu = document.createElement("div");
  menu.className = "dropdown-menu";
  menu.style.cssText = "display:block; position:fixed;";
  menu.innerHTML = `<button class="rename">📝 Rename</button><button class="delete">🗑️ Delete</button>`;

  const rect = dotsBtn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 5}px`;
  menu.style.left = `${rect.left}px`;
  document.body.appendChild(menu);

  menu.querySelector(".rename").onclick = () => {
    cleanup();
    const convoItem = dotsBtn.closest(".convo-item");
    const titleEl = convoItem.querySelector(".convo-title");
    if (!titleEl) return;

    const input = document.createElement("input");
    input.value = convo.title || "New chat";
    input.style.cssText =
      "width:100%; padding:4px; border:1px solid #0078ff; border-radius:4px;";
    titleEl.textContent = "";
    titleEl.appendChild(input);
    input.focus();
    input.select();

    const save = async () => {
      const newName = input.value.trim();
      if (newName && newName !== convo.title) {
        await DataManager.rename(convo.id, newName);
        if (convo.id == State.selectedId)
          DOM.convTitle.textContent =
            newName.slice(0, 20) + (newName.length > 20 ? "..." : "");
      }
      renderSidebar();
    };
    input.addEventListener("blur", save);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      }
    });
  };

  menu.querySelector(".delete").onclick = async () => {
    if (confirm("Xóa cuộc trò chuyện này?")) {
      await DataManager.delete(convo.id);
      if (State.selectedId == convo.id) {
        State.selectedId =
          State.conversations.length > 0 ? State.conversations[0].id : null;
        loadSelectedChatToUI();
      }
      renderSidebar();
    }
    cleanup();
  };

  function cleanup() {
    menu.remove();
    dotsBtn.classList.remove("dots-active");
  }
  setTimeout(() => {
    const close = (e) => {
      if (!menu.contains(e.target) && !dotsBtn.contains(e.target)) {
        cleanup();
        document.removeEventListener("click", close);
      }
    };
    document.addEventListener("click", close);
  }, 0);
}
