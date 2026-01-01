import { State, GUEST_STORAGE_KEY } from "./core.js";

export const DataManager = {
  async checkAuth() {
    try {
      const res = await fetch("/chat/auth_status");
      const data = await res.json();
      State.isLoggedIn = data.logged_in;
    } catch (e) {
      console.warn("Auth check failed, defaulting to Guest.", e);
      State.isLoggedIn = false;
    }
  },

  async getConversations() {
    if (State.isLoggedIn) {
      try {
        const res = await fetch("/chat/messages");
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    } else {
      try {
        const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }
  },

  async getMessages(convoId) {
    if (State.isLoggedIn) {
      try {
        const res = await fetch(`/chat/messages/${convoId}`);
        const data = await res.json();
        return Array.isArray(data)
          ? data.map((m) => ({ ...m, guide: m.guide_data }))
          : [];
      } catch (e) {
        return [];
      }
    } else {
      // GUEST
      const c = State.conversations.find((x) => x.id == convoId);
      return c
        ? c.messages.map((m) => ({
            role: m.role,
            content: m.text,
            guide: m.guide,
          }))
        : [];
    }
  },

  async create(title) {
    if (State.isLoggedIn) {
      try {
        const res = await fetch("/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) {
          // In lỗi ra Console để bạn biết server đang bị gì (500 hay 404...)
          console.error("Server Error:", res.status, await res.text());
          return null;
        }
        return await res.json();
      } catch (e) {
        return null;
      }
    } else {
      const now = Date.now();
      return {
        id: "guest-" + now + Math.random().toString(36).substr(2, 5),
        title: title,
        messages: [],
        context: {},
        created_at: now,
        updated_at: now,
      };
    }
  },

  async delete(id) {
    if (State.isLoggedIn)
      await fetch(`/chat/messages/${id}`, { method: "DELETE" });
    State.conversations = State.conversations.filter((c) => c.id != id);
    this.saveGuestData();
  },

  async rename(id, newTitle) {
    if (State.isLoggedIn) {
      await fetch(`/chat/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    }
    const c = State.conversations.find((x) => x.id == id);
    if (c) c.title = newTitle;
    this.saveGuestData();
  },

  saveGuestData() {
    if (!State.isLoggedIn) {
      sessionStorage.setItem(
        GUEST_STORAGE_KEY,
        JSON.stringify(State.conversations)
      );
    }
  },
};

export function getLocationOrDefault() {
  return new Promise((resolve) => {
    let fallback = { lat: 10.7769, lng: 106.7009 };
    if (!navigator.geolocation) return resolve(fallback);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("GPS Error:", err);
        resolve(fallback);
      }
    );
  });
}
