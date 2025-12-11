import { state } from "../state.js";
import { checkIsPoi, setPoiMarker, createPin } from "./markerUtils.js";
import { turnOffPoi } from "../components/POIManager.js";
import { poiSidebarUI } from "../components/POISidebar.js";

// Xử lý kết quả sau khi tìm kiếm thành công
export async function handleSearchResult(geocodeData, map) {
  const { name, center } = geocodeData;

  // Ghi log lịch sử tìm kiếm vào server
  fetch("/chat/log_search_history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword: name }),
  }).catch((err) => console.warn("Log error:", err));

  if (typeof turnOffPoi === "function") turnOffPoi();

  map.closePopup();

  // Xóa đường dẫn cũ nếu có
  if (state.routeLayer) {
    map.removeLayer(state.routeLayer);
    state.routeLayer = null;
  }

  // Kiểm tra xem địa điểm có phải là POI trong database không
  const poiCheck = await checkIsPoi(center.lat, center.lng, name);

  if (poiCheck && poiCheck.isPPoi) {
    // Nếu là POI -> Hiển thị Sidebar thông tin
    const dbData = poiCheck.poi;
    setPoiMarker([dbData.lat, dbData.lng], dbData.name, dbData);
  } else {
    // Nếu không -> Bay tới đó và tạo Pin thường
    map.flyTo(center, 17, { animate: true, duration: 1.2 });
    createPin(center, name);
  }
}

// Khởi tạo dịch vụ tìm kiếm
export function initSearchService(map) {
  const searchService = L.Control.Geocoder.nominatim({
    geocodingQueryParams: {
      countrycodes: "vn",
      addressdetails: 1,
    },
  });

  // Hàm bật/tắt class loading cho CSS xử lý hiển thị Spinner
  const toggleSearchLoading = (isLoading) => {
    const container = document.querySelector(".leaflet-control-geocoder");
    if (!container) return;
    const searchBtn = container.querySelector(".leaflet-control-geocoder-icon");
    if (!searchBtn) return;

    if (isLoading) searchBtn.classList.add("searching");
    else searchBtn.classList.remove("searching");
  };

  const control = L.Control.geocoder({
    defaultMarkGeocode: false, // Tắt marker mặc định để tự xử lý
    geocoder: searchService,
    placeholder: "Search...",
    showResultIcons: true,
    errorMessage: "No results found",
    suggestMinLength: 3,
  })
    .on("startgeocode", () => toggleSearchLoading(true))
    .on("finishgeocode", () => toggleSearchLoading(false))
    .on("markgeocode", function (e) {
      handleSearchResult(e.geocode, map);
    })
    .addTo(map);

  // Cài đặt tính năng lịch sử và tự động cuộn text
  setupHistorySearch(control);
  setupAlternateSearch(control);

  // --- LOGIC MỚI: Chỉ cuộn về đầu dòng khi bấm ra ngoài (Blur) ---
  const searchContainer = control.getContainer();
  const searchInput = searchContainer.querySelector("input");

  if (searchInput) {
    searchInput.setAttribute("spellcheck", "false");
    searchInput.addEventListener("blur", () => {
      searchInput.scrollLeft = 0; // Đưa text về đầu dòng để dễ đọc tên quận/huyện
    });
  }

  return control;
}

