const data = {
    checklist: [
        { id: 1, title: 'CCCD Gắn Chip (Bản chính)', desc: 'Còn hạn sử dụng, không bị mờ số/ảnh', required: true },
        { id: 2, title: 'CCCD Gắn Chip (03 bản sao)', desc: 'Đã công chứng không quá 6 tháng', required: true },
        { id: 3, title: 'Sổ Hộ Khẩu / Giấy Xác Nhận Cư Trú', desc: 'Mẫu CT07 hoặc bản gốc SHK', required: true },
        { id: 4, title: 'Giấy Khai Sinh', desc: 'Bản sao trích lục (nếu cần đối chiếu)', required: false },
        { id: 5, title: 'Ảnh thẻ 4x6 (Phông trắng)', desc: 'Chụp không quá 6 tháng, rõ mặt', required: true },
        { id: 6, title: 'Đơn Đề Nghị (Mẫu 01)', desc: 'Điền đầy đủ thông tin, ký tên', required: true },
        { id: 7, title: 'Lệ phí hành chính', desc: 'Chuẩn bị tiền mặt hoặc chuyển khoản', required: true },
        { id: 8, title: 'Giấy Ủy Quyền', desc: 'Có xác nhận của địa phương (nếu đi thay)', required: false },
    ],
    contacts: [
        { name: 'Cảnh Sát Khu Vực', phone: '113', type: 'security' },
        { name: 'Cứu Hỏa', phone: '114', type: 'fire' },
        { name: 'Cấp Cứu Y Tế', phone: '115', type: 'medical' },
        { name: 'Tổng Đài Thành Phố', phone: '1022', type: 'city' }
    ],
    forms: [
        { name: 'Đơn Đăng Ký Thường Trú', type: 'PDF', size: '245 KB', icon: 'fa-file-pdf' },
        { name: 'Đơn Xin Cấp Giấy Xác Nhận', type: 'DOCX', size: '128 KB', icon: 'fa-file-word' },
        { name: 'Mẫu Cam Kết Cá Nhân', type: 'PDF', size: '198 KB', icon: 'fa-file-pdf' },
        { name: 'Biên Bản Xác Minh', type: 'DOCX', size: '156 KB', icon: 'fa-file-word' },
        { name: 'Giấy Ủy Quyền Chuẩn', type: 'PDF', size: '112 KB', icon: 'fa-file-pdf' },
        { name: 'Phiếu Tiếp Nhận Hồ Sơ', type: 'XLSX', size: '89 KB', icon: 'fa-file-excel' }
    ],
    sops: [
        { name: 'Quy Trình Tiếp Nhận Hồ Sơ', category: 'Thủ tục hành chính' },
        { name: 'Hướng Dẫn Kiểm Tra Giấy Tờ', category: 'Xác thực' },
        { name: 'Quy Định Về Lệ Phí', category: 'Tài chính' },
        { name: 'Xử Lý Trường Hợp Đặc Biệt', category: 'Ngoại lệ' },
        { name: 'Quy Trình Bảo Mật Thông Tin', category: 'An ninh' },
        { name: 'Chuẩn Phục Vụ Công Dân', category: 'Dịch vụ' }
    ],
    templates: [
        { name: 'Biên Bản Họp', type: 'DOCX', size: '145 KB', icon: 'fa-file-word' },
        { name: 'Báo Cáo Tình Hình', type: 'XLSX', size: '289 KB', icon: 'fa-file-excel' },
        { name: 'Công Văn Chính Thức', type: 'DOCX', size: '167 KB', icon: 'fa-file-word' },
        { name: 'Thông Báo Nội Bộ', type: 'PDF', size: '123 KB', icon: 'fa-file-pdf' },
        { name: 'Biểu Mẫu Thống Kê', type: 'XLSX', size: '234 KB', icon: 'fa-file-excel' }
    ]
};

// =========================================
// DOM ELEMENTS
// =========================================
const els = {
    checklist: document.getElementById('checklistContainer'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    statCompleted: document.getElementById('statCompleted'),
    statRequired: document.getElementById('statRequired'),
    statDocs: document.getElementById('statDocs'),
    contactList: document.getElementById('contactList'),
    clock: document.getElementById('clock'),
    location: document.getElementById('locationInfo')
};

// =========================================
// INITIALIZATION
// =========================================

function init() {
    renderChecklist();
    renderContacts();
    startClock();
    updateLocation();
    loadState();
    updateStats();
}

// --- Clock ---
function startClock() {
    const update = () => {
        const now = new Date();
        els.clock.textContent = now.toLocaleTimeString('vi-VN', { hour12: false });
    };
    update();
    setInterval(update, 1000);
}

function getQueryParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
}



function updateLocation() {
    const name = getQueryParam('name');
    const address = getQueryParam('address');
    
    if (name && address) {
        els.location.innerHTML = `<i class="fas fa-map-marker-alt" style="color:var(--accent)"></i> ${name}, ${address}`;
    } else {
        els.location.innerHTML = '<i class="fas fa-map-marker-alt" style="color:var(--accent)"></i> Địa điểm không xác định';
    }
}


// --- Checklist Logic ---
function renderChecklist() {
    els.checklist.innerHTML = data.checklist.map((item, index) => `
        <div class="checklist-item" id="item-${index}" onclick="toggleCheck(${index})">
            <div class="custom-checkbox" id="cb-${index}"></div>
            <div class="item-content">
                <div class="item-title">${item.title}</div>
                <div class="item-desc">${item.desc}</div>
                <span class="tag ${item.required ? 'tag-required' : 'tag-optional'}">
                    ${item.required ? 'Bắt buộc' : 'Tùy chọn'}
                </span>
            </div>
        </div>
    `).join('');
}

function toggleCheck(index) {
    const itemEl = document.getElementById(`item-${index}`);
    itemEl.classList.toggle('checked');
    
    if(itemEl.classList.contains('checked')) {
        showToast('Đã hoàn thành: ' + data.checklist[index].title, 'success');
    }

    updateProgress();
    saveState();
}

function updateProgress() {
    const items = document.querySelectorAll('.checklist-item');
    const checked = document.querySelectorAll('.checklist-item.checked');
    
    const percent = Math.round((checked.length / items.length) * 100);
    
    els.progressBar.style.width = `${percent}%`;
    els.progressText.textContent = `${percent}%`;
    els.statCompleted.textContent = `${checked.length}/${items.length}`;

    if (percent === 100) {
        els.progressBar.style.background = '#22c55e';
        showToast('🎉 Chúc mừng! Bạn đã hoàn thành tất cả các bước chuẩn bị!', 'success');
    }
}

function updateStats() {
    const required = data.checklist.filter(item => item.required).length;
    els.statRequired.textContent = required;
    els.statDocs.textContent = data.forms.length + data.templates.length;
}

// --- Contacts Logic ---
function renderContacts() {
    els.contactList.innerHTML = data.contacts.map(c => `
        <li style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #e2e8f0;">
            <div style="display: flex; gap: 12px; align-items: center;">
                <div style="width: 36px; height: 36px; background: #fee2e2; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--danger-text);">
                    <i class="fas ${getContactIcon(c.type)}"></i>
                </div>
                <div>
                    <div style="font-weight: 600; font-size: 13px;">${c.name}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Hỗ trợ 24/7</div>
                </div>
            </div>
            <a href="tel:${c.phone}" style="color: var(--danger-text); font-weight: 700; font-size: 15px; padding: 6px 12px; background: #fee2e2; border-radius: 6px; font-family: monospace;">
                ${c.phone}
            </a>
        </li>
    `).join('');
}

function getContactIcon(type) {
    const icons = {
        security: 'fa-shield-alt',
        fire: 'fa-fire-extinguisher',
        medical: 'fa-ambulance',
        city: 'fa-building'
    };
    return icons[type] || 'fa-phone';
}

// --- Modal System ---
function openModal(type) {
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitleText');
    const icon = document.getElementById('modalIcon');
    const body = document.getElementById('modalBody');

    let content = '';
    let iconHtml = '';

    if (type === 'forms') {
        title.textContent = 'Biểu Mẫu Đơn Từ';
        iconHtml = '<i class="fas fa-file-alt"></i>';
        content = getFormsContent();
    } else if (type === 'sop') {
        title.textContent = 'Quy Trình SOP';
        iconHtml = '<i class="fas fa-book-reader"></i>';
        content = getSOPContent();
    } else if (type === 'templates') {
        title.textContent = 'Mẫu Tài Liệu';
        iconHtml = '<i class="fas fa-file-word"></i>';
        content = getTemplatesContent();
    } else if (type === 'contacts') {
        title.textContent = 'Danh Bạ Liên Hệ';
        iconHtml = '<i class="fas fa-phone-volume"></i>';
        content = getContactsContent();
    }

    icon.innerHTML = iconHtml;
    body.innerHTML = content;
    modal.classList.add('active');
}

function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('modalOverlay').classList.remove('active');
}

function getFormsContent() {
    return `
        <div class="template-grid">
            ${data.forms.map(form => `
                <div class="template-item" onclick="downloadFile('${form.name}')">
                    <div class="template-icon">
                        <i class="fas ${form.icon}"></i>
                    </div>
                    <div class="template-info">
                        <div class="template-name">${form.name}</div>
                        <div class="template-meta">${form.type} • ${form.size}</div>
                    </div>
                    <i class="fas fa-download template-action"></i>
                </div>
            `).join('')}
        </div>
    `;
}

function getSOPContent() {
    return `
        <div class="template-grid">
            ${data.sops.map(sop => `
                <div class="template-item" onclick="viewSOP('${sop.name}')">
                    <div class="template-icon" style="background: #0891b2;">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="template-info">
                        <div class="template-name">${sop.name}</div>
                        <div class="template-meta">${sop.category}</div>
                    </div>
                    <i class="fas fa-chevron-right template-action"></i>
                </div>
            `).join('')}
        </div>
    `;
}

function getTemplatesContent() {
    return `
        <div class="template-grid">
            ${data.templates.map(template => `
                <div class="template-item" onclick="downloadFile('${template.name}')">
                    <div class="template-icon" style="background: #7c3aed;">
                        <i class="fas ${template.icon}"></i>
                    </div>
                    <div class="template-info">
                        <div class="template-name">${template.name}</div>
                        <div class="template-meta">${template.type} • ${template.size}</div>
                    </div>
                    <i class="fas fa-download template-action"></i>
                </div>
            `).join('')}
        </div>
    `;
}

function getContactsContent() {
    const allContacts = [
        { name: 'Văn Phòng Chính', phone: '028 1234 5678', dept: 'Hành chính', icon: 'fa-building' },
        { name: 'Bộ Phận IT', phone: '028 1234 5679', dept: 'Kỹ thuật', icon: 'fa-laptop-code' },
        { name: 'Phòng Nhân Sự', phone: '028 1234 5680', dept: 'Nhân sự', icon: 'fa-users' },
        { name: 'Bảo Vệ An Ninh', phone: '028 1234 5681', dept: 'An ninh', icon: 'fa-shield-alt' },
        { name: 'Quản Lý Cơ Sở', phone: '028 1234 5682', dept: 'Cơ sở vật chất', icon: 'fa-tools' }
    ];

    return `
        <div class="contact-modal-list">
            ${allContacts.map(contact => `
                <a href="tel:${contact.phone}" class="contact-modal-item">
                    <div class="contact-modal-icon">
                        <i class="fas ${contact.icon}"></i>
                    </div>
                    <div class="template-info">
                        <div class="template-name">${contact.name}</div>
                        <div class="template-meta">${contact.dept} • ${contact.phone}</div>
                    </div>
                    <i class="fas fa-phone-alt template-action"></i>
                </a>
            `).join('')}
        </div>
    `;
}

// --- Utility Functions ---
function downloadFile(name) {
    showToast('Đang tải xuống: ' + name, 'info');
    closeModal();
}

function viewSOP(name) {
    showToast('Đang mở: ' + name, 'info');
    closeModal();
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const icons = {
        success: 'fa-check-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };
    
    const colors = {
        success: 'var(--success-text)',
        info: 'var(--accent)',
        warning:'var(--warning-text)',
        error: 'var(--danger-text)'
    };

    // Icon hiển thị
    const icon = document.createElement('i');
    icon.className = `fas ${icons[type]}`;
    icon.style.marginRight = '12px';
    icon.style.fontSize = '18px';
    icon.style.color = type === 'success' ? '#10b981' : 
                        type === 'error' ? '#ef4444' : 
                        type === 'warning' ? '#f59e0b' : '#3b82f6';

    // Nội dung text
    const text = document.createElement('span');
    text.textContent = msg;
    text.style.color = '#1e293b';
    text.style.fontWeight = '500';

    toast.appendChild(icon);
    toast.appendChild(text);

    // Thêm style cho toast
    toast.style.borderLeft = `4px solid ${icon.style.color}`;

    container.appendChild(toast);

    // Hiệu ứng xuất hiện
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Tự động tắt sau 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300); // Đợi hiệu ứng trượt ra kết thúc
    }, 3000);
}

// --- Data Persistence (Lưu trạng thái) ---
function saveState() {
    const checkedIndices = [];
    document.querySelectorAll('.checklist-item.checked').forEach(item => {
        // Lấy index từ id "item-1", "item-2"...
        const id = item.id.replace('item-', '');
        checkedIndices.push(parseInt(id));
    });
    localStorage.setItem('admin_dashboard_state', JSON.stringify(checkedIndices));
}

function loadState() {
    const saved = localStorage.getItem('admin_dashboard_state');
    if (saved) {
        try {
            const indices = JSON.parse(saved);
            indices.forEach(index => {
                const item = document.getElementById(`item-${index}`);
                if (item) {
                    item.classList.add('checked');
                    // Đánh dấu checkbox con
                    const cb = document.getElementById(`cb-${index}`);
                    if(cb) cb.classList.add('checked'); 
                }
            });
            updateProgress();
        } catch (e) {
            console.error('Lỗi đọc dữ liệu cũ', e);
        }
    }
}

function resetAll() {
    if(confirm('Bạn có chắc muốn xóa toàn bộ tiến độ và làm lại từ đầu?')) {
        localStorage.removeItem('admin_dashboard_state');
        document.querySelectorAll('.checklist-item').forEach(item => {
            item.classList.remove('checked');
        });
        updateProgress();
        showToast('Đã làm mới toàn bộ danh sách!', 'info');
    }
}

function triggerGuide() {
    const locationName = getQueryParam('name');
    
    if (!locationName) {
        showToast('Không tìm thấy thông tin địa điểm để hướng dẫn!', 'error');
        return;
    }

    // Check if running inside an iframe or opened by a parent window
    if (window.parent && window.parent.handleStartGuideFromAdmin) {
        // Option 1: Direct function call if same origin
        showToast('Đang chuyển sang chế độ dẫn đường...', 'success');
        setTimeout(() => {
            window.parent.handleStartGuideFromAdmin(locationName);
        }, 500); // Small delay for visual feedback
    } else if (window.opener && window.opener.handleStartGuideFromAdmin) {
        // Option 2: If opened in new tab/window
        window.opener.handleStartGuideFromAdmin(locationName);
        window.close();
    } else {
        // Fallback or postMessage for cross-origin
        console.warn('Cannot find parent handler. Trying postMessage...');
        if (window.parent) {
             window.parent.postMessage({ type: 'START_GUIDE', location: locationName }, '*');
        } else {
             showToast('Không thể kết nối với bản đồ chính.', 'error');
        }
    }
}

// --- Khởi chạy ---
window.addEventListener('DOMContentLoaded', init);
