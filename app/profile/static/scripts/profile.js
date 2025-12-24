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

  function toggleLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
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
    document.getElementById('gender').disabled = false;
    document.getElementById('dob').disabled = false;

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
    document.getElementById('gender').disabled = true;
    document.getElementById('dob').disabled = true;
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
      gender: document.getElementById("gender").value,
      dob: document.getElementById("dob").value,
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
          document.getElementById('gender').disabled = true;
          document.getElementById('dob').disabled = true;

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

let allMedicalRecords = []; // Lưu trữ dữ liệu để dùng cho viewDetail
let currentViewingRecordId = null;
// 1. Hàm xử lý khi user chọn ảnh
async function handleOCRUpload(input) {
    currentViewingRecordId = null;
    const file = input.files[0];
    if (!file) return;

    
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("http://127.0.0.1:8000/extract-medical-data", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (result.draft_data) {
            // 1. Cập nhật tiêu đề cho chế độ "Trích xuất"
            document.getElementById('draft-title').innerText = "Confirm Extracted Data";
            document.getElementById('draft-subtitle').innerText = "Please verify and edit the information from your medical record.";

            // 2. Điền dữ liệu cơ bản
            document.getElementById('draft-hospital').value = result.draft_data.hospitalName || "";
            document.getElementById('draft-date').value = result.draft_data.visitDate || "";
            document.getElementById('draft-diagnosis').value = result.draft_data.diagnosis || "";
            document.getElementById('draft-doctor').value = result.draft_data.doctorName || "";
            document.getElementById('draft-symptoms').value = result.draft_data.symptoms || "";
            document.getElementById('draft-notes').value = result.draft_data.notes || "";

            // 3. Render danh sách thuốc từ AI
            renderMedicationsDraft(result.draft_data.medications || []);

            // 4. Hiển thị form và cuộn xuống
            const draftContainer = document.getElementById('ocr-draft-container');
            draftContainer.style.display = 'block';
            draftContainer.scrollIntoView({ behavior: 'smooth' });
            
            showToastMessage("Scan completed! Please verify.", true);
        }
    } catch (error) {
        console.error(">>> [OCR ERROR]", error);
        showToastMessage("AI Server connection failed.", false);
    } finally {
        input.value = ''; // Reset input file để có thể chọn lại cùng 1 ảnh
    }
}

// 2. Hàm hiển thị dữ liệu lên Form nháp
function showDraftForm(data) {
    document.getElementById('ocr-draft-container').style.display = 'block';
    document.getElementById('draft-hospital').value = data.hospitalName || '';
    document.getElementById('draft-date').value = data.visitDate || '';
    document.getElementById('draft-diagnosis').value = data.diagnosis || '';
    document.getElementById('draft-doctor').value = data.doctorName || '';
    document.getElementById('draft-symptoms').value = data.symptoms || '';
    document.getElementById('draft-notes').value = data.notes || '';
    
    // Lưu lại danh sách thuốc ngầm (vì thuốc thường phức tạp để sửa nhanh)
    window.currentMedications = data.medications || [];
    
    // Cuộn tới form nháp
    document.getElementById('ocr-draft-container').scrollIntoView({ behavior: 'smooth' });
}
 // Hàm để load từ database lên front-end
