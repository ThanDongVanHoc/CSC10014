// import {initChat} from './chat.js'
// import { initMap, invalidateMapSize } from './map.js';


// function initialize(){
//     initChat(); 
//     const {map} = initMap(); 

//     const hideBtn = document.getElementById('hideBtn'); 

//     if(hideBtn){
//         hideBtn.addEventListener('click', () => {
//             invalidateMapSize(); 
//         }); 
//     }

//     window.addEventListener("beforeunload", () => {
//       console.log("Clearing session...");
//       localStorage.clear();
//       sessionStorage.clear(); 
//       navigator.sendBeacon("/chat/clear_session");
//     }); 
// }

// document.addEventListener('DOMContentLoaded', initialize); 

import { initMap, invalidateMapSize } from './map.js';
import { initChat as initGuestChat } from './chat.js';
import { initChat as initUserChat } from './chat_user.js';

/**
 * Kiểm tra trạng thái đăng nhập của người dùng
 * Backend sẽ trả:
 *   { logged_in: true } nếu có session.user_email
 *   { logged_in: false } nếu không
 */
async function checkUserLogin() {
    try {
        const resp = await fetch('/chat/auth_status');
        if (!resp.ok) return false;

        const data = await resp.json();
        return data.logged_in === true;
    } catch (err) {
        console.error("Không thể kiểm tra đăng nhập:", err);
        return false;
    }
}

async function initialize() {

    // Load map
    const { map } = initMap();

    // Kiểm tra đăng nhập
    const isLoggedIn = await checkUserLogin();
    console.log("🔍 Login status:", isLoggedIn);

    if (isLoggedIn) {
        console.log("🟢 User đã đăng nhập → dùng chat_user.js");
        initUserChat();
    } else {
        console.log("🟠 Khách chưa đăng nhập → dùng chat_guest.js");
        initGuestChat();
    }

    // Xử lý thu gọn bản đồ
    const hideBtn = document.getElementById('hideBtn');
    if (hideBtn) {
        hideBtn.addEventListener('click', () => invalidateMapSize());
    }

    // Khi đóng trang
    window.addEventListener("beforeunload", () => {
        console.log("⏹ Dọn session tạm...");
        sessionStorage.clear();
        navigator.sendBeacon("/chat/clear_session");
    });
}

document.addEventListener('DOMContentLoaded', initialize);
