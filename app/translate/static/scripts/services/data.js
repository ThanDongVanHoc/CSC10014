import { State, GUEST_STORAGE_KEY } from "./core.js";

export const DataManager = {
  // 1. Check Auth
  async checkAuth() {
    try {
      const res = await fetch("/translate/auth_status");
      const data = await res.json();
      State.isLoggedIn = data.logged_in;
    } catch (e) {
      console.warn("Auth check failed, defaulting to Guest.", e);
      State.isLoggedIn = false;
    }
  },

  // 2. Get All Conversations
  async getConversations() {
    if (State.isLoggedIn) {
      try {
        const res = await fetch("/translate/conversations");
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

  // 3. Get Messages of a Conversation
  async getMessages(convoId) {
    if (State.isLoggedIn) {
      try {
        const res = await fetch(`/translate/conversations/${convoId}/messages`);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    } else {
      // Guest
      const c = State.conversations.find((x) => x.id == convoId);
      return c ? c.messages : [];
    }
  },

  // 4. Create New Conversation
  async create(title) {
    if (State.isLoggedIn) {
      try {
        const res = await fetch("/translate/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    } else {
      // Guest logic
      const now = new Date().toISOString();
      return {
        id: "guest-" + Date.now() + Math.random().toString(36).substr(2, 5),
        title: title,
        messages: [],
        created_at: now,
        updated_at: now,
      };
    }
  },

  // 5. Delete Conversation
  async delete(id) {
    if (State.isLoggedIn) {
      await fetch(`/translate/conversations/${id}`, { method: "DELETE" });
    }
    State.conversations = State.conversations.filter((c) => c.id != id);
    this.saveGuestData();
  },

  // 6. Rename Conversation
  async rename(id, newTitle) {
    if (State.isLoggedIn) {
      await fetch(`/translate/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    }
    const c = State.conversations.find((x) => x.id == id);
    if (c) c.title = newTitle;
    this.saveGuestData();
  },

  // 7. Send Message (Có thêm speaker_role cho Translate)
  async sendMessage(convoId, content, speakerRole) {
    if (State.isLoggedIn) {
      try {
        await fetch(`/translate/conversations/${convoId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            speaker_role: speakerRole,
            role: "user",
          }),
        });
      } catch (e) {
        console.error(e);
      }
    }
    // Guest data đã được xử lý ở logic.js trước khi gọi hàm này (nếu cần sync)
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