// Cài đặt Dropdown lịch sử tìm kiếm
function setupHistorySearch(control) {
  setTimeout(() => {
    const container = document.querySelector(".leaflet-control-geocoder");
    const input = document.querySelector(
      ".leaflet-control-geocoder-form input"
    );

    if (!container || !input) return;

    // Tạo hộp chứa lịch sử
    const historyBox = document.createElement("div");
    historyBox.className = "search-history-dropdown";
    L.DomEvent.disableClickPropagation(historyBox);
    L.DomEvent.disableScrollPropagation(historyBox);
    container.appendChild(historyBox);

    // Hàm render lịch sử
    const renderHistory = async () => {
      // Nếu đang nhập gì đó thì không hiện lịch sử
      if (input.value.trim() !== "") {
        historyBox.style.display = "none";
        return;
      }

      try {
        const res = await fetch("/chat/get_search_history");
        if (!res.ok) return;
        const data = await res.json();

        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data.history && Array.isArray(data.history))
          list = data.history;

        if (list.length === 0) return;

        // Render HTML
        historyBox.innerHTML = list
          .map(
            (item) => `
              <div class="history-item">
                  <span class="history-icon">🕒</span> 
                  <span class="history-text">${item.keyword}</span>
              </div>
            `
          )
          .join("");

        historyBox.style.display = "block";

        // Gắn sự kiện click cho từng mục lịch sử
        historyBox.querySelectorAll(".history-item").forEach((el) => {
          el.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            e.preventDefault();
          });
          el.addEventListener("click", (e) => {
            L.DomEvent.stop(e); // Ngăn hành vi mặc định

            const keyword = el.querySelector(".history-text").innerText;

            // 1. Điền từ khóa vào ô input
            input.value = keyword;

            // 2. Ẩn bảng lịch sử
            historyBox.style.display = "none";

            // 3. GIẢ LẬP PHÍM ENTER ĐỂ KÍCH HOẠT TÌM KIẾM TỰ ĐỘNG
            input.focus();
            const enterEvent = new KeyboardEvent("keydown", {
              bubbles: true,
              cancelable: true,
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
            });
            input.dispatchEvent(enterEvent);
          });
        });
      } catch (err) {
        console.warn("Lỗi tải lịch sử:", err);
      }
    };

    // Các sự kiện để hiện/ẩn lịch sử
    input.addEventListener("focus", renderHistory);
    input.addEventListener("click", (e) => {
      e.stopPropagation();
      renderHistory();
    });
    input.addEventListener("input", () => {
      historyBox.style.display = "none";
    });

    // Bấm ra ngoài thì tắt lịch sử
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) historyBox.style.display = "none";
    });
  }, 500);
}

function setupAlternateSearch(control) {
  const container = control.getContainer();
  const input = container.querySelector("input");

  if (!container || !input) return;

  // 1. XỬ LÝ MOUSEDOWN (QUAN TRỌNG: Dùng Capture Phase)
  // Tham số true ở cuối: Bắt sự kiện NGAY TỪ GỐC, trước khi nó lan đến các phần tử con
  container.addEventListener(
    "mousedown",
    (e) => {
      // Nếu click vào vùng gợi ý
      if (e.target.closest(".leaflet-control-geocoder-alternatives")) {
        e.preventDefault(); // Giữ Focus cho input
        e.stopPropagation(); // Chặn lan truyền
      }
    },
    true
  ); // <--- QUAN TRỌNG: true

  // 2. XỬ LÝ CLICK (Logic chọn địa điểm)
  container.addEventListener(
    "click",
    (e) => {
      const item = e.target.closest(
        ".leaflet-control-geocoder-alternatives li"
      );

      if (item) {
        // Chặn ngay lập tức không cho thư viện Leaflet Geocoder chạy code mặc định của nó
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // <--- "VŨ KHÍ" MẠNH NHẤT: Chặn đứng mọi listener khác

        // Lấy nội dung text
        const link = item.querySelector("a") || item;
        const keyword = link.innerText;

        // A. Điền vào ô input
        input.value = keyword;

        // B. Ẩn danh sách gợi ý
        const alternatives = container.querySelector(
          ".leaflet-control-geocoder-alternatives"
        );
        if (alternatives) {
          alternatives.style.display = "none";
        }

        // C. Focus lại ô input (để giữ cho nó hiện thị)
        input.focus();

        // D. Kích hoạt tìm kiếm (Giả lập Enter)
        const enterEvent = new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
        });
        input.dispatchEvent(enterEvent);
      }
    },
    true
  ); // <--- QUAN TRỌNG: true

  // 3. Chặn cuộn chuột
  const alternatives = container.querySelector(
    ".leaflet-control-geocoder-alternatives"
  );
  if (alternatives) {
    L.DomEvent.disableScrollPropagation(alternatives);
  }
}
