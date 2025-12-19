document.addEventListener("DOMContentLoaded", function () {
  // --- HIỆU ỨNG SCROLL ANIMATION ---

  // Chọn cả Card xòe quạt cũ VÀ Card How-it-works mới (.fade-up)
  const animatedElements = document.querySelectorAll(
    ".card-vertical, .fade-up"
  );

  if (animatedElements.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Khi lọt vào màn hình -> Thêm class để hiện lên
            entry.target.classList.add("in-view");

            // (Tùy chọn) Nếu muốn hiện 1 lần rồi thôi thì bỏ comment dòng dưới:
            // observer.unobserve(entry.target);
          } else {
            // Khi ra khỏi màn hình -> Bỏ class để ẩn đi (lướt lại sẽ thấy hiệu ứng tiếp)
            entry.target.classList.remove("in-view");
          }
        });
      },
      {
        threshold: 0.1, // Kích hoạt khi thấy 10% phần tử
        rootMargin: "0px 0px -50px 0px",
      }
    );

    animatedElements.forEach((el) => {
      observer.observe(el);
    });
  }
});
