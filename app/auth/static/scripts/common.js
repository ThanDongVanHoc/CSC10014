function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function scorePassword(p) {
  let score = 0;
  if (p.length >= 8) score += 1; // Có ít nhất 8 ký tự
  if (/[A-Z]/.test(p)) score += 1; // Có chữ hoa
  if (/[0-9]/.test(p)) score += 1; // Có số
  if (/[^A-Za-z0-9]/.test(p)) score += 1; // Có ký tự đặc biệt
  return score;
}

function getPasswordStrengthInfo(passwordValue) {
  const s = scorePassword(passwordValue);
  const percent = (s / 4) * 100;
  let text = "";

  if (s <= 1) {
    text = "Weak — try longer password with numbers and symbols.";
  } else if (s == 2) {
    text = "Fair — add uppercase or symbols.";
  } else if (s == 3) {
    text = "Good — nearly there.";
  } else {
    text = "Strong password.";
  }

  return {
    score: s,
    percent: percent,
    text: text,
  };
}

/**
 * Thiết lập logic ẩn/hiện cho các trường mật khẩu.
 *
 * @param {HTMLInputElement} passwordInput - Trường input mật khẩu
 * @param {HTMLInputElement} confirmInput - Trường input xác nhận mật khẩu
 * @param {HTMLButtonElement} toggleButton - Nút bấm "Show/Hide"
 */
function setupPasswordToggle(passwordInput, confirmInput, toggleButton) {
  if (!passwordInput || !confirmInput || !toggleButton) {
    console.warn("Password toggle setup failed: Missing elements.");
    return;
  }
  
  toggleButton.addEventListener("click", () => {
    const t = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = t;
    if (confirmInput) {
        confirmInput.type = t;
    }
    toggleButton.textContent = t === "text" ? "Hide" : "Show";
  });
}