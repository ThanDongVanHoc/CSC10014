document.addEventListener("DOMContentLoaded", function () {
  // --- 1. Lấy các biến DOM ---
  const form = document.getElementById("signupForm");
  const password = document.getElementById("password");
  const confirm = document.getElementById("confirm");
  const agree = document.getElementById("agree");

  const errPw = document.getElementById("err-pw");
  const errConfirm = document.getElementById("err-confirm");
  const errTerms = document.getElementById("err-terms");

  const pwBar = document.getElementById("pwBar");
  const pwNote = document.getElementById("pwNote");
  const togglePw = document.getElementById("togglePw");

  // --- 2. Cập nhật thanh trạng thái mật khẩu ---
  password.addEventListener("input", () => {
    // Gọi hàm chung từ common.js
    const info = getPasswordStrengthInfo(password.value);
    
    pwBar.style.width = info.percent + "%";
    pwNote.textContent = info.text;
  });

  // --- 3. Thiết lập ẩn/hiện mật khẩu ---
  // Gọi hàm chung từ common.js
  setupPasswordToggle(password, confirm, togglePw);

  // --- 4. Xử lý submit form ---
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let ok = true;
    errPw.textContent = "";
    errConfirm.textContent = "";
    errTerms.textContent = "";

    // Gọi hàm chung
    if (getPasswordStrengthInfo(password.value).score < 3) {
      errPw.textContent =
        "Please choose a stronger password (min 8 chars, including numbers and symbols).";
      ok = false;
    }

    if (password.value !== confirm.value) {
      errConfirm.textContent = "Passwords do not match.";
      ok = false;
    }

    if (!agree.checked) {
      errTerms.textContent = "You must agree to the terms.";
      ok = false;
    }

    if (!ok) return; 

    form.submit();
  });
});