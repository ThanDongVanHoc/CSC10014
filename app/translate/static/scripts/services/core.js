// 1. GLOBAL CONFIG
export const GUEST_STORAGE_KEY = "do_ngu_khong_ai_cao_bang"; // Key riêng cho Translate

// 2. STATE
export const State = {
  isLoggedIn: false,
  conversations: [],
  selectedId: null, // ID hội thoại đang chọn (null = New Translation)
  isProcessing: false,
};

// 3. DOM (Map các element từ HTML)
export const DOM = {
  // Sidebar
  convoListEl: null,
  searchInput: null,
  searchWrapper: null,
  btnNew: null,
  hideBtn: null,
  brandToggle: null,
  btnSearchTrigger: null,
  app: null,
  panels: [], // Mảng chứa 2 element .tr-panel
};
