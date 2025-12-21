document.addEventListener('DOMContentLoaded', () => {
    loadPatientHistory();
    populateDistricts();
    
    // Allow tag clicking
    window.addTag = function(symptom) {
        const textarea = document.getElementById('symptomsInput');
        const currentVal = textarea.value;
        if(currentVal.length > 0) {
            textarea.value = currentVal + ", " + symptom;
        } else {
            textarea.value = symptom;
        }
        textarea.focus();
    };

    document.getElementById('aiDiagnosticForm').addEventListener('submit', handleFormSubmit);
    
    // Expose reset function globally
    window.resetForm = function() {
        document.getElementById('aiDiagnosticForm').reset();
        document.getElementById('aiResults').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = false;
        document.getElementById('analyzeBtn').innerHTML = `<span>Run AI Analysis</span> <i class="fas fa-arrow-right"></i>`;
        
        // Reset defaults specifically
        document.getElementById('painLevel').value = "5";
        document.getElementById('durationUnit').value = "days";
    }
});

// 1. Populate HCMC Districts
function populateDistricts() {
    const districts = [
        "District 1", "District 3", "District 4", "District 5", "District 6", 
        "District 7", "District 8", "District 10", "District 11", "District 12",
        "Thu Duc City", "Binh Thanh District", "Go Vap District", "Phu Nhuan District",
        "Tan Binh District", "Tan Phu District", "Binh Tan District", "Nha Be County", "Hoc Mon County"
    ];

    const select = document.getElementById('locationInput');
    // Sort alphabetically
    districts.sort().forEach(d => {
        const option = document.createElement('option');
        option.value = d;
        option.textContent = d;
        select.appendChild(option);
    });
}

// 2. Database Fetch for "History"
async function loadPatientHistory() {
    const listContainer = document.getElementById('historyList');
    
    // Hiển thị trạng thái đang tải (skeleton) nếu cần
    listContainer.innerHTML = '<div class="skeleton-loader"></div>'; 

    try {
        // Gọi đến endpoint của Backend (ví dụ: /api/patient-history)
        const response = await fetch('/api/patient-history');
        
        if (!response.ok) {
            throw new Error('Không thể lấy dữ liệu từ server');
        }

        const historyData = await response.json(); // Chuyển dữ liệu nhận được sang JSON

        listContainer.innerHTML = ''; // Xóa sạch loader

        if (historyData.length === 0) {
            listContainer.innerHTML = '<p class="small-text">Chưa có lịch sử bệnh lý.</p>';
            return;
        }

        historyData.forEach(item => {
            const stClass = item.status === "Recovered" ? "recovered-st" : "ongoing-st";
            
            const html = `
                <div class="history-item">
                    <div>
                        <div style="font-weight:600; font-size:14px;">${item.name}</div>
                        <div style="font-size:11px; color:#64748b;">${item.date}</div>
                    </div>
                    <span class="h-status ${stClass}">${item.status}</span>
                </div>
            `;
            listContainer.innerHTML += html;
        });
    } catch (error) {
        console.error("Lỗi:", error);
        listContainer.innerHTML = '<p class="small-text" style="color:red;">Lỗi tải dữ liệu.</p>';
    }
}


function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            alert("Trình duyệt không hỗ trợ định vị.");
            return resolve(null); // Trả về null thay vì lỗi để form vẫn tiếp tục chạy
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                console.warn("Lỗi định vị:", error.message);
                resolve(null); // Nếu lỗi (người dùng từ chối), trả về null
            },
            options
        );
    });
}
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const btn = document.getElementById('analyzeBtn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Getting Location...`;

    // 1. Lấy tọa độ (Đợi người dùng phản hồi Permission)
    const userLocation = await getUserLocation();

    // Cập nhật UI sau khi đã có tọa độ
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Analyzing with AI...`;

    const durationVal = document.getElementById('durationValue').value;
    const durationUnit = document.getElementById('durationUnit').value;

    const formData = {
        symptoms: document.getElementById('symptomsInput').value,
        painLevel: document.getElementById('painLevel').value,
        duration: `${durationVal} ${durationUnit}`,
        location: document.getElementById('locationInput').value,
        // Dữ liệu tọa độ thật từ GPS
        lng: userLocation ? userLocation.lng : null,
        lat: userLocation ? userLocation.lat : null
    };

    console.log("Sending Data to AI:", formData);

    try {
        const response = await fetch('/api/find-hospitals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();

        if (result.redirect_url) {
            window.location.href = result.redirect_url;
        }
    } catch (error) {
        alert("Error connecting to AI Model");
        btn.disabled = false;
        btn.innerHTML = `<span>Run AI Analysis</span>`;
    }
}