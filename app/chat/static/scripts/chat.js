// =======================
// GUEST CHAT (LOCALSTORAGE)
// =======================

const STORAGE_KEY = 'con_cho_cao_bang_cai_ghe';

let conversations = [];
let selectedId = null;
let pinLocationToMapFn = null;

let convoListEl, searchInput, btnNew, convTitle;
let chatMessages, chatInput, sendBtn, hideBtn, showBtn, app;


// =======================
// Helper ID
// =======================
function uid() {
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}


// =======================
// LocalStorage load/save
// =======================
function loadConversations() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function saveConversations(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}


// =======================
// Conversation CRUD
// =======================
function createConversation(title = 'New chat') {
    const c = {
        id: uid(),
        title,
        messages: [],
        created_at: Date.now(),
        updated_at: Date.now()
    };

    conversations.unshift(c);
    selectedId = c.id;
    saveConversations(conversations);

    renderConversations(searchInput.value);
    loadSelectedConversation();

    // Clear server session (guest)
    fetch('/chat/clear_session', { method: 'POST' })
        .then(() => console.log("Server session cleared."));
}

function deleteConversation(id) {
    conversations = conversations.filter(c => c.id !== id);
    saveConversations(conversations);

    if (selectedId === id)
        selectedId = conversations.length ? conversations[0].id : null;

    renderConversations(searchInput.value);
    loadSelectedConversation();
}


