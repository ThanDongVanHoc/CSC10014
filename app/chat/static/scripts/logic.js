import {initChat, setMapReference} from './chat.js'
import { initMap, invalidateMapSize, pinLocationToMap } from './map.js';


function initialize(){
    const {map} = initMap(); 
    initChat(); 
    setMapReference(pinLocationToMap);

    const hideBtn = document.getElementById('hideBtn'); 

    if(hideBtn){
        hideBtn.addEventListener('click', () => {
            invalidateMapSize(); 
        }); 
    }

    window.addEventListener("beforeunload", () => {
      console.log("Clearing session...");
      localStorage.clear();
      sessionStorage.clear(); 
      navigator.sendBeacon("/chat/clear_session");
    }); 
}

document.addEventListener('DOMContentLoaded', initialize); 