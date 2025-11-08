
const STORAGE_KEY = 'con_cho_cao_bang_cai_ghe';

let conversations = [];
let selectedId = null;

let convoListEl, searchInput, btnNew, btnDeleteSelected, convTitle;
let chatMessages, chatInput, sendBtn, hideBtn, showBtn, app;

function uid() {
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
}

function loadConversations() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
}

function createConversation(title = 'New chat'){
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

function saveConversations(list){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadSelectedConversation(){
    chatMessages.innerHTML = '';
    const conv = conversations.find(c => c.id === selectedId);
    
    if (!conv) {
        convTitle.textContent = 'Have not chose chat';
        return;
    }
    
    convTitle.textContent = conv.title || ('New chat');

    conv.messages.forEach(m => {
        appendMessageToUI(m.role, m.text);
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function selectConversation(id){
    selectedId = id; 
    renderConversations(searchInput.value);
    loadSelectedConversation();
}

function renderConversations(filter = ''){
    convoListEl.innerHTML = ''; 
    const f = filter.trim().toLowerCase(); 

    conversations.forEach(c => {
        const title = c.title || (c.messages[0] ? c.messages[0].text.slice(0,40) : 'New chat');
        
        if (f && !title.toLowerCase().includes(f) && !c.id.includes(f)) 
                return;

        const doc = document.createElement('div');
        doc.className = 'convo-item' + (c.id === selectedId ? ' active' : '');
        doc.dataset.id = c.id;
        doc.innerHTML = `<div style="flex:1"><div class="convo-title">${title}</div><div class="convo-sub">${new Date(c.updated_at).toLocaleString()}</div></div>`;
        
        doc.addEventListener('click', () => {
            selectConversation(c.id);
        });

        convoListEl.appendChild(doc);
    });

    if (!selectedId && conversations.length) {
        selectedId = conversations[0].id;
    }

}

function addMessageToConversation(role, text){
    if(!selectedId){
        createConversation(); 
    }

    const conv = conversations.find(c => c.id == selectedId); 
    if(!conv) return; 

    conv.messages.push({role, text, t: Date.now()}); 
    conv.updated_at = Date.now();

    const firstUser = conv.messages.find(m => m.role === 'user');
    if(firstUser)
        conv.title = firstUser.text.slice(0, 40); 

    saveConversations(conversations); 
    renderConversations(searchInput.value); /// for searching
}

function deleteConversation(id){
    conversations = conversations.filter(c => c.id !== id);
    saveConversations(conversations);
    if (selectedId === id) selectedId = conversations.length ? conversations[0].id : null;
    
    renderConversations(searchInput.value);
    loadSelectedConversation();
}

function appendMessageToUI(role, text){
    const doc = document.createElement('div');

    doc.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    doc.innerHTML = text.replace(/\n/g, '<br>');

    chatMessages.appendChild(doc);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export async function sendChat(message){
    if(!message.trim()) return; 
    addMessageToConversation('user', message); 
    appendMessageToUI('user', message); 

    chatInput.value = ''; 

    try{
        const resp = await fetch('/chat', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message})
        }); 

        const data = await resp.json(); 
        const reply = data.reply || 'No respond back.';

        addMessageToConversation('bot', reply); 
        appendMessageToUI('bot', reply); 
    }catch(err){
        cosole.error(err); 
        const errMsg = 'Lỗi liên hệ assistant. Thử lại sau.';
        addMessageToConversation('bot', errMsg);
        appendMessageToUI('bot', errMsg);
    }
}


export function initChat(){
    convoListEl = document.getElementById('convoList');
    searchInput = document.getElementById('searchInput');
    btnNew = document.getElementById('btnNew');
    btnDeleteSelected = document.getElementById('btnDeleteSelected');
    convTitle = document.getElementById('convTitle');
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendBtn = document.getElementById('sendBtn');
    hideBtn = document.getElementById('hideBtn');
    showBtn = document.getElementById('showSidebar');
    app = document.querySelector('.app');

    conversations = loadConversations();
    selectedId = conversations.length ? conversations[0].id : null;

    btnNew.addEventListener('click', () => createConversation('New chat'));
    
    btnDeleteSelected.addEventListener('click', () => { 
        if (!selectedId) return alert('Have not chosen any chat');
        if (!confirm('Do you want to delete this chat ?')) return;
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
}