// =======================
// UI loading
// =======================
function loadSelectedConversation() {
    chatMessages.innerHTML = '';

    const conv = conversations.find(c => c.id === selectedId);
    if (!conv) {
        convTitle.textContent = 'Have not chose chat';
        return;
    }

    convTitle.textContent = conv.title || 'New chat';

    conv.messages.forEach(m => {
        appendMessageToUI(m.role, m.text);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// =======================
// Sidebar render
// =======================
function renderConversations(filter = '') {
    convoListEl.innerHTML = '';
    const f = filter.trim().toLowerCase();

    conversations.forEach(c => {
        const title = c.title || (c.messages[0] ? c.messages[0].text.slice(0, 40) : 'New chat');

        if (f && !title.toLowerCase().includes(f) && !c.id.includes(f)) return;

        const doc = document.createElement('div');
        doc.className = 'convo-item' + (c.id === selectedId ? ' active' : '');
        doc.dataset.id = c.id;
        doc.innerHTML = `
            <div class="chat-item">
                <div>
                    <div class="convo-title">${title}</div>
                    <div class="convo-sub">${new Date(c.updated_at).toLocaleString()}</div>
                </div>
                <div class="chat-options">
                    <span class="dots">⋯</span>
                </div>
            </div>
        `;

        convoListEl.appendChild(doc);

        // Dropdown menu
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';
        dropdownMenu.innerHTML = `
            <button class="rename">📝 Rename</button>
            <button class="delete">🗑️ Delete</button>
        `;
        document.body.appendChild(dropdownMenu);

        const dots = doc.querySelector('.dots');

        dots.addEventListener('click', e => {
            e.stopPropagation();

            document.querySelectorAll(".dots").forEach(d => d.classList.remove("dots-active"));
            dots.classList.add("dots-active");

            document.querySelectorAll(".dropdown-menu").forEach(m => m.style.display = 'none');

            const rect = dots.getBoundingClientRect();
            dropdownMenu.style.display = 'block';
            dropdownMenu.style.position = 'fixed';
            dropdownMenu.style.top = `${rect.bottom + 4}px`;
            dropdownMenu.style.left = `${rect.right - dropdownMenu.offsetWidth}px`;

            const btnRename = dropdownMenu.querySelector(".rename");
            const btnDelete = dropdownMenu.querySelector(".delete");

            btnRename.onclick = () => {
                const newName = prompt("Enter new name:", c.title);
                if (newName && newName.trim() !== "") {
                    c.title = newName.trim();
                    saveConversations(conversations);
                    renderConversations(searchInput.value);
                }
                dropdownMenu.style.display = "none";
            };

            btnDelete.onclick = () => {
                if (confirm("Do you want to delete this chat?")) {
                    deleteConversation(c.id);
                }
                dropdownMenu.style.display = "none";
            };
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('.dots') && !e.target.closest('.dropdown-menu')) {
                dropdownMenu.style.display = 'none';
                document.querySelectorAll(".dots").forEach(d => d.classList.remove("dots-active"));
            }
        });

        doc.addEventListener('click', () => selectConversation(c.id));
    });

    if (!selectedId && conversations.length)
        selectedId = conversations[0].id;
}

function selectConversation(id) {
    selectedId = id;
    renderConversations(searchInput.value);
    loadSelectedConversation();
}


// =======================
// Add message to conversation
// =======================
function addMessageToConversation(role, text) {
    if (!selectedId) {
        createConversation('New chat');
    }

    const conv = conversations.find(c => c.id === selectedId);
    if (!conv) return;

    conv.messages.push({ role, text, t: Date.now() });
    conv.updated_at = Date.now();

    // Auto rename by first user message
    const firstUser = conv.messages.find(m => m.role === 'user');
    if (firstUser)
        conv.title = firstUser.text.slice(0, 40);

    saveConversations(conversations);
    renderConversations(searchInput.value);
}


// =======================
// UI helpers
// =======================
function appendMessageToUI(role, text) {
    const doc = document.createElement('div');
    doc.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    doc.innerHTML = text.replace(/\n/g, '<br>');

    chatMessages.appendChild(doc);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// =======================
// Location cards UI
// =======================
function appendLocationCardsToUI(locations) {
    const container = document.createElement('div');
    container.className = 'locations-container';

    const statusHeader = document.createElement('p');
    statusHeader.className = 'location-status';
    statusHeader.textContent = `Tìm thấy ${locations.length} địa điểm liên quan:`;
    container.appendChild(statusHeader);

    locations.forEach(loc => {
        const card = document.createElement('div');
        card.className = 'location-card';
        card.style.cursor = 'pointer';

        const distance = loc.raw_distance_km ? loc.raw_distance_km.toFixed(1) : '?';
        const phoneLink = loc.SDT ? `<a href="tel:${loc.SDT}">${loc.SDT}</a>` : 'Không có';
        const webLink = loc.Website
            ? `<a href="${loc.Website.startsWith('http') ? loc.Website : '//' + loc.Website}" target="_blank">Website</a>`
            : '';
        const mapLink = `https://www.google.com/maps?q=${loc.Lat},${loc.Lng}`;

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
                <span class="distance">${distance} km</span>
            </div>
        `;

        container.appendChild(card);

        // Map link click
        const mapLinkEl = card.querySelector('.map-link');
        mapLinkEl.addEventListener('click', (e) => {
            e.preventDefault();
            if (pinLocationToMapFn) {
                pinLocationToMapFn(loc.Lat, loc.Lng, loc.Ten, loc.SDT, loc.Website, loc.raw_distance_km);
            }
        });

        // Click entire card (except link)
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            if (pinLocationToMapFn) {
                pinLocationToMapFn(loc.Lat, loc.Lng, loc.Ten, loc.SDT, loc.Website, loc.raw_distance_km);
            }
        });
    });

    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// =======================
// Geolocation with await
// =======================
function getLocationOrDefault() {
    return new Promise(resolve => {
        let fallback = { lat: 10.7769, lng: 106.7009 };

        if (!navigator.geolocation) {
            return resolve(fallback);
        }

        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => {
                console.warn("Không lấy được vị trí:", err.message);
                resolve(fallback);
            }
        );
    });
}


// =======================
// SEND CHAT
// =======================
export async function sendChat(message) {
    if (!message.trim()) return;

    addMessageToConversation('user', message);
    appendMessageToUI('user', message);
    chatInput.value = '';

    // Show loading indicator
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'msg bot loading';
    loadingMsg.innerHTML = `
        <span class="ai-icon">✨</span>
        <div class="ai-loader">
            <div class="ai-dot"></div>
            <div class="ai-dot"></div>
            <div class="ai-dot"></div>
        </div>
    `;
    chatMessages.appendChild(loadingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const { lat, lng } = await getLocationOrDefault();

        const resp = await fetch('/chat/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                user_lat: lat,
                user_lng: lng
            })
        });

        const data = await resp.json();
        const reply = data.reply || 'No respond back.';
        const locations = data.locations || [];

        // Remove loading message
        loadingMsg.remove();

        addMessageToConversation('bot', reply);
        appendMessageToUI('bot', reply);

        if (locations.length > 0) {
            appendLocationCardsToUI(locations);
        }

    } catch (err) {
        console.error(err);
        loadingMsg.remove();
        const errMsg = 'Lỗi liên hệ assistant. Thử lại sau.';
        addMessageToConversation('bot', errMsg);
        appendMessageToUI('bot', errMsg);
    }
}


// =======================
// MAP connector
// =======================
export function setMapReference(pinFn) {
    pinLocationToMapFn = pinFn;
}


// =======================
// INIT
// =======================
export function initChat() {
    convoListEl = document.getElementById('convoList');
    searchInput = document.getElementById('searchInput');
    btnNew = document.getElementById('btnNew');
    convTitle = document.getElementById('convTitle');
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendBtn = document.getElementById('sendBtn');
    hideBtn = document.getElementById('hideBtn');
    showBtn = document.getElementById('showSidebar');
    app = document.querySelector('.app');

    conversations = loadConversations();
    selectedId = conversations.length ? conversations[0].id : null;

    // Create new chat
    btnNew.addEventListener('click', () => createConversation('New chat'));

    // Search
    searchInput.addEventListener('input', e => renderConversations(e.target.value));

    // Sidebar hide/show
    hideBtn.addEventListener('click', () => {
        app.classList.add('sidebar-hidden');
        showBtn.style.display = 'block';
    });

    showBtn.addEventListener('click', () => {
        app.classList.remove('sidebar-hidden');
        showBtn.style.display = 'none';
    });

    // Send button
    sendBtn.addEventListener('click', () => {
        const txt = chatInput.value.trim();
        if (!txt) return;
        sendChat(txt);
    });

    // Enter = send
    chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    renderConversations();
    loadSelectedConversation();
}
