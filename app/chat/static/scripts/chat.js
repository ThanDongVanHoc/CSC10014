const GUEST_STORAGE_KEY = "con_cho_cao_bang_pc"; // Key cho sessionStorage
let isLoggedIn = false;

import { startGuideFlow } from "./guide_manager.js"; // Nhớ import ở đầu file

// Mock mode flag: default false. Can be toggled from console or UI checkbox.
window.USE_MOCK_CHAT_RESPONSE = window.USE_MOCK_CHAT_RESPONSE || false;

let conversations = [];
let selectedId = null;
let pinLocationToMapFn = null;

// DOM Elements
let convoListEl, searchInput, btnNew, convTitle;
let chatMessages, chatInput, sendBtn, hideBtn, showBtn, app;

// ======================================================
// 1. DATA MANAGER (ADAPTER PATTERN)
// ======================================================
const DataManager = {
  // Kiểm tra trạng thái đăng nhập từ server
  async checkAuth() {
    try {
      const res = await fetch("/chat/auth_status");
      const data = await res.json();
      isLoggedIn = data.logged_in;
    } catch (e) {
      console.warn("Auth check failed, defaulting to Guest.", e);
      isLoggedIn = false;
    }
  },

  // Lấy danh sách hội thoại
  async getConversations() {
    if (isLoggedIn) {
      // USER: Gọi API lấy từ DB
      try {
        const res = await fetch("/chat/messages");
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    } else {
      // GUEST: Lấy từ sessionStorage
      try {
        const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }
  },

  // Lấy chi tiết tin nhắn của 1 hội thoại
  async getMessages(convoId) {
    if (isLoggedIn) {
      // USER: Gọi API
      try {
        const res = await fetch(`/chat/messages/${convoId}`);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    } else {
      // GUEST: Tìm trong mảng local
      const c = conversations.find((x) => x.id == convoId); // Dùng == để bắt cả chuỗi và số
      return c
        ? c.messages.map((m) => ({ role: m.role, content: m.text }))
        : [];
    }
  },

  // Tạo hội thoại mới
  async create(title) {
    if (isLoggedIn) {
      // USER: Gọi API POST
      try {
        const res = await fetch("/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        return await res.json();
      } catch (e) {
        return null;
      }
    } else {
      // GUEST: Tạo object local
      const now = Date.now();
      const newChat = {
        id: "guest-" + now + Math.random().toString(36).substr(2, 5),
        title: title,
        messages: [],
        created_at: now, // Đã fix: Thêm thời gian tạo
        updated_at: now,
      };
      return newChat;
    }
  },

  // Xóa hội thoại
  async delete(id) {
    if (isLoggedIn) {
      await fetch(`/chat/messages/${id}`, { method: "DELETE" });
    }
    conversations = conversations.filter((c) => c.id != id);
    this.saveGuestData();
  },

  // Đổi tên hội thoại
  async rename(id, newTitle) {
    if (isLoggedIn) {
      await fetch(`/chat/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    }
    const c = conversations.find((x) => x.id == id);
    if (c) c.title = newTitle;
    this.saveGuestData();
  },

  saveGuestData() {
    if (!isLoggedIn) {
      sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(conversations));
    }
  },
};

// ======================================================
// 2. HELPER FUNCTIONS
// ======================================================

function getLocationOrDefault() {
  return new Promise((resolve) => {
    let fallback = { lat: 10.7769, lng: 106.7009 }; // HCM
    if (!navigator.geolocation) return resolve(fallback);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("GPS Error:", err);
        resolve(fallback);
      }
    );
  });
}

export function setMapReference(fn) {
  pinLocationToMapFn = fn;
}

// Helper function để ẩn search wrapper - Export để dùng ở map.js
export function hideSearchWrapper() {
  const searchWrapper = document.getElementById("searchWrapper");
  const searchInput = document.getElementById("searchInput");
  if (searchWrapper) searchWrapper.style.display = "none";
  if (searchInput) searchInput.value = "";
}

// ======================================================
// 3. CORE LOGIC (SEND MESSAGE) - FINAL VERSION
// ======================================================

async function sendMessage(text) {
  if (!text.trim()) return;

  // Ẩn ô search khi gửi tin nhắn
  hideSearchWrapper();

  // 1. UI: Hiện tin nhắn User ngay
  appendMessageToUI("user", text);
  chatInput.value = "";

  // 2. Tạo chat mới nếu cần
  if (!selectedId) {
    const newChat = await DataManager.create("New chat");
    if (newChat) {
      conversations.unshift(newChat);
      selectedId = newChat.id;
      DataManager.saveGuestData();
      renderSidebar();
    }
  }

  // 3. GUEST: Lưu tin nhắn User vào local
  let currentChat = conversations.find((c) => c.id == selectedId);
  if (!isLoggedIn && currentChat) {
    const now = Date.now();
    currentChat.messages.push({ role: "user", text: text, created_at: now });
    currentChat.updated_at = now;
    if (currentChat.messages.length === 1)
      currentChat.title = text.slice(0, 40);
    DataManager.saveGuestData();
    renderSidebar();
  }

  // 4. Loading
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg bot loading";
  loadingDiv.innerHTML = `<span class="ai-icon">✨</span><div class="ai-loader"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>`;
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const { lat, lng } = await getLocationOrDefault();

    // 5. Gửi lên Server hoặc dùng Mock response
    let data;
    if (window.USE_MOCK_CHAT_RESPONSE) {
      // Mock mode: Load từ file JSON
      try {
        const resp = await fetch(
          "/chat/static/mock_responses/sample_chat_response.json"
        );
        data = await resp.json();
      } catch (e) {
        console.error("Failed to load mock response:", e);
        data = { reply: "Lỗi khi tải mock response.", locations: [] };
      }
    } else {
      // Real mode: Gửi lên Server (Server sẽ TỰ LƯU tin nhắn vào DB cho User)
      const res = await fetch("/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          convo_id: selectedId,
          user_lat: lat,
          user_lng: lng,
        }),
      });
      data = await res.json();
    }

    loadingDiv.remove();

    const reply = data.reply || "Không có phản hồi.";
    const locations = data.locations || [];

    // If the backend provided a guide object, and front-end has guide_manager,
    // open the guide flow using sample data (this makes step-by-step interactive)
    if (data.guide && window.startGuideFlowFromData) {
      window.startGuideFlowFromData(data.guide);
    }

    // 6. Đồng bộ ID (nếu vừa tạo chat mới)
    if (data.convo_id && data.convo_id != selectedId) {
      selectedId = data.convo_id;
      if (isLoggedIn) conversations = await DataManager.getConversations();
    }

    // 7. USER: Cập nhật thời gian & Tên (để Sidebar nhảy lên đầu)
    // (Đây là đoạn bổ sung để UI của User mượt hơn)
    if (isLoggedIn) {
      const conv = conversations.find((c) => c.id == selectedId);
      if (conv) {
        // Cập nhật giờ để sidebar sort lại
        conv.updated_at = new Date().toISOString();

        // Auto rename
        if (conv.title === "New chat" || !conv.title) {
          const newTitle = text.slice(0, 40);
          await DataManager.rename(selectedId, newTitle);
          if (convTitle) convTitle.textContent = newTitle;
        }
        // Vẽ lại sidebar để thấy thay đổi
        renderSidebar(searchInput.value);
      }
    }

    // 8. Hiển thị tin Bot
    appendMessageToUI("model", reply);

    // 9. GUEST: Lưu tin Bot vào local
    currentChat = conversations.find((c) => c.id == selectedId);
    if (!isLoggedIn && currentChat) {
      const now = Date.now();
      currentChat.messages.push({
        role: "model",
        text: reply,
        created_at: now,
      });
      currentChat.updated_at = now;
      DataManager.saveGuestData();
      // Guest cũng cần vẽ lại sidebar để cập nhật giờ
      renderSidebar();
    }

    // 10. Vẽ thẻ địa điểm
    if (locations.length > 0) {
      appendLocationCardsToUI(locations);
    }
  } catch (e) {
    console.error(e);
    loadingDiv.remove();
    appendMessageToUI("model", "Lỗi kết nối server.");
  }
}

// ======================================================
// 4. UI RENDERING
// ======================================================

function appendMessageToUI(role, text) {
  const doc = document.createElement("div");
  doc.className = "msg " + (role === "user" ? "user" : "bot");
  doc.innerHTML = text.replace(/\n/g, "<br>");
  chatMessages.appendChild(doc);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hàm vẽ thẻ địa điểm (Đã cập nhật logic click và hiển thị chi tiết)
function appendLocationCardsToUI(locations) {
  const container = document.createElement("div");
  container.className = "locations-container";

  const statusHeader = document.createElement("p");
  statusHeader.className = "location-status";
  statusHeader.textContent = `Tìm thấy ${locations.length} địa điểm liên quan:`;
  container.appendChild(statusHeader);

  locations.forEach((loc) => {
    const card = document.createElement("div");
    card.className = "location-card";
    card.style.cursor = "pointer";

    const distance = loc.raw_distance_km ? loc.raw_distance_km.toFixed(1) : "?";
    const phoneLink = loc.SDT
      ? `<a href="tel:${loc.SDT}">${loc.SDT}</a>`
      : "Không có";

    const webLink = loc.Website
      ? `<a href="${
          loc.Website.startsWith("http") ? loc.Website : "//" + loc.Website
        }" target="_blank">Website</a>`
      : "";

    card.innerHTML = `
            <h3>${loc.Ten}</h3>
            <p class="address">${loc.DiaChi}</p>
            <p class="phone">SĐT: ${phoneLink}</p>
            <div class="card-footer">
                <div class="links">
                    ${webLink}
                    <a href="#" class="map-link" data-lat="${loc.Lat}" data-lng="${loc.Lng}">
                        Xem trên Bản đồ
                    </a>
                </div>
                 <button class="btn-guide-trigger" style="border:1px solid #0078ff; color:#0078ff; background:white; padding:6px 10px; border-radius:6px; cursor:pointer;">
                    <i class="fas fa-list-check"></i> Hướng dẫn
                </button>
            </div>
        `;

    // Map link click
    const mapLinkEl = card.querySelector(".map-link");
    mapLinkEl.addEventListener("click", (e) => {
      e.preventDefault();
      if (pinLocationToMapFn) {
        pinLocationToMapFn(
          loc.Lat,
          loc.Lng,
          loc.Ten,
          loc.SDT,
          loc.Website,
          loc.raw_distance_km
        );
      }
    });

    // Guide button click
    const guideBtn = card.querySelector(".btn-guide-trigger");
    guideBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startGuideFlow(loc.Ten);
    });

    // Click vào thẻ (trừ link và button)
    card.addEventListener("click", (e) => {
      if (e.target.tagName === "A" || e.target.closest(".btn-guide-trigger"))
        return;
      if (pinLocationToMapFn) {
        pinLocationToMapFn(
          loc.Lat,
          loc.Lng,
          loc.Ten,
          loc.SDT,
          loc.Website,
          loc.raw_distance_km
        );
      }
    });

    container.appendChild(card);
  });

  chatMessages.appendChild(container);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadSelectedChatToUI() {
  chatMessages.innerHTML = "";

  if (!selectedId) {
    convTitle.textContent = "New chat";
    return;
  }

  const current = conversations.find((c) => c.id == selectedId);
  const rawTitle = current ? current.title || "Conversation" : "Loading...";

  // Cắt title nếu quá dài và thêm dấu "..."
  const maxLength = 20;
  convTitle.textContent =
    rawTitle.length > maxLength
      ? rawTitle.slice(0, maxLength) + "..."
      : rawTitle;

  const msgs = await DataManager.getMessages(selectedId);
  msgs.forEach((m) => appendMessageToUI(m.role, m.content));
}

// ======================================================
// HELPER: Format thời gian (Giờ:Phút Ngày/Tháng/Năm)
// ======================================================
function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear(); // <--- Lấy năm đầy đủ (2025)

  // Kết quả: "13:30 04/12/2025"
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

// ======================================================
// CẬP NHẬT HÀM RENDER SIDEBAR
// ======================================================
function renderSidebar(filter = "") {
  convoListEl.innerHTML = "";
  const f = filter.trim().toLowerCase();

  // Sắp xếp: Cái nào mới cập nhật (updated_at) thì lên đầu
  // (Thêm đoạn sort này để sidebar luôn đúng thứ tự thời gian)
  conversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  conversations.forEach((c) => {
    const rawTitle =
      c.title ||
      (c.messages && c.messages[0]
        ? c.messages[0].text.slice(0, 20)
        : "New chat");

    // Cắt tên nếu quá dài và thêm dấu "..."
    const maxLength = 20; // Độ dài tối đa
    const title =
      rawTitle.length > maxLength
        ? rawTitle.slice(0, maxLength) + "..."
        : rawTitle;

    if (f && !title.toLowerCase().includes(f)) return;

    const item = document.createElement("div");
    // Lưu ý: dùng == để so sánh lỏng (vì ID có thể là string hoặc number)
    item.className = "convo-item" + (c.id == selectedId ? " active" : "");

    // --- SỬA Ở ĐÂY: Gọi hàm formatTime thay vì toLocaleDateString ---
    item.innerHTML = `
            <div class="chat-item">
                <div>
                    <div class="convo-title">${title}</div>
                    <div class="convo-sub">${formatTime(c.updated_at)}</div>
                </div>
                <div class="chat-options"><span class="dots">⋯</span></div>
            </div>
        `;

    item.addEventListener("click", (e) => {
      // Ngăn chặn nếu bấm vào nút options thì không chọn chat
      if (e.target.closest(".chat-options")) return;

      // Ẩn ô search khi chọn conversation
      hideSearchWrapper();

      selectedId = c.id;
      // Xóa filter để hiện lại tất cả conversations
      if (searchInput) searchInput.value = "";
      renderSidebar();
      loadSelectedChatToUI();
    });

    // Dropdown Menu
    const dots = item.querySelector(".dots");
    dots.addEventListener("click", (e) => {
      e.stopPropagation();
      createDropdownMenu(e, c);
    });

    convoListEl.appendChild(item);
  });
}

function createDropdownMenu(event, convo) {
  // Lấy cái nút 3 chấm được bấm
  // Dùng currentTarget an toàn hơn target nếu trong nút có icon <i>
  const dotsBtn = event.currentTarget || event.target;

  // 1. KIỂM TRA TRẠNG THÁI TRƯỚC KHI DỌN DẸP
  // Kiểm tra xem nút này có đang 'active' (đang mở menu) không?
  const isAlreadyOpen = dotsBtn.classList.contains("dots-active");

  // 2. DỌN DẸP: Đóng tất cả menu đang mở khác
  document.querySelectorAll(".dropdown-menu").forEach((e) => e.remove());
  document
    .querySelectorAll(".dots")
    .forEach((e) => e.classList.remove("dots-active"));

  // 3. LOGIC TOGGLE:
  // Nếu nút này vừa nãy đang mở -> Thì bây giờ đóng lại (đã xóa ở bước 2 rồi) -> Dừng hàm luôn.
  if (isAlreadyOpen) {
    return;
  }

  // 4. TẠO MỚI (Chỉ chạy xuống đây nếu menu chưa mở)
  // Đánh dấu nút này đang active
  dotsBtn.classList.add("dots-active");

  const menu = document.createElement("div");
  menu.className = "dropdown-menu";
  menu.style.display = "block";
  menu.style.position = "fixed";
  menu.innerHTML = `
        <button class="rename">📝 Rename</button>
        <button class="delete">🗑️ Delete</button>
    `;

  const rect = dotsBtn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 5}px`;
  menu.style.left = `${rect.left}px`; // Canh lề trái theo nút
  // Hoặc nếu muốn menu thò sang trái cho đỡ bị tràn màn hình:
  // menu.style.left = `${rect.right - 100}px`;

  document.body.appendChild(menu);

  // --- Sự kiện Rename ---
  menu.querySelector(".rename").onclick = async () => {
    cleanup();

    // Tìm element title của conversation này để edit inline
    const convoItem = dotsBtn.closest(".convo-item");
    const titleEl = convoItem.querySelector(".convo-title");

    if (!titleEl) return;

    const originalText = convo.title || "New chat";
    const maxDisplayLength = 25; // Chỉ dùng để hiển thị, không giới hạn input

    // Tạo input để edit trực tiếp
    const input = document.createElement("input");
    input.type = "text";
    input.value = originalText;
    // Không set maxLength để cho phép nhập dài bao nhiêu cũng được
    input.style.cssText =
      "width: 100%; padding: 4px; border: 1px solid #0078ff; border-radius: 4px; font-size: inherit;";

    titleEl.textContent = "";
    titleEl.appendChild(input);
    input.focus();
    input.select();

    const saveRename = async () => {
      const newName = input.value.trim();
      if (newName && newName !== originalText) {
        // Lưu tên đầy đủ vào database
        await DataManager.rename(convo.id, newName);
        // Nhưng chỉ hiển thị tối đa 25 ký tự với dấu ...
        if (convo.id == selectedId && typeof convTitle !== "undefined") {
          const displayTitle =
            newName.length > maxDisplayLength
              ? newName.slice(0, maxDisplayLength) + "..."
              : newName;
          convTitle.textContent = displayTitle;
        }
      }
      renderSidebar();
    };

    input.addEventListener("blur", saveRename);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      } else if (e.key === "Escape") {
        renderSidebar();
      }
    });
  };

  // --- Sự kiện Delete ---
  menu.querySelector(".delete").onclick = async () => {
    if (confirm("Xóa cuộc trò chuyện này?")) {
      await DataManager.delete(convo.id);
      if (selectedId == convo.id) {
        // Nếu xóa đúng chat đang xem -> reset
        selectedId = conversations.length > 0 ? conversations[0].id : null;
        if (typeof loadSelectedChatToUI === "function") loadSelectedChatToUI();
      }
      renderSidebar();
    }
    cleanup();
  };

  // Hàm dọn dẹp tiện ích
  function cleanup() {
    menu.remove();
    dotsBtn.classList.remove("dots-active");
  }

  // Sự kiện click ra ngoài để đóng
  // setTimeout để nó không bắt ngay sự kiện click hiện tại
  setTimeout(() => {
    const closeMenu = (e) => {
      // Nếu click vào chính cái menu hoặc nút dots thì không làm gì (để logic trên xử lý)
      if (menu.contains(e.target)) return;
      if (dotsBtn.contains(e.target)) return;

      cleanup();
      document.removeEventListener("click", closeMenu);
    };
    document.addEventListener("click", closeMenu);
  }, 0);
}

// ======================================================
// 5. INIT
// ======================================================

export async function initChat() {
  // 1. Lấy các Element từ DOM
  convoListEl = document.getElementById("convoList");
  searchInput = document.getElementById("searchInput");
  const searchWrapper = document.getElementById("searchWrapper"); // Thêm element wrapper
  btnNew = document.getElementById("btnNew");
  convTitle = document.getElementById("convTitle");
  chatMessages = document.getElementById("chatMessages");
  chatInput = document.getElementById("chatInput");
  sendBtn = document.getElementById("sendBtn");
  hideBtn = document.getElementById("hideBtn");
  app = document.querySelector(".app");

  // Element mới (Logo và Nút tìm kiếm trên sidebar)
  const brandToggle = document.getElementById("brandToggle");
  const btnSearchTrigger = document.getElementById("btnSearchTrigger");

  // 2. Kiểm tra Auth và Lấy dữ liệu
  await DataManager.checkAuth();
  console.log(
    "Chat Mode:",
    isLoggedIn ? "USER (Database)" : "GUEST (SessionStorage)"
  );

  conversations = await DataManager.getConversations();
  if (conversations.length > 0) {
    selectedId = conversations[0].id;
    await loadSelectedChatToUI();
  }
  renderSidebar();

  // ======================================================
  // 3. LOGIC XỬ LÝ SIDEBAR (EXPAND / COLLAPSE)
  // ======================================================

  // Hàm mở sidebar: Xóa class ẩn để sidebar bung rộng ra
  const expandSidebar = () => {
    if (app.classList.contains("sidebar-hidden")) {
      app.classList.remove("sidebar-hidden");
    }
  };

  // Sự kiện nút Đóng (Collapse): Thêm class để thu nhỏ thành thanh icon
  if (hideBtn) {
    hideBtn.addEventListener("click", () => {
      app.classList.add("sidebar-hidden");
      // Ẩn ô search khi đóng sidebar
      hideSearchWrapper();
    });
  }

  // Sự kiện Click vào Logo (khi đang đóng -> mở ra)
  if (brandToggle) {
    brandToggle.addEventListener("click", () => {
      // TRƯỜNG HỢP 1: Nếu Sidebar đang ĐÓNG (có class sidebar-hidden)
      if (app.classList.contains("sidebar-hidden")) {
        // -> Chỉ đơn giản là mở nó ra
        expandSidebar();
      }

      // TRƯỜNG HỢP 2: Nếu Sidebar đang MỞ (không có class sidebar-hidden)
      else {
        // -> Thực hiện chức năng "Tạo đoạn chat mới" (Reset giao diện)
        selectedId = null;
        chatMessages.innerHTML = "";
        convTitle.textContent = "New chat";
        renderSidebar();

        // Ẩn ô search khi click vào Logo
        hideSearchWrapper();

        // Tiện tay focus luôn vào ô nhập liệu cho người dùng gõ
        if (chatInput) chatInput.focus();
      }
    });
  }

  // ======================================================
  // 4. LOGIC CÁC CHỨC NĂNG (NEW CHAT, SEARCH, SEND)
  // ======================================================

  // Nút New Chat: Mở sidebar (nếu đóng) -> Reset giao diện chat
  if (btnNew) {
    btnNew.addEventListener("click", async () => {
      expandSidebar(); // Đảm bảo sidebar mở ra
      selectedId = null;
      chatMessages.innerHTML = "";
      convTitle.textContent = "New chat";
      renderSidebar();

      // Ẩn ô search khi click New Chat
      hideSearchWrapper();
    });
  }

  // Nút Search (Icon kính lúp): Mở sidebar -> Hiện ô search -> Focus vào ô input
  if (btnSearchTrigger) {
    btnSearchTrigger.addEventListener("click", () => {
      expandSidebar();

      // Hiện ô search
      if (searchWrapper) searchWrapper.style.display = "block";

      // Delay nhẹ 100ms để hiệu ứng mở sidebar chạy xong rồi mới focus
      setTimeout(() => {
        if (searchInput) searchInput.focus();
      }, 100);
    });
  }

  // Sự kiện gõ vào ô tìm kiếm (lọc danh sách)
  if (searchInput) {
    searchInput.addEventListener("input", (e) => renderSidebar(e.target.value));
  }

  // Sự kiện Gửi tin nhắn (Nút Send)
  if (sendBtn) {
    sendBtn.addEventListener("click", () => sendMessage(chatInput.value));
  }

  // Sự kiện Gửi tin nhắn (Phím Enter)
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage(chatInput.value);
      }
    });
  }

  // Thêm Mock Toggle UI (để test không cần backend)
  try {
    const mockToggleLabel = document.createElement("label");
    mockToggleLabel.style.marginLeft = "8px";
    mockToggleLabel.style.fontSize = "13px";
    mockToggleLabel.innerHTML = `<input type="checkbox" id="mockToggle" ${
      window.USE_MOCK_CHAT_RESPONSE ? "checked" : ""
    }> Use mock`;
    if (btnNew && btnNew.parentNode)
      btnNew.parentNode.appendChild(mockToggleLabel);
    const mockToggle = document.getElementById("mockToggle");
    if (mockToggle) {
      mockToggle.addEventListener("change", (e) => {
        window.USE_MOCK_CHAT_RESPONSE = e.target.checked;
        console.log("USE_MOCK_CHAT_RESPONSE =", window.USE_MOCK_CHAT_RESPONSE);
      });
    }
  } catch (e) {
    console.warn("Could not add mock toggle UI", e);
  }
}
