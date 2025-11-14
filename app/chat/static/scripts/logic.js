import { initMap, invalidateMapSize } from './map.js';
import { initChat as initGuestChat, setMapReference as setGuestMapRef } from './chat.js';
import { initChat as initUserChat, setMapReference as setUserMapRef } from './chat_user.js';

/**
 * Kiểm tra trạng thái đăng nhập của người dùng.
 * Backend trả:
 *    { logged_in: true } hoặc { logged_in: false }
 */
async function checkUserLogin() {
    try {
        const resp = await fetch('/chat/auth_status');
        if (!resp.ok) return false;
        const data = await resp.json();
        return data.logged_in === true;
    } catch (err) {
        console.error("Không thể kiểm tra trạng thái đăng nhập:", err);
        return false;
    }
}

async function initialize() {
    console.log("🚀 logic.js loaded: Initializing app...");

    // ============================
    // 1. KHỞI TẠO MAP
    // ============================
    const { map, pinLocationToMap } = initMap();


    // ============================
    // 2. CHECK LOGIN → LOAD CHAT
    // ============================
    const isLoggedIn = await checkUserLogin();
    console.log("🔍 Login status:", isLoggedIn);

    if (isLoggedIn) {
        console.log("🟢 Đang dùng chế độ USER (chat_user.js)");
        initUserChat();

        // Kết nối map với chat_user.js
        if (typeof setUserMapRef === "function") {
            setUserMapRef(pinLocationToMap);
        }

    } else {
        console.log("🟠 Đang dùng chế độ GUEST (chat.js)");
        initGuestChat();

        // Kết nối map với chat.js
        if (typeof setGuestMapRef === "function") {
            setGuestMapRef(pinLocationToMap);
        }
    }


    // ============================
    // 3. THU GỌN BẢN ĐỒ
    // ============================
    const hideBtn = document.getElementById('hideBtn');
    if (hideBtn) {
        hideBtn.addEventListener('click', () => {
            invalidateMapSize();
        });
    }


    // ============================
    // 4. CLEAR SESSION KHI ĐÓNG TAB (GUEST MODE)
    // ============================
    window.addEventListener("beforeunload", () => {
        console.log("⏹ beforeunload → clear session");
        sessionStorage.clear();
        navigator.sendBeacon("/chat/clear_session");
    });
}

document.addEventListener('DOMContentLoaded', initialize);
