import {initChat} from './chat.js'
import { initMap, invalidateMapSize } from './map.js';


function initialize(){
    initChat(); 
    const {map} = initMap(); 

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