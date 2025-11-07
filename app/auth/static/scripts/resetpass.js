// Đảm bảo code chạy sau khi DOM đã tải xong
document.addEventListener("DOMContentLoaded", function () {
  // Lấy các phần tử DOM
  const form = document.getElementById("forgotForm");
  const email = document.getElementById("email");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");

  const errEmail = document.getElementById("err-email");
  const errPw = document.getElementById("err-pw");
  const errConfirm = document.getElementById("err-confirm");

  const pwBar = document.getElementById("pwBar");
  const pwNote = document.getElementById("pwNote");
  const togglePw = document.getElementById("togglePw");

  // 1. Cập nhật thanh trạng thái mật khẩu
  newPassword.addEventListener("input", () => {
    // Gọi hàm chung
    const info = getPasswordStrengthInfo(newPassword.value);

    pwBar.style.width = info.percent + "%";
    pwNote.textContent = info.text;
  });

  // 2. Thiết lập ẩn/hiện mật khẩu
  // Gọi hàm chung
  setupPasswordToggle(newPassword, confirmPassword, togglePw);

  // 3. Xử lý submit form
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;

    errEmail.textContent = "";
    errPw.textContent = "";
    errConfirm.textContent = "";
    pwNote.textContent = "";

    // Gọi hàm chung
    if (!validateEmail(email.value)) {
      errEmail.textContent = "Enter a valid email address.";
      ok = false;
    }

    // Gọi hàm chung
    if (getPasswordStrengthInfo(newPassword.value).score < 3) {
      errPw.textContent =
        "Please choose a stronger password (min 8 chars, including numbers and symbols).";
      ok = false;
    }

    if (newPassword.value.trim() === "") {
      errPw.textContent = "Please enter a new password.";
      ok = false;
    }
    if (newPassword.value !== confirmPassword.value) {
      errConfirm.textContent = "Passwords do not match.";
      ok = false;
    }
    if (confirmPassword.value.trim() === "") {
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
});
