document.addEventListener("DOMContentLoaded", () => {
  const serviceCards = document.querySelectorAll(".os-card");

  serviceCards.forEach((card) => {
    card.addEventListener("click", () => {
      const href = card.getAttribute("data-href");

      // Kiểm tra nếu có đường dẫn hợp lệ
      if (href && href !== "#" && href !== "") {
        // Hiệu ứng visual: đổi màu viền ngay lập tức để người dùng biết đã bấm
        card.style.borderColor = "#00b37e";
        card.style.backgroundColor = "#f9fafb";

        // Chuyển trang
        setTimeout(() => {
          window.location.href = href;
        }, 100); // Trễ 0.1s nhẹ để thấy hiệu ứng
      } else {
        console.log("Chưa set đường dẫn cho card này");
      }
    });
  });
});
