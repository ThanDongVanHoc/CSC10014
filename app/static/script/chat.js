    /***********************
     * Conversation storage (localStorage)
     ***********************/
    const STORAGE_KEY = 'vc_conversations_v1';

    function uid() {
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
    }

    function loadConversations() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
    }
    function saveConversations(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    let conversations = loadConversations();
    let selectedId = conversations.length ? conversations[0].id : null;

    // UI refs
    const convoListEl = document.getElementById('convoList');
    const searchInput = document.getElementById('searchInput');
    const btnNew = document.getElementById('btnNew');
    const btnDeleteSelected = document.getElementById('btnDeleteSelected');
    const convTitle = document.getElementById('convTitle');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const hideBtn = document.getElementById('hideBtn');
    const showBtn = document.getElementById('showSidebar');
    const app = document.querySelector('.app');

    function renderConversations(filter='') {
    convoListEl.innerHTML = '';
    const f = filter.trim().toLowerCase();
    conversations.forEach(c => {
        const title = c.title || (c.messages[0] ? c.messages[0].text.slice(0,40) : 'New chat');
        if (f && !title.toLowerCase().includes(f) && !c.id.includes(f)) return;
        const d = document.createElement('div');
        d.className = 'convo-item' + (c.id === selectedId ? ' active' : '');
        d.dataset.id = c.id;
        d.innerHTML = `<div style="flex:1"><div class="convo-title">${title}</div><div class="convo-sub">${new Date(c.updated_at).toLocaleString()}</div></div>`;
        d.addEventListener('click', () => {
        selectConversation(c.id);
        });
        convoListEl.appendChild(d);
    });
    if (!selectedId && conversations.length) {
        selectedId = conversations[0].id;
    }
    }

function createConversation(title='Đoạn chat mới') {
    const c = {
        id: uid(),
        title,
        messages: [],
        created_at: Date.now(),
        updated_at: Date.now()
    };
    conversations.unshift(c);
    saveConversations(conversations);
    selectedId = c.id;
    renderConversations(searchInput.value);
    loadSelectedConversation();
    }

    function deleteConversation(id) {
    conversations = conversations.filter(c => c.id !== id);
    saveConversations(conversations);
    if (selectedId === id) selectedId = conversations.length ? conversations[0].id : null;
    renderConversations(searchInput.value);
    loadSelectedConversation();
    }

    function selectConversation(id) {
    selectedId = id;
    renderConversations(searchInput.value);
    loadSelectedConversation();
    }

    function loadSelectedConversation() {
    chatMessages.innerHTML = '';
    const conv = conversations.find(c => c.id === selectedId);
    if (!conv) {
        convTitle.textContent = 'Chưa chọn đoạn chat';
        return;
    }
    convTitle.textContent = conv.title || ('Đoạn chat');
    conv.messages.forEach(m => {
        appendMessageToUI(m.role, m.text);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendMessageToUI(role, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    d.innerHTML = text.replace(/\n/g, '<br>');
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addMessageToConversation(role, text) {
    if (!selectedId) {
        createConversation();
    }
    const conv = conversations.find(c => c.id === selectedId);
    if (!conv) return;
    conv.messages.push({role, text, t: Date.now()});
    conv.updated_at = Date.now();
    // update title to first user message snippet
    const firstUser = conv.messages.find(m => m.role === 'user');
    if (firstUser) conv.title = firstUser.text.slice(0,40);
    saveConversations(conversations);
    renderConversations(searchInput.value);
    }

    // events
    btnNew.addEventListener('click', () => createConversation('Đoạn chat mới'));
    btnDeleteSelected.addEventListener('click', () => {
        if (!selectedId) return alert('Chưa chọn cuộc hội thoại nào.');
        if (!confirm('Xóa đoạn chat này?')) return;
        deleteConversation(selectedId);
    });
    searchInput.addEventListener('input', (e) => renderConversations(e.target.value));

    hideBtn.addEventListener('click', () => {
        app.classList.add('sidebar-hidden');
        showBtn.style.display = 'block';
    });

    showBtn.addEventListener('click', () => {
        app.classList.remove('sidebar-hidden');
        showBtn.style.display = 'none';
    });

    // send chat: post to /chat and store messages
    async function sendChat(message) {
    if (!message.trim()) return;
    addMessageToConversation('user', message);
    appendMessageToUI('user', message);
    chatInput.value = '';
    try {
        const resp = await fetch('/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message})
        });
        const data = await resp.json();
        const reply = data.reply || 'Không có trả lời.';
        addMessageToConversation('bot', reply);
        appendMessageToUI('bot', reply);
    } catch(err) {
        console.error(err);
        const errMsg = 'Lỗi liên hệ assistant. Thử lại sau.';
        addMessageToConversation('bot', errMsg);
        appendMessageToUI('bot', errMsg);
    }
    }

    sendBtn.addEventListener('click', () => {
    const txt = chatInput.value.trim();
    if (!txt) return;
    sendChat(txt);
    });
    chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendBtn.click();
    }
    });

    // init UI
    if (!conversations.length) {
        createConversation('New chats');
    } else {
        renderConversations();
        loadSelectedConversation();
    }


    const map = L.map('map').setView([10.762622, 106.660172], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom: 20, attribution:'&copy; OSM contributors'}).addTo(map);
    let mainMarker = null;
    
    function setMarker(latlng, text) {
        if (mainMarker) 
            map.removeLayer(mainMarker);

        mainMarker = L.marker(latlng).addTo(map);
        mainMarker.bindPopup(text || ("Location: " + latlng.toString())).openPopup();
        map.setView(latlng, 14);
    }

    const geocoder = L.Control.geocoder({defaultMarkGeocode:false})
    .on('markgeocode', function(e){ setMarker(e.geocode.center, e.geocode.name); }).addTo(map);

    const locateControl = L.control({position:'topright'});
    locateControl.onAdd = function(){
        const el = L.DomUtil.create('div','');
        el.style.background='white'; el.style.padding='6px'; el.style.borderRadius='8px'; el.style.boxShadow='0 2px 6px rgba(0,0,0,0.12)';
        el.innerHTML = '<button id="useGPS" style="background:transparent;border:0;cursor:pointer">📍 My GPS</button>';
        return el;
    };

    locateControl.addTo(map);
    document.addEventListener('click',(e)=> {
    if (e.target && e.target.id === 'useGPS') {
        if (!navigator.geolocation) return alert('Không hỗ trợ Geolocation');
        navigator.geolocation.getCurrentPosition(pos => {
        setMarker([pos.coords.latitude, pos.coords.longitude], 'Bạn ở đây');
        }, err => alert('Không lấy được vị trí: ' + err.message));
    }
    });