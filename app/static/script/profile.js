document.addEventListener("DOMContentLoaded", function () {
  // 1. Lấy các phần tử DOM
  const btnChange = document.getElementById("btnChange");
  const btnDiscard = document.getElementById("btnDiscard");
  const btnSave = document.getElementById("btnSave");
  const editButtons = document.getElementById("editButtons");

  // Input & Display box của Media
  const mediaInput = document.getElementById("media");
  const mediaDisplay = document.getElementById("media-display");
  const mediaTextContent = document.getElementById("media-text-content");

  // Lấy các input cần edit (TRỪ EMAIL vì email không được sửa)
  const inputsToEdit = document.querySelectorAll(
    ".profile-form input:not(#email)"
  );

  let originalValues = {};

  // ==========================================
  // HÀM HỖ TRỢ: HIỆN THÔNG BÁO (TOAST)
  // ==========================================
  function showToastMessage(message, isSuccess = true) {
    const toast = document.getElementById("toast-box");
    // Nếu chưa có toast trong HTML thì thôi (tránh lỗi)
    if (!toast) return;

    const msgElement = toast.querySelector(".toast-message");
    const iconContainer = toast.querySelector(".toast-icon-container");

    // 1. Set nội dung text
    msgElement.innerText = message;

    // 2. Đổi icon và màu sắc tùy theo Trạng thái
    if (isSuccess) {
      // Thành công: Màu xanh, Icon dấu tích
      iconContainer.style.backgroundColor = "#ecfdf5";
      iconContainer.style.color = "#00b37e";
      iconContainer.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else {
      // Thất bại: Màu đỏ, Icon dấu X
      iconContainer.style.backgroundColor = "#fef2f2";
      iconContainer.style.color = "#ef4444";
      iconContainer.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    }

    // 3. Hiện Toast (Thêm class .show để kích hoạt CSS trượt lên)
    toast.classList.add("show");

    // 4. Tự động ẩn sau 3 giây
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // ==========================================
  // HÀM HỖ TRỢ: CẬP NHẬT GIAO DIỆN MEDIA
  // ==========================================
  // isEditing: true (đang sửa), false (đang xem)
  function updateMediaView(isEditing) {
    const hasLink = mediaInput.value.trim().length > 0;

    if (isEditing) {
      // Đang sửa: Luôn hiện Input thật, ẩn Box copy
      mediaInput.style.display = "block";
      mediaDisplay.style.display = "none";
    } else {
      // Đang xem (View Only)
      if (hasLink) {
        // Có link: Hiện Box copy, ẩn Input
        mediaInput.style.display = "none";
        mediaDisplay.style.display = "flex";
        mediaTextContent.innerText = mediaInput.value; // Cập nhật text hiển thị
      } else {
        // Không có link: Hiện Input disabled (để thấy placeholder)
        mediaInput.style.display = "block";
        mediaDisplay.style.display = "none";
      }
    }
  }

  // Khởi chạy lần đầu khi load trang
  updateMediaView(false);

  // ==========================================
  // 2. Chức năng COPY LINK
  // ==========================================
  mediaDisplay.addEventListener("click", function () {
    const textToCopy = mediaInput.value;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        // Hiệu ứng đổi chữ tooltip thành "Copied!"
        const tooltip = mediaDisplay.querySelector(".copy-tooltip");
        const originalText = tooltip.innerText;

        tooltip.innerText = "Copied!";
        tooltip.style.backgroundColor = "#00b37e";

        setTimeout(() => {
          tooltip.innerText = originalText;
          tooltip.style.backgroundColor = "#111827";
        }, 1500);
      });
    }
  });

  // ==========================================
  // 3. Chức năng CHANGE (Mở khóa form)
  // ==========================================
  btnChange.addEventListener("click", function () {
    // Lưu giá trị hiện tại vào bộ nhớ tạm
    inputsToEdit.forEach((input) => {
      originalValues[input.id] = input.value;
      input.disabled = false; // Mở khóa input
    });

    // Ẩn nút Edit, Hiện cặp nút Save/Discard
    btnChange.style.display = "none";
    editButtons.style.display = "flex";

    // Chuyển Media sang chế độ sửa (Hiện input)
    updateMediaView(true);

    // Focus vào ô tên đầu tiên
    document.getElementById("name").focus();
  });

  // ==========================================
  // 4. Chức năng DISCARD (Hủy bỏ & Khóa lại)
  // ==========================================
  btnDiscard.addEventListener("click", function () {
    // Khôi phục giá trị cũ từ bộ nhớ tạm
    inputsToEdit.forEach((input) => {
      input.value = originalValues[input.id];
      input.disabled = true; // Khóa lại input
    });

    // Đổi lại nút bấm
    editButtons.style.display = "none";
    btnChange.style.display = "inline-flex"; // Dùng inline-flex để giữ display flex của nút

    // Chuyển Media sang chế độ xem
    updateMediaView(false);
  });

  // ==========================================
  // 5. Chức năng SAVE (Gửi dữ liệu lên Server)
  // ==========================================
  btnSave.addEventListener("click", function () {
    // Hiệu ứng Loading (đổi chữ nút Save)
    const originalBtnText = btnSave.innerHTML; // Lưu cả icon HTML
    btnSave.innerText = "Saving...";
    btnSave.disabled = true; // Chặn bấm liên tục

    // Thu thập dữ liệu từ form
    const formData = {
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      media: document.getElementById("media").value,
    };

    // Gửi request POST
    fetch("/auth/update_user_setting", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        if (response.ok) {
          // --- THÀNH CÔNG ---
          // Khóa lại tất cả input
          inputsToEdit.forEach((input) => (input.disabled = true));

          // Đổi lại giao diện nút
          editButtons.style.display = "none";
          btnChange.style.display = "inline-flex";

          // Cập nhật view Media mới nhất
          updateMediaView(false);

          // HIỆN TOAST THÔNG BÁO THÀNH CÔNG
          showToastMessage("Updated successfully!", true);
        } else {
          // --- THẤT BẠI ---
          showToastMessage("Failed to update. Please try again.", false);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        showToastMessage("An error occurred connecting to server.", false);
      })
      .finally(() => {
        // Trả lại trạng thái nút Save ban đầu
        btnSave.innerHTML = originalBtnText;
        btnSave.disabled = false;
      });
  });
});

