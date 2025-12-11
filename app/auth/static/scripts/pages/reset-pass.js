// Đảm bảo code chạy sau khi DOM đã tải xong
document.addEventListener("DOMContentLoaded", function () {
  // Lấy các phần tử DOM - ĐÃ SỬA LẠI ID CHO ĐÚNG VỚI resetpass.html
  const form = document.getElementById("resetForm"); // Sửa từ 'forgotForm'
  const email = document.getElementById("email");
  const password = document.getElementById("password"); // Sửa từ 'newPassword'
  const confirm = document.getElementById("confirm"); // Sửa từ 'confirmPassword'

  const errEmail = document.getElementById("err-email");
  const errPw = document.getElementById("err-pw");
  const errConfirm = document.getElementById("err-confirm");

  const pwBar = document.getElementById("pwBar");
  const pwNote = document.getElementById("pwNote");
  const togglePw = document.getElementById("togglePw");

  // 1. Cập nhật thanh trạng thái mật khẩu
  // Thêm kiểm tra 'if (password)' để đảm bảo element tồn tại
  if (password) {
    password.addEventListener("input", () => {
      // Hàm này (getPasswordStrengthInfo) đến từ file 'common.js'
      const info = getPasswordStrengthInfo(password.value);

      if (pwBar) pwBar.style.width = info.percent + "%";
      if (pwNote) pwNote.textContent = info.text;
    });
  }

  // 2. Thiết lập ẩn/hiện mật khẩu - SỬA LẠI BIẾN CHO ĐÚNG
  // Hàm này (setupPasswordToggle) đến từ file 'common.js'
  // Phải truyền vào biến 'password' và 'confirm' đã định nghĩa ở trên
  if (togglePw) {
    setupPasswordToggle(password, confirm, togglePw);
  }

  // 3. Xử lý submit form
  // Thêm kiểm tra 'if (form)'
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let ok = true;

      // Reset lỗi
      if (errEmail) errEmail.textContent = "";
      if (errPw) errPw.textContent = "";
      if (errConfirm) errConfirm.textContent = "";

      // Kiểm tra email (validateEmail từ common.js)
      if (!validateEmail(email.value)) {
        errEmail.textContent = "Enter a valid email address.";
        ok = false;
      }

      // Kiểm tra mật khẩu - SỬA LẠI BIẾN
      if (getPasswordStrengthInfo(password.value).score < 3) {
        errPw.textContent =
          "Please choose a stronger password (min 8 chars, including numbers and symbols).";
        ok = false;
      }

      if (password.value.trim() === "") {
        errPw.textContent = "Please enter a new password.";
        ok = false;
      }

      // Kiểm tra xác nhận - SỬA LẠI BIẾN
      if (password.value !== confirm.value) {
        errConfirm.textContent = "Passwords do not match.";
        ok = false;
      }

      if (confirm.value.trim() === "") {
        errConfirm.textContent = "Please confirm your password.";
        ok = false;
      }

      if (ok) {
        console.log("Validation passed. Submitting form...");
        form.submit();
      } else {
        console.log("Validation failed.");
      }
    });
  }
});
