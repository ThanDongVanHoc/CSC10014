// Đảm bảo code chạy sau khi DOM đã tải xong
document.addEventListener("DOMContentLoaded", function () {
  
  // Lấy các phần tử DOM
  const form = document.getElementById("signupForm");
  const email = document.getElementById("email");
  const fullname = document.getElementById("fullname");
  const password = document.getElementById("password");
  const confirm = document.getElementById("confirm");
  const agree = document.getElementById("agree");

  const errName = document.getElementById("err-name");
  const errEmail = document.getElementById("err-email");
  const errPw = document.getElementById("err-pw");
  const errConfirm = document.getElementById("err-confirm");
  const errTerms = document.getElementById("err-terms");

  const pwBar = document.getElementById("pwBar");
  const pwNote = document.getElementById("pwNote");
  const togglePw = document.getElementById("togglePw");

  // === CÁC HÀM DÙNG CHUNG ĐÃ BỊ XÓA ===
  // (validateEmail và scorePassword đã được xóa)

  // 1. Cập nhật thanh trạng thái mật khẩu
  password.addEventListener("input", () => {
    // Gọi hàm chung
    const info = getPasswordStrengthInfo(password.value);
    
    pwBar.style.width = info.percent + "%";
    pwNote.textContent = info.text;
    
    // Không đổi màu thanh bar
  });

  // 2. Thiết lập ẩn/hiện mật khẩu
  // Gọi hàm chung
  setupPasswordToggle(password, confirm, togglePw);

  // 3. Xử lý submit form
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    errName.textContent = "";
    errEmail.textContent = "";
    errPw.textContent = "";
    errConfirm.textContent = "";
    errTerms.textContent = "";

    if (!fullname.value.trim()) {
      errName.textContent = "Please enter your full name.";
      ok = false;
    }
    
    // Gọi hàm chung
    if (!validateEmail(email.value)) {
      errEmail.textContent = "Enter a valid email address.";
      ok = false;
    }
    
    // Gọi hàm chung
    if (getPasswordStrengthInfo(password.value).score < 3) {
      errPw.textContent = "Please choose a stronger password.";
      ok = false;
    }
    
    if (password.value !== confirm.value) {
      errConfirm.textContent = "Passwords do not match.";
      ok = false;
    }
    if (!agree.checked) {
      errTerms.textContent = "You must agree to the terms to continue.";
      ok = false;
    }

    if (!ok) return;

  form.submit();
});
});
