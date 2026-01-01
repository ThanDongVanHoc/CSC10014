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
    // 1. Logic lấy tiêu đề
    const rawTitle =
      c.title ||
      (c.messages && c.messages[0]
        ? c.messages[0].text.slice(0, 30)
        : "New chat");

    // 2. Cắt chuỗi
    const title =
      rawTitle.length > 30 ? rawTitle.slice(0, 30) + "..." : rawTitle;

    if (f && !title.toLowerCase().includes(f)) return;

    const item = document.createElement("div");
    item.className = "convo-item" + (c.id == State.selectedId ? " active" : "");

    // 3. Render HTML
    item.innerHTML = `
            <div class="chat-item">
                <div style="overflow: hidden; display: flex; flex-direction: column; justify-content: center;">
                    <div class="convo-title" style="display: flex; align-items: center; gap: 8px;">
                        <i class="far fa-comment-dots" style="font-size: 13px; color: #94a3b8; min-width: 14px;"></i>
                        <span class="title-text">${title}</span>
                    </div>
                    <div class="convo-sub" style="padding-left: 22px;">${formatTime(
      c.updated_at
    )}</div>
                </div>
                <div class="chat-options" style="padding-left: 8px;"><span class="dots">⋯</span></div>
            </div>`;

    // Sự kiện click vào item (Mở chat)
    item.addEventListener("click", (e) => {
      if (e.target.closest(".chat-options") || e.target.closest(".dots"))
        return;
      hideSearchWrapper();
      State.selectedId = c.id;
      if (DOM.searchInput) DOM.searchInput.value = "";
      renderSidebar();
      loadSelectedChatToUI();
    });

    // Sự kiện click vào nút 3 chấm (Mở menu)
    const dots = item.querySelector(".dots");
    dots.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("🖱️ Clicked Dots for chat:", c.id);
      // QUAN TRỌNG: Truyền trực tiếp 'item' vào để không phải đi tìm nữa
      createDropdownMenu(e, c, item);
    });

    DOM.convoListEl.appendChild(item);
  });
}

// Thêm tham số targetRowDOM để biết chính xác dòng nào đang được thao tác
function createDropdownMenu(event, convo, targetRowDOM) {
  const dotsBtn = event.currentTarget || event.target;

  // Xóa menu cũ
  document.querySelectorAll(".chat-dropdown-menu").forEach((e) => e.remove());
  document
    .querySelectorAll(".dots")
    .forEach((e) => e.classList.remove("dots-active"));

  dotsBtn.classList.add("dots-active");

  const menu = document.createElement("div");
  menu.className = "chat-dropdown-menu";

  // Style menu
  menu.style.cssText = `
      display: block; 
      position: fixed; 
      z-index: 99999; /* Cực cao để đè mọi thứ */
      background: white; 
      border: 1px solid #e2e8f0; 
      border-radius: 8px; 
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); 
      padding: 6px; 
      min-width: 130px;
  `;

  menu.innerHTML = `
    <button class="rename" style="display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:10px 12px; background:none; border:none; cursor:pointer; color:#334155; font-size:14px; border-radius:6px;">
        <span>📝</span> Rename
    </button>
    <button class="delete" style="display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:10px 12px; background:none; border:none; cursor:pointer; color:#ef4444; font-size:14px; border-radius:6px;">
        <span>🗑️</span> Delete
    </button>
  `;

  // Hover effect
  menu.querySelectorAll("button").forEach((btn) => {
    btn.onmouseenter = () => (btn.style.background = "#f1f5f9");
    btn.onmouseleave = () => (btn.style.background = "none");
  });

  // Tính vị trí
  const rect = dotsBtn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 5}px`;
  if (rect.left + 150 > window.innerWidth) {
    menu.style.left = `${rect.right - 140}px`;
  } else {
    menu.style.left = `${rect.left}px`;
  }

  document.body.appendChild(menu);

  // --- XỬ LÝ RENAME ---
  menu.querySelector(".rename").onclick = (e) => {
    e.stopPropagation();
    console.log("✏️ Clicked Rename");
    cleanup();

    // Dùng targetRowDOM đã truyền vào, không dùng closest() nữa
    const titleTextEl = targetRowDOM.querySelector(".title-text");
    const parentEl = targetRowDOM.querySelector(".convo-title");

    if (!parentEl) {
      console.error("❌ Cannot find title element");
      return;
    }

    const input = document.createElement("input");
    input.value = convo.title || "New chat";
    input.style.cssText =
      "width:100%; padding:2px 4px; border:1px solid #0078ff; border-radius:4px; font-size:14px; outline:none;";

    if (titleTextEl) titleTextEl.style.display = "none";
    parentEl.appendChild(input);

    input.focus();
    input.select();
    input.onclick = (evt) => evt.stopPropagation();

    const save = async () => {
      const newName = input.value.trim();
      console.log("💾 Saving name:", newName);
      if (newName && newName !== convo.title) {
        await DataManager.rename(convo.id, newName);
        if (convo.id == State.selectedId) {
          DOM.convTitle.textContent =
            newName.slice(0, 30) + (newName.length > 30 ? "..." : "");
        }
      }
      renderSidebar();
      showChatToastMessage("Renamed successfully!", true);
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        input.blur();
      }
    });
  };

  // --- XỬ LÝ DELETE ---
  menu.querySelector(".delete").onclick = async (e) => {
    e.stopPropagation();
    console.log("🗑️ Clicked Delete");
    if (confirm("Delete this conversation?")) {
      await DataManager.delete(convo.id);
      if (State.selectedId == convo.id) {
        State.selectedId =
          State.conversations.length > 0 ? State.conversations[0].id : null;
        loadSelectedChatToUI();
      }
      renderSidebar();
      showChatToastMessage("Deleted successfully!", true);
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

function showChatToastMessage(message, isSuccess = true) {
  const toast = document.getElementById("chat-toast-box");
  if (!toast) return;

  const msgElement = toast.querySelector(".toast-message");
  const iconContainer = toast.querySelector(".toast-icon-container");

  msgElement.innerText = message;

  if (isSuccess) {
    iconContainer.style.backgroundColor = "#ecfdf5";
    iconContainer.style.color = "#00AEEF";
    iconContainer.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } else {
    iconContainer.style.backgroundColor = "#fef2f2";
    iconContainer.style.color = "#ef4444";
    iconContainer.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  }

  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}