async function loadMedicalHistory() {
    const container = document.querySelector('.history-list-container');
    if (!container) return;

    try {
        const response = await fetch("/profile/api/get-medical-history");
        const result = await response.json();

        if (result.status === "success" && result.data.length > 0) {
            // Xóa sạch dữ liệu cũ và cập nhật biến toàn cục
            container.innerHTML = '';
            allMedicalRecords = result.data; 

            result.data.forEach(record => {
                // A. Xử lý ngày tháng
                const dateObj = new Date(record.visitDate);
                const month = dateObj.toLocaleString('en-US', { month: 'short' });
                const day = dateObj.getDate().toString().padStart(2, '0');

                // B. Xử lý hiển thị danh sách thuốc (Medication Tags)
                // Chúng ta chỉ hiển thị tên thuốc ở danh sách ngoài cho gọn
                let medicationsHTML = '';
                if (record.medications && record.medications.length > 0) {
                    medicationsHTML = `
                        <div class="med-tags-history" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;">
                            ${record.medications.map(med => `
                                <span style="font-size: 10px; background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 4px; border: 1px solid #dbeafe;">
                                    ${med.name}
                                </span>
                            `).join('')}
                        </div>
                    `;
                }

                // C. Render template
                const recordHTML = `
                    <div class="history-item-card fade-up">
                        <div class="date-badge">
                            <span class="month">${month}</span>
                            <span class="day">${day}</span>
                        </div>

                        <div class="history-main-info">
                            <h4 class="diagnosis-title">${record.diagnosis || 'No Diagnosis'}</h4>
                            <div class="hospital-meta">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 21h18M3 7v14M21 7v14M9 21V11h6v10M12 3v4M12 7h.01"></path>
                                </svg>
                                <span>${record.hospitalName || 'Unknown Hospital'}</span>
                            </div>
                            ${medicationsHTML}
                        </div>

                        <div class="history-status">
                            <div class="history-actions" style="display: flex; gap: 8px;">
                                <button class="btn-view-detail" onclick="viewRecordDetail('${record.id}')" title="View Detail">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                                <button class="btn-delete-record" onclick="deleteMedicalRecord('${record.id}')" 
                                        style="background: #fee2e2; color: #ef4444; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', recordHTML);
            });
        } else {
            container.innerHTML = '<div class="empty-history"><p>No medical records found. Upload an image to start.</p></div>';
        }
    } catch (error) {
        console.error(">>> [RENDER ERROR]", error);
        container.innerHTML = '<p class="text-error" style="text-align:center; padding:20px;">Error loading history. Please refresh.</p>';
    }
}

// Hàm bổ trợ để xem chi tiết (bạn có thể phát triển thêm modal ở đây)
function viewRecordDetail(id) {
    const container = document.getElementById('ocr-draft-container');
    const btnView = event.currentTarget;
    
    // Nếu đang bấm vào đúng thẻ đang mở -> Đóng lại (giống Discard)
    if (currentViewingRecordId === id && container.style.display === 'block') {
        cancelDraft(); // Gọi hàm đóng có sẵn của bạn
        return;
    }

    // Nếu không, thực hiện hiển thị như bình thường
    currentViewingRecordId = id;
    
    // Đổi tất cả các icon khác về trạng thái "mắt mở" trước khi đổi icon hiện tại
    document.querySelectorAll('.btn-view-detail').forEach(btn => {
        btn.classList.remove('viewing');
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });

    // Đổi icon của nút vừa bấm sang "mắt gạch chéo"
    btnView.classList.add('viewing');
    btnView.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    // Đổ dữ liệu vào form (Giữ nguyên logic cũ của bạn)
    const record = allMedicalRecords.find(r => r.id == id);
    if (!record) return;

    // 2. Cập nhật tiêu đề cho chế độ "Xem chi tiết"
    document.getElementById('draft-title').innerText = "Medical Record Detail";
    document.getElementById('draft-subtitle').innerText = `Viewing history record #${id}`;

    // 3. Điền dữ liệu vào form
    document.getElementById('draft-hospital').value = record.hospitalName || "";
    document.getElementById('draft-date').value = record.visitDate || "";
    document.getElementById('draft-diagnosis').value = record.diagnosis || "";
    document.getElementById('draft-doctor').value = record.doctorName || "";
    document.getElementById('draft-symptoms').value = record.symptoms || "";
    document.getElementById('draft-notes').value = record.notes || "";

    // 4. Render danh sách thuốc của bản ghi này
    renderMedicationsDraft(record.medications || []);

    // 5. Hiện Form và cuộn trang
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
}

// Gọi hàm khi trang load xong
document.addEventListener("DOMContentLoaded", loadMedicalHistory);

// 3. Hàm Save cuối cùng vào Database (Flask Server)
document.getElementById('btn-save-medical-db')?.addEventListener('click', async function() {
    const btn = this;
    btn.innerText = "Saving...";
    btn.disabled = true;

    const medRows = document.querySelectorAll('#draft-medications-list .med-row');
    const medications = Array.from(medRows).map(row => ({
        name: row.querySelector('.med-name').value,
        dosage: row.querySelector('.med-dosage').value
    })).filter(m => m.name.trim() !== ""); // Lấy các thuốc có tên

    const finalData = {
        record_id: currentViewingRecordId,
        draft_data: {
            hospitalName: document.getElementById('draft-hospital').value,
            visitDate: document.getElementById('draft-date').value,
            diagnosis: document.getElementById('draft-diagnosis').value,
            doctorName: document.getElementById('draft-doctor').value,
            symptoms: document.getElementById('draft-symptoms').value,
            notes: document.getElementById('draft-notes').value,
            medications: medications // Gửi list thuốc mới thu thập
        }
    };
    try {
        const response = await fetch("/profile/api/save-medical-record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalData)
        });

        if (response.ok) {
            setTimeout(() => {
                  showToastMessage("Save successfully", true);
                  window.location.href = "/profile"; 
              }, 1500);
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
    currentViewingRecordId = null; 
    document.querySelectorAll('.btn-view-detail').forEach(btn => {
        btn.classList.remove('viewing'); // Xóa class nhận diện
        // Trả lại icon con mắt mở bình thường
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
    document.getElementById('ocr-draft-container').style.display = 'none';
}

function createMedRowHTML(med = {}) {
    return `
        <div class="med-row" style="display: flex; gap: 8px; margin-bottom: 8px;">
            <input type="text" placeholder="Medicine Name" class="input-modern med-name" value="${med.name || ''}" style="flex: 2; margin-bottom:0;">
            <input type="text" placeholder="Dosage" class="input-modern med-dosage" value="${med.dosage || ''}" style="flex: 1; margin-bottom:0;">
            <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; border:none; color:#ef4444; padding:0 10px; border-radius:6px; cursor:pointer;">×</button>
        </div>`;
}

function renderMedicationsDraft(meds) {
    const list = document.getElementById('draft-medications-list');
    list.innerHTML = meds.map(m => createMedRowHTML(m)).join('');
}

function addNewMedicationRow() {
    const list = document.getElementById('draft-medications-list');
    list.insertAdjacentHTML('beforeend', createMedRowHTML());
}

async function deleteMedicalRecord(id) {
    if (!confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
        return;
    }

    try {
        const response = await fetch(`/profile/api/delete-medical-record/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (result.status === "success") {
            
            // Hiệu ứng biến mất trân giao diện mà không cần reload trang
            const card = document.getElementById(`record-card-${id}`);
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    card.remove();
                    // Nếu sau khi xóa không còn bản ghi nào, hiện thông báo trống
                    const container = document.querySelector('.history-list-container');
                    if (container.children.length === 0) {
                        container.innerHTML = '<div class="empty-history"><p>No medical records found.</p></div>';
                    }
                }, 300);
            }
        } else {
            return;
        }
        if (response.ok) {
            setTimeout(() => {
                  window.location.href = "/profile"; 
              }, 1500);
        }
    } catch (error) {
        console.error("Delete error:", error);
        showToastMessage("Could not connect to server", false);
    }
}


// 1. Mở và Đóng Modal
function openEmergencyModal() {
    document.getElementById('emergency-modal').style.display = 'flex';
    // Ngăn scroll trang web khi đang mở modal
    document.body.style.overflow = 'hidden';
}

function closeEmergencyModal() {
    document.getElementById('emergency-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// 2. Thêm input mới khi bấm nút "+"
function addEmergencyField(containerId, value = "") {
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'dynamic-field-row';
    
    row.innerHTML = `
        <input type="text" class="input-modern" value="${value}" placeholder="Enter information..." style="flex: 1; margin-bottom: 0;">
        <button type="button" class="btn-remove-field" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(row);
}

// 3. Xử lý Save dữ liệu
document.getElementById('btn-save-emergency')?.addEventListener('click', async function() {
    const btn = this;
    
    // Thu thập dữ liệu
    const bloodGroup = document.getElementById('emergency-blood').value;
    const allergies = Array.from(document.querySelectorAll('#allergy-list input'))
                           .map(i => i.value.trim()).filter(v => v !== "");
    const medicalHistory = Array.from(document.querySelectorAll('#history-list input'))
                                .map(i => i.value.trim()).filter(v => v !== "");

    const payload = {
        blood_group: bloodGroup,
        allergies: allergies,
        medical_history: medicalHistory
    };

    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const response = await fetch('/profile/api/update-emergency-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToastMessage("Emergency ID updated successfully!", true);
            // Bạn có thể reload hoặc cập nhật UI tại đây
            setTimeout(() => location.reload(), 1500);
        } else {
            showToastMessage("Failed to update.", false);
        }
    } catch (error) {
        showToastMessage("Network error.", false);
    } finally {
        btn.innerText = "Save Changes";
        btn.disabled = false;
    }
});

// Hàm rút gọn chuỗi
function truncateString(str, limit = 30) {
    if (!str || str.length <= limit) return str || "None";
    return str.substring(0, limit) + "...";
}

// 1. Hàm load dữ liệu lên Card và Modal khi vào trang
async function initEmergencyCard() {
    try {
        const response = await fetch('profile/api/get-emergency-card');
        const result = await response.json();

        if (result.status === "success" && result.data) {
            const d = result.data;

            // 1. Hiển thị lên Card (áp dụng cắt chuỗi 30 ký tự)
            document.getElementById('display-blood-type').innerText = `Blood Type: ${d.blood_group}`;
            document.getElementById('display-allergies').innerText = truncateString(d.allergies_str, 30);
            document.getElementById('display-history').innerText = truncateString(d.history_str, 30);

            // 2. Điền dữ liệu vào Modal khi người dùng nhấn Update
            document.getElementById('emergency-blood').value = d.blood_group !== "N/A" ? d.blood_group : "";
            
            const allergyList = document.getElementById('allergy-list');
            allergyList.innerHTML = '';
            d.allergies_raw.forEach(val => addEmergencyField('allergy-list', val));

            const historyList = document.getElementById('history-list');
            historyList.innerHTML = '';
            d.history_raw.forEach(val => addEmergencyField('history-list', val));
        }
    } catch (error) {
        console.error("Load error:", error);
    }
}

// Gọi hàm load ngay khi tải trang
document.addEventListener('DOMContentLoaded', initEmergencyCard);