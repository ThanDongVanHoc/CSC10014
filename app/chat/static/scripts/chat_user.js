// ==========================
// Chat system for logged-in user
// ==========================

let conversations = [];
let selectedId = null;

let convoListEl, searchInput, btnNew, convTitle;
let chatMessages, chatInput, sendBtn, hideBtn, showBtn, app;


// ====== Helper ======
function appendMessageToUI(role, text) {
    const doc = document.createElement('div');
    doc.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    doc.innerHTML = text.replace(/\n/g, '<br>');
    chatMessages.appendChild(doc);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// ====== API CALLS ======
async function fetchConversations() {
    try {
        const resp = await fetch('/chat/messages');
        if (!resp.ok) throw new Error('Cannot load conversation list');
        const data = await resp.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Error loading conversation list:", e);
        return [];
    }
}

async function fetchMessages(convoId) {
    try {
        const resp = await fetch(`/chat/messages/${convoId}`);
        if (!resp.ok) throw new Error('Cannot load messages');
        const data = await resp.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Error loading messages:", e);
        return [];
    }
}

async function createConversation(title = "New chat") {
    try {
        const resp = await fetch('/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        if (!resp.ok) throw new Error('Cannot create conversation');
        const data = await resp.json();
        conversations.unshift(data);
        selectedId = data.id;
        renderConversations(searchInput.value);
        await loadSelectedConversation();
        return data;
    } catch (e) {
        console.error("Error creating conversation:", e);
        return null;
    }
}

async function deleteConversation(id) {
    try {
        await fetch(`/chat/messages/${id}`, { method: 'DELETE' });
        conversations = conversations.filter(c => c.id !== id);
        if (selectedId === id) selectedId = conversations.length ? conversations[0].id : null;
        renderConversations(searchInput.value);
        await loadSelectedConversation();
    } catch (e) {
        console.error("Error deleting conversation:", e);
    }
}

async function sendMessage(message) {
    if (!message.trim()) return;

    // Nếu chưa có conversation nào thì tạo mới với title tạm
    if (!selectedId) {
        const resp = await fetch('/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "New chat"   // lúc này cứ để tạm
            })
        });
        const data = await resp.json();
        selectedId = data.id;
        conversations.unshift(data);
        renderConversations(searchInput.value);
    }

    appendMessageToUI('user', message);
    chatInput.value = '';

    try {
        const resp = await fetch('/chat/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, convo_id: selectedId })
        });
        const data = await resp.json();
        const reply = data.reply || 'No response from server.';
        appendMessageToUI('bot', reply);

        // 🔹 Auto rename lần đầu:
        const conv = conversations.find(c => c.id === selectedId);
        if (conv && (!conv.title || conv.title === 'New chat')) {
            const newTitle = message.slice(0, 40);

            // gọi API rename trên backend
            await fetch(`/chat/messages/${selectedId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });

            conv.title = newTitle;
            renderConversations(searchInput.value);
        }

    } catch (e) {
        console.error("Error sending message:", e);
        appendMessageToUI('bot', '⚠️ Lỗi kết nối tới server.');
    }
}



// ====== UI RENDER ======
async function loadSelectedConversation() {
    chatMessages.innerHTML = '';
    const conv = conversations.find(c => c.id === selectedId);
    if (!conv) {
        convTitle.textContent = 'No chat selected';
        return;
    }
    convTitle.textContent = conv.title || 'New chat';
    const messages = await fetchMessages(selectedId);
    messages.forEach(m => appendMessageToUI(m.role, m.content));
}

function renderConversations(filter = '') {
    convoListEl.innerHTML = '';
    const f = filter.trim().toLowerCase();

    conversations.forEach(c => {
        const title = c.title || 'New chat';
        if (f && !title.toLowerCase().includes(f) && !String(c.id).includes(f)) return;

        const doc = document.createElement('div');
        doc.className = 'convo-item' + (c.id === selectedId ? ' active' : '');
        doc.dataset.id = c.id;
        doc.innerHTML = `
            <div class="chat-item">
                <div>
                    <div class="convo-title">${title}</div>
                    <div class="convo-sub">${c.updated_at ? new Date(c.updated_at).toLocaleString() : ''}</div>
                </div>
                <div class="chat-options">
                    <span class="dots">⋯</span>
                </div>
            </div>
        `;

        convoListEl.appendChild(doc);

        // Dropdown menu
        const dots = doc.querySelector('.dots');
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';
        dropdownMenu.innerHTML = `
            <button class="rename">📝 Rename</button>
            <button class="delete">🗑️ Delete</button>
        `;
        document.body.appendChild(dropdownMenu);

        dots.addEventListener('click', e => {
            e.stopPropagation();
            document.querySelectorAll(".dropdown-menu").forEach(m => m.style.display = 'none');
            const rect = dots.getBoundingClientRect();
            dropdownMenu.style.display = 'block';
            dropdownMenu.style.position = 'fixed';
            dropdownMenu.style.top = `${rect.bottom + 4}px`;
            dropdownMenu.style.left = `${rect.right - dropdownMenu.offsetWidth}px`;

            dropdownMenu.querySelector('.rename').onclick = async () => {
                const newName = prompt("Enter new name:", c.title);
                if (newName && newName.trim()) {
                    await fetch(`/chat/messages/${c.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: newName.trim() })
                    });
                    c.title = newName.trim();
                    renderConversations(searchInput.value);
                }
                dropdownMenu.style.display = 'none';
            };

            dropdownMenu.querySelector('.delete').onclick = async () => {
                if (confirm("Delete this chat?")) {
                    await deleteConversation(c.id);
                }
                dropdownMenu.style.display = 'none';
            };
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('.dots') && !e.target.closest('.dropdown-menu')) {
                dropdownMenu.style.display = 'none';
            }
        });

        doc.addEventListener('click', async () => {
            selectedId = c.id;
            renderConversations(filter);
            await loadSelectedConversation();
        });
    });

    if (!selectedId && conversations.length) {
        selectedId = conversations[0].id;
        loadSelectedConversation();
    }
}


// ====== INIT ======
export async function initChat() {
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

    conversations = await fetchConversations();
    selectedId = conversations.length ? conversations[0].id : null;

    renderConversations();

    btnNew.addEventListener('click', () => createConversation('New chat'));

    searchInput.addEventListener('input', e => renderConversations(e.target.value));

    hideBtn.addEventListener('click', () => {
        app.classList.add('sidebar-hidden');
        showBtn.style.display = 'block';
    });

    showBtn.addEventListener('click', () => {
        app.classList.remove('sidebar-hidden');
        showBtn.style.display = 'none';
    });

    sendBtn.addEventListener('click', () => {
        const txt = chatInput.value.trim();
        if (!txt) return;
        sendMessage(txt);
    });

    chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendBtn.click();
        }
    });
}
