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
    }),

    yellow: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41],
        popupAnchor: [1, -34], shadowSize: [41, 41]
    })
};

let map = null;
let mainMarker = null;
let locationMarker = null; 
let startMarker = null;
let endMarker = null;
let routeLayer = null;
let flag_pin = true; 
let currentMode = "driving"; 

function setMarker(latlng, text){
    if(mainMarker)
        map.removeLayer(mainMarker); 
    
    mainMarker = L.marker(latlng).addTo(map);
    
    const popupDiv= document.createElement('div');
    popupDiv.innerHTML = `
        <div style="text-align: center; padding: 5px;"> 
            <b>${text || ("Location: " + latlng.toString())}</b><br>            

            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Start
                </button>

                <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    End
                </button>
            </div>
        </div>
    `;

    mainMarker.bindPopup(popupDiv).openPopup();
    map.setView(latlng, 17);

    const [startBtn, endBtn] = popupDiv.querySelectorAll('button');


    startBtn.onclick = () =>{
        const popupContent = document.createElement('div');
        const userNote = text || ("Location: " + latlng.toString());

        popupContent.innerHTML = `
            <div style="text-align: center; padding: 5px;"> 
                <b>🏁 Start</b><br>
                
                <div style="margin: 5px 0 10px 0;">${userNote}</div>

                <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                    <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        End
                    </button>
                    <button id = "unpinBtn" style="flex: 1; background:#dc3545; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Unpin
                    </button>
                </div>
            </div>
        `;

        if (startMarker){
            map.removeLayer(startMarker);
        }

        startMarker = L.marker(latlng, { icon: icons.green })
            .addTo(map).bindPopup(popupContent).openPopup();
        map.closePopup();
        if (endMarker) drawRoute();

        popupContent.querySelector('#unpinBtn').onclick = () => {
            map.removeLayer(startMarker);
            startMarker = null; 
            if (routeLayer) map.removeLayer(routeLayer);
        };
    }


   endBtn.onclick = () => {
        const popupContent = document.createElement('div');
        const userNote = text || ("Location: " + latlng.toString());

        popupContent.innerHTML = `
            <div style="text-align: center; padding: 5px;"> 
                <b>🎯 Destination</b><br>                
                <div style="margin: 5px 0 10px 0;">${userNote}</div>

                <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                    <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Start
                    </button>

                    <button id = "unpinBtn" style="flex: 1; background:#dc3545; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Unpin
                    </button>
                </div>
            </div>
        `;

        if (endMarker){
            map.removeLayer(endMarker);
        }
        
        endMarker = L.marker(latlng, { icon: icons.red })
            .addTo(map).bindPopup(popupContent).openPopup();
        map.closePopup();
        if (startMarker) drawRoute();

        popupContent.querySelector('#unpinBtn').onclick = () => {
            map.removeLayer(endMarker);
            endMarker = null; 
            if (routeLayer) map.removeLayer(routeLayer);
        };
    };
}

