import { State, DOM } from "../services/core.js";
import { DataManager } from "../services/data.js";
import { hideSearchWrapper, loadSelectedChatToUI } from "../logic.js";

// --- Hàm Helper hiển thị Toast ---
function showToast(message) {
  const toast = document.getElementById("translateToast");
  if (!toast) return;

  // Set nội dung
  const msgEl = toast.querySelector(".toast-message");
  if (msgEl) msgEl.textContent = message;

  // Hiển thị
  toast.classList.add("show");

  // Tự động ẩn sau 3 giây
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

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
    // Logic lấy tiêu đề
    const rawTitle =
      c.title ||
      (c.messages && c.messages[0]
        ? (c.messages[0].content || c.messages[0].text || "").slice(0, 30)
        : "New Translation");

    const title =
      rawTitle.length > 30 ? rawTitle.slice(0, 30) + "..." : rawTitle;

    if (f && !title.toLowerCase().includes(f)) return;

    const item = document.createElement("div");
    item.className = "convo-item" + (c.id == State.selectedId ? " active" : "");
    item.dataset.id = c.id;

    // HTML Structure
    item.innerHTML = `
            <div class="chat-item" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                
                <div style="overflow: hidden; display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0;">
                    <div class="convo-title" style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-language" style="font-size: 13px; color: #94a3b8; min-width: 14px;"></i>
                        <span class="title-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</span>
                    </div>
                    <div class="convo-sub" style="padding-left: 22px; font-size: 12px; color: #94a3b8; margin-top: 2px;">
                        ${formatTime(c.updated_at)}
                    </div>
                </div>

                <div class="chat-options" style="padding-left: 8px; flex-shrink: 0;">
                    <span class="dots">⋯</span>
                </div>

            </div>`;

    // Sự kiện click
    item.addEventListener("click", (e) => {
      if (e.target.closest(".chat-options") || e.target.closest(".dots"))
        return;

      hideSearchWrapper();
      State.selectedId = c.id;
      if (DOM.searchInput) DOM.searchInput.value = "";
      renderSidebar();
      loadSelectedChatToUI();
    });

    // Sự kiện 3 chấm
    const dots = item.querySelector(".dots");
    if (dots) {
      dots.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        createDropdownMenu(e, c, item);
      });
    }

    DOM.convoListEl.appendChild(item);
  });
}

// Logic Menu Dropdown
function createDropdownMenu(event, convo, targetRowDOM) {
  const dotsBtn = event.currentTarget || event.target;
  document.querySelectorAll(".chat-dropdown-menu").forEach((e) => e.remove());
  if (dotsBtn.classList) dotsBtn.classList.add("dots-active");

  const menu = document.createElement("div");
  menu.className = "chat-dropdown-menu";

  menu.style.cssText = `
      display: block; position: fixed; z-index: 99999; 
      background: white; border: 1px solid #e2e8f0; 
      border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); 
      padding: 6px; min-width: 130px;
  `;

  menu.innerHTML = `
    <button class="rename" style="display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:10px 12px; background:none; border:none; cursor:pointer; color:#334155; font-size:14px; border-radius:6px;">
        <span>📝</span> Rename
    </button>
    <button class="delete" style="display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:10px 12px; background:none; border:none; cursor:pointer; color:#ef4444; font-size:14px; border-radius:6px;">
        <span>🗑️</span> Delete
    </button>
  `;

  menu.querySelectorAll("button").forEach((btn) => {
    btn.onmouseenter = () => (btn.style.background = "#f1f5f9");
    btn.onmouseleave = () => (btn.style.background = "none");
  });

  const rect = dotsBtn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 5}px`;
  if (rect.left + 150 > window.innerWidth) {
    menu.style.left = `${rect.right - 140}px`;
  } else {
    menu.style.left = `${rect.left}px`;
  }

  document.body.appendChild(menu);

  // --- RENAME LOGIC ---
  menu.querySelector(".rename").onclick = (e) => {
    e.stopPropagation();
    cleanup();
    const titleTextEl = targetRowDOM.querySelector(".title-text");
    const parentEl = targetRowDOM.querySelector(".convo-title");
    if (!parentEl) return;
    const input = document.createElement("input");
    input.value = convo.title || "New Translation";
    input.style.cssText =
      "width:100%; padding:2px 4px; border:1px solid #0078ff; border-radius:4px; font-size:14px; outline:none;";
    if (titleTextEl) titleTextEl.style.display = "none";
    parentEl.appendChild(input);
    input.focus();
    input.select();
    input.onclick = (evt) => evt.stopPropagation();

    const save = async () => {
      const newName = input.value.trim();
      if (newName && newName !== convo.title) {
        await DataManager.rename(convo.id, newName);
        showToast("Renamed successfully!"); // <--- THÔNG BÁO THÀNH CÔNG
      }
      renderSidebar();
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        input.blur();
      }
    });
  };

  // --- DELETE LOGIC ---
  menu.querySelector(".delete").onclick = async (e) => {
    e.stopPropagation();
    if (confirm("Delete this translation?")) {
      await DataManager.delete(convo.id);
      if (State.selectedId == convo.id) {
        State.selectedId =
          State.conversations.length > 0 ? State.conversations[0].id : null;
        loadSelectedChatToUI();
      }
      renderSidebar();
      showToast("Translation deleted!"); // <--- THÔNG BÁO THÀNH CÔNG
    }
    cleanup();
  };

  function cleanup() {
    menu.remove();
    if (dotsBtn.classList) dotsBtn.classList.remove("dots-active");
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