// 1. Hàm xử lý khi user chọn ảnh
async function handleOCRUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // In thông báo bắt đầu ra Console trình duyệt
    console.log("--- [BẮT ĐẦU] Đang gửi ảnh lên AI Server ---");
    console.log("File chọn:", file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
        // Gọi đến FastAPI (Port 8000)
        const response = await fetch("http://127.0.0.1:8000/extract-medical-data", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            console.error("--- [LỖI] Server trả về mã:", response.status);
            alert("Lỗi server AI (Mã " + response.status + ")");
            return;
        }

        const result = await response.json();

        // IN KẾT QUẢ RA CONSOLE TRÌNH DUYỆT ĐỂ KIỂM TRA
        console.log("--- [THÀNH CÔNG] Dữ liệu từ Model: ---");
        console.log("Dữ liệu thô:", result);
        
        // In dạng bảng cho các thông tin chính
        if(result.draft_data) {
            console.table(result.draft_data);
            console.log("Danh sách thuốc:", result.draft_data.medications);
            alert("Đã nhận dữ liệu AI thành công! Hãy kiểm tra Console (F12)");
        }

    } catch (error) {
        console.error("--- [LỖI KẾT NỐI] ---", error);
        alert("Không thể kết nối đến AI Server. Hãy chắc chắn FastAPI đang chạy ở cổng 8000.");
    }
}

// 2. Hàm hiển thị dữ liệu lên Form nháp
function showDraftForm(data) {
    document.getElementById('ocr-draft-container').style.display = 'block';
    document.getElementById('draft-hospital').value = data.hospitalName || '';
    document.getElementById('draft-date').value = data.visitDate || '';
    document.getElementById('draft-diagnosis').value = data.diagnosis || '';
    document.getElementById('draft-doctor').value = data.doctorName || '';
    
    // Lưu lại danh sách thuốc ngầm (vì thuốc thường phức tạp để sửa nhanh)
    window.currentMedications = data.medications || [];
    
    // Cuộn tới form nháp
    document.getElementById('ocr-draft-container').scrollIntoView({ behavior: 'smooth' });
}

// 3. Hàm Save cuối cùng vào Database (Flask Server)
document.getElementById('btn-save-medical-db')?.addEventListener('click', async function() {
    const btn = this;
    btn.innerText = "Saving...";
    btn.disabled = true;

    const finalData = {
        draft_data: {
            hospitalName: document.getElementById('draft-hospital').value,
            visitDate: document.getElementById('draft-date').value,
            diagnosis: document.getElementById('draft-diagnosis').value,
            doctorName: document.getElementById('draft-doctor').value,
            medications: window.currentMedications
        }
    };

    try {
        const response = await fetch("/api/confirm-medical-record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalData)
        });

        if (response.ok) {
            showToastMessage("Record saved to your history!", true);
            setTimeout(() => location.reload(), 1500); // Reload để hiện record mới
        } else {
            showToastMessage("Failed to save to database.", false);
        }
    } catch (error) {
        showToastMessage("Network error.", false);
    } finally {
        btn.innerText = "Confirm & Save to History";
        btn.disabled = false;
    }
});

function cancelDraft() {
    document.getElementById('ocr-draft-container').style.display = 'none';
}