function createPin(latlng, name){
    const marker = L.marker(latlng, { icon: icons.blue }).addTo(map);
    let isSaved = false; 

    const popupDiv = document.createElement('div');
    popupDiv.innerHTML = `
        <div style="text-align: center; padding: 5px;"> 
            <b>${name}</b><br>
            <small style="color: #666;">${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</small>
            
            <input type="text" 
               placeholder="Take note" 
               class="note-input" 
               style="width: 90%; margin: 8px 0; padding: 4px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"> 
               <br>

            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Start
                </button>
                <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    End
                </button>
                <button style="flex: 1; background:#777; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Pin
                </button>
            </div>
        </div>
    `;

    const [startBtn, endBtn, pinBtn] = popupDiv.querySelectorAll('button');
    const noteInput = popupDiv.querySelector('.note-input');


    startBtn.onclick = () => {
        const popupContent = document.createElement('div');
        const userNote = noteInput.value || "(No note !)"; 

        popupContent.innerHTML = `
            <div style="text-align: center; padding: 5px;"> 
                <b>🏁 Start</b><br>
                <small style="color: #666;">${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</small>
                
                <div style="margin: 5px 0 10px 0;">${userNote}</div>

                <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                    <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Start
                    </button>
                    <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        End
                    </button>
                    <button id = "unpinBtn" style="flex: 1; background:#dc3545; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Unpin
                    </button>
                </div>
            </div>
        `;

        if (startMarker){
            map.removeLayer(startMarker);
            // L.marker(startMarker.getLatLng(), { icon: icons.blue }).addTo(map);
            // startMarker.bindPopup(popupDiv).openPopup();
        }

        startMarker = L.marker(latlng, { icon: icons.green })
            .addTo(map).bindPopup(popupContent).openPopup();
        map.closePopup();
        if (endMarker) drawRoute();

        popupContent.querySelector('#unpinBtn').onclick = () => {
            map.removeLayer(startMarker);
            startMarker = null; 
            if (routeLayer) map.removeLayer(routeLayer);
        };
    };

    endBtn.onclick = () => {
        const popupContent = document.createElement('div');
        const userNote = noteInput.value || "(No note !)"; 

        popupContent.innerHTML = `
            <div style="text-align: center; padding: 5px;"> 
                <b>🎯 Destination</b><br>
                <small style="color: #666;">${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</small>
                
                <div style="margin: 5px 0 10px 0;">${userNote}</div>

                <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                    <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Start
                    </button>
                    <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        End
                    </button>
                    <button id = "unpinBtn" style="flex: 1; background:#dc3545; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Unpin
                    </button>
                </div>
            </div>
        `;

        if (endMarker){
            map.removeLayer(endMarker);
        }
        
        endMarker = L.marker(latlng, { icon: icons.red })
            .addTo(map).bindPopup(popupContent).openPopup();
        map.closePopup();
        if (startMarker) drawRoute();

        popupContent.querySelector('#unpinBtn').onclick = () => {
            map.removeLayer(endMarker);
            endMarker = null; 
            if (routeLayer) map.removeLayer(routeLayer);
        };
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

        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
            <div style="text-align: center; padding: 5px;">
                <b>Saved pin:</b><br>
                <div style="margin: 5px 0 10px 0;">${userNote}</div>
                <button id="unpinBtn" style="background:#dc3545; color:white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Unpin
                </button>
            </div>
        `;

        const savedPinMarker = L.marker(latlng, { icon: icons.blue })
            .addTo(map).bindPopup(popupContent).openPopup();
    
        popupContent.querySelector('#unpinBtn').onclick = () => {
            map.removeLayer(savedPinMarker);
        };
    };

    marker.bindPopup(popupDiv).openPopup();
}

async function drawRoute(){
    if (!startMarker || !endMarker) return;
    if (routeLayer) map.removeLayer(routeLayer);

    const s = startMarker.getLatLng();
    const e = endMarker.getLatLng();
    const url = `https://router.project-osrm.org/route/v1/${currentMode}/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.routes?.length) return alert('Can\'t\ find route!');

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

export function initMap(){  
    map = L.map('map').setView([10.762622, 106.660172], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom: 19, attribution:'&copy; OSM contributors'}).addTo(map);

    L.Control.geocoder({defaultMarkGeocode:false})
        .on('markgeocode', function(e){ setMarker(e.geocode.center, e.geocode.name); })
        .addTo(map);

    const locateControl = L.control({position:'topright'});
    
    locateControl.onAdd = function(){
        const el = L.DomUtil.create('div','');
        el.style.cssText = 'background:white;padding:6px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.12);';
        el.innerHTML = '<button id="useGPS" style="background:transparent;border:0;cursor:pointer">📍 My GPS</button>';
        return el;
    };
    
    locateControl.addTo(map);

    document.addEventListener('click',(e)=> {
        if (e.target && e.target.id === 'useGPS') { 
            if(!navigator.geolocation)
                return alert('Not support Geolocation'); 

            navigator.geolocation.getCurrentPosition(pos => {
                setMarker([pos.coords.latitude, pos.coords.longitude], 'You are here');
            }, err => alert('Can\'t\' detect location: ' + err.message));
        }
    });
    
    document.querySelectorAll('.transport-btns button').forEach(trans_btn => {
        trans_btn.addEventListener('click', () => {            
            document.querySelectorAll('.transport-btns button').forEach(btn => btn.classList.remove('active'));
                         
            trans_btn.classList.add('active'); 
            flag_pin = false; 
            
            currentMode = trans_btn.dataset.travel;
            if (startMarker && endMarker) drawRoute();
        });
    });

    map.on('click', e => {
        if(flag_pin)
            createPin(e.latlng, "Marked Point");
        else
            flag_pin = true; 
    });

    return { map };

}

export function invalidateMapSize() {
    if (map) map.invalidateSize();
}

export function pinLocationToMap(lat, lng, name, phone, website, distance) {
    if (!map) return;

    if(locationMarker){
        map.removeLayer(locationMarker); 
    }
    
    const latlng = L.latLng(lat, lng);
    locationMarker = L.marker(latlng, { icon: icons.yellow }).addTo(map);
    
    const popupDiv = document.createElement('div');
    const phoneLink = phone ? `<a href="tel:${phone}" style="color: #0078ff; text-decoration: none;">${phone}</a>` : 'Không có';
    const webLink = website ? `<a href="${website.startsWith('http') ? '' : '//'}${website}" target="_blank" style="color: #0078ff; text-decoration: none;">Website</a>` : '';
    const distanceText = distance ? `<br><small style="color: #666;">📍 ${distance.toFixed(1)} km</small>` : '';
    
    popupDiv.innerHTML = `
        <div style="text-align: left; padding: 8px; min-width: 180px;">
            <b style="display: block; margin-bottom: 6px; color: #0b2b3a;">${name}</b>
            <small style="color: #666; display: block; margin-bottom: 6px;">
                📞 ${phoneLink}
            </small>
            ${webLink ? `<small style="display: block; margin-bottom: 6px;">${webLink}</small>` : ''}
            ${distanceText}
            
            <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 8px;">
                <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">
                    Start
                </button>
                <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">
                    End
                </button>
            </div>
        </div>
    `;

    const [startBtn, endBtn] = popupDiv.querySelectorAll('button');
    locationMarker.bindPopup(popupDiv).openPopup();
    map.setView(latlng, 17);

    startBtn.onclick = () =>{
        const popupContent = document.createElement('div');
        const userNote = name || ("Location: " + latlng.toString());

        popupContent.innerHTML = `
            <div style="text-align: center; padding: 5px;"> 
                <b>🏁 Start</b><br>
                
                <div style="margin: 5px 0 10px 0;">${userNote}</div>

                <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                    <button style="flex: 1; background:#F44336; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        End
                    </button>
                    <button id = "unpinBtn" style="flex: 1; background:#dc3545; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Unpin
                    </button>
                </div>
            </div>
        `;

        if (startMarker){
            map.removeLayer(startMarker);
        }

        startMarker = L.marker(latlng, { icon: icons.green })
            .addTo(map).bindPopup(popupContent).openPopup();
        map.closePopup();
        if (endMarker) drawRoute();

        popupContent.querySelector('#unpinBtn').onclick = () => {
            map.removeLayer(startMarker);
            startMarker = null; 
            if (routeLayer) map.removeLayer(routeLayer);
        };
    }


    endBtn.onclick = () => {
        const popupContent = document.createElement('div');
        const userNote = name || ("Location: " + latlng.toString());

        popupContent.innerHTML = `
            <div style="text-align: center; padding: 5px;"> 
                <b>🎯 Destination</b><br>                
                <div style="margin: 5px 0 10px 0;">${userNote}</div>

                <div class="pin-btns" style="display: flex; justify-content: space-around; gap: 5px; margin-top: 5px;">
                    <button style="flex: 1; background:#4CAF50; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Start
                    </button>

                    <button id = "unpinBtn" style="flex: 1; background:#dc3545; color:white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        Unpin
                    </button>
                </div>
            </div>
        `;

        if (endMarker){
            map.removeLayer(endMarker);
        }
        
        endMarker = L.marker(latlng, { icon: icons.red })
            .addTo(map).bindPopup(popupContent).openPopup();
        map.closePopup();
        if (startMarker) drawRoute();

        popupContent.querySelector('#unpinBtn').onclick = () => {
            map.removeLayer(endMarker);
            endMarker = null; 
            if (routeLayer) map.removeLayer(routeLayer);
        };
    };
}