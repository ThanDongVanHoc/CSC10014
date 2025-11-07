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


    /// Map logic

    const map = L.map('map').setView([10.762622, 106.660172], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom: 19, attribution:'&copy; OSM contributors'}).addTo(map);
    let mainMarker = null;

    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });


    function setMarker(latlng, text) {
        if (mainMarker) 
            map.removeLayer(mainMarker);

        mainMarker = L.marker(latlng).addTo(map);
        mainMarker.bindPopup(text || ("Location: " + latlng.toString())).openPopup();
        map.setView(latlng, 17);
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

    hideBtn.addEventListener('click', () => {
        map.invalidateSize();
    });

    /// More features

    let startMarker = null;
    let endMarker = null;
    let routeLayer = null;
    let currentMode = "driving";
    let flag_pin = true; 

    const icons = {
      blue: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41],
        popupAnchor: [1, -34], shadowSize: [41, 41]
      }),
      red: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41],
        popupAnchor: [1, -34], shadowSize: [41, 41]
      }),
      green: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41],
        popupAnchor: [1, -34], shadowSize: [41, 41]
      })
    };

    document.querySelectorAll('.transport-btns button').forEach(trans_btn => {
        trans_btn.onclick = () => {
          flag_pin = false;
        }
        trans_btn.addEventListener('click', () => {            
            document.querySelectorAll('.transport-btns button').forEach(btn => btn.classList.remove('active'));
                         
            trans_btn.classList.add('active'); 
            
            currentMode = trans_btn.dataset.travel;
            if (startMarker && endMarker) drawRoute();
        });
    });

    map.on('click', e => {
        if(flag_pin)
            createPin(e.latlng, "Điểm được chọn");
    });


    function createPin(latlng, name) {
      const marker = L.marker(latlng, { icon: icons.blue }).addTo(map);
      let isSaved = false; 

      const popupDiv = document.createElement('div');
      popupDiv.innerHTML = `
        <b>${name}</b><br>
        <small>${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</small>
        <input type="text" placeholder="Note ..." class="note-input"><br>
        <div class="pin-btns">
          <button style="background:#4CAF50;color:white;">Start</button>
          <button style="background:#F44336;color:white;">End</button>
          <button style="background:#777;color:white;">Pin</button>
        </div>
      `;

      const [startBtn, endBtn, pinBtn] = popupDiv.querySelectorAll('button');
      const noteInput = popupDiv.querySelector('.note-input');

      startBtn.onclick = () => {
        if (startMarker){
          map.removeLayer(startMarker);
          L.marker(startMarker.getLatLng(), { icon: icons.blue }).addTo(map);
        }        
        startMarker = L.marker(latlng, { icon: icons.green })
          .addTo(map).bindPopup("🏁 Start").openPopup();
        map.closePopup();
        if (endMarker) drawRoute();
      };

      endBtn.onclick = () => {
        if (endMarker){
          map.removeLayer(endMarker);
          L.marker(endMarker.getLatLng(), { icon: icons.blue }).addTo(map);
        }
        
        endMarker = L.marker(latlng, { icon: icons.red })
          .addTo(map).bindPopup("🎯 Destination").openPopup();
        map.closePopup();
        if (startMarker) drawRoute();
      };

      marker.on('popupclose', function (e) {
        if (!isSaved) {
            map.removeLayer(marker);
            console.log("Marker tạm thời đã bị xóa.");
        }
      });

      pinBtn.onclick = () =>{
        const userNote = noteInput.value || "(No note !)"; 
        isSaved = true; 
        
        map.removeLayer(marker);

        marker.closePopup(); 
        L.marker(latlng, { icon: icons.blue })
          .addTo(map).bindPopup(`<b>Saved Pin:</b><br>${userNote}`).openPopup();
      };

      marker.bindPopup(popupDiv).openPopup();
    }


    async function drawRoute() {
      if (!startMarker || !endMarker) return;
      if (routeLayer) map.removeLayer(routeLayer);

      const s = startMarker.getLatLng();
      const e = endMarker.getLatLng();
      const url = `https://router.project-osrm.org/route/v1/${currentMode}/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.routes?.length) return alert("Không tìm thấy đường đi!");

        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        const km = (route.distance / 1000).toFixed(1);
        let mins = (route.duration / 60).toFixed(0);

        const scale = { driving: 1, cycling: 3.3, walking: 10 };
        mins = Math.round(mins * (scale[currentMode] || 1));


        routeLayer = L.polyline(coords, { color: "#0078ff", weight: 5 }).addTo(map);
        map.fitBounds(routeLayer.getBounds());

        const mid = coords[Math.floor(coords.length / 2)];
        L.popup()
          .setLatLng(mid)
          .setContent(`${currentMode.toUpperCase()}<br>📏 ${km} km<br>⏱️ ${mins} minutes`)
          .openOn(map);
      } catch (err) {
        alert("Lỗi khi tải tuyến đường: " + err);
      }
    }

    window.addEventListener("beforeunload", () => {
      console.log("Clearing session...");
      localStorage.clear();
      sessionStorage.clear(); 
      navigator.sendBeacon("/chat/clear_session");
    });