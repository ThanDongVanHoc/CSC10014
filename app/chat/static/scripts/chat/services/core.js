// 1. GLOBAL CONFIG
export const GUEST_STORAGE_KEY = "con_cho_cao_bang_pc";
window.USE_MOCK_CHAT_RESPONSE = window.USE_MOCK_CHAT_RESPONSE || false;

// 2. STATE (Trạng thái dữ liệu)
export const State = {
  isLoggedIn: false,
  conversations: [],
  selectedId: null,
  pinLocationToMapFn: null,
};

// 3. DOM (Tham chiếu HTML Elements)
export const DOM = {
  convoListEl: null,
  searchInput: null,
  searchWrapper: null,
  btnNew: null,
  convTitle: null,
  chatMessages: null,
  chatInput: null,
  sendBtn: null,
  hideBtn: null,
  showBtn: null,
  app: null,
  brandToggle: null,
  btnSearchTrigger: null,
};

// 4. CORE FUNCTIONS
export function setMapReference(fn) {
  State.pinLocationToMapFn = fn;
}
