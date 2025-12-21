export const AudioController = {
  currentAudio: null,
  currentContainer: null,

  /**
   * 1. Sinh mã HTML cho bong bóng chat audio
   * - Tự động tính số lượng thanh sóng dựa trên duration.
   * - Tạo chiều cao ngẫu nhiên cho các thanh để giống sóng thật.
   */
  generateHTML(audioUrl, durationSeconds) {
    const safeDuration = parseFloat(durationSeconds) || 0;
    const formattedTime = this.formatTime(safeDuration);

    // -- CẤU HÌNH SÓNG --
    const MIN_BARS = 12; // Tối thiểu 12 thanh
    const MAX_BARS = 45; // Tối đa 45 thanh
    const BARS_PER_SEC = 3; // Mật độ: 3 thanh / 1 giây

    // Tính số thanh cần vẽ
    let barCount = Math.floor(safeDuration * BARS_PER_SEC);
    if (barCount < MIN_BARS) barCount = MIN_BARS;
    if (barCount > MAX_BARS) barCount = MAX_BARS;

    // Vẽ các thanh sóng
    let waveBarsHTML = "";
    for (let i = 0; i < barCount; i++) {
      // Chiều cao ngẫu nhiên từ 30% đến 100%
      // Mẹo: Làm cho đoạn giữa cao hơn đoạn đầu/cuối để đẹp hơn
      const randomHeight = Math.floor(Math.random() * 70) + 30;
      waveBarsHTML += `<div class="tr-voice-bar" style="height: ${randomHeight}%"></div>`;
    }

    // Trả về chuỗi HTML
    return `
      <div class="tr-voice-msg" data-url="${audioUrl}" data-duration="${safeDuration}">
        <button class="tr-voice-btn" onclick="window.handleVoicePlay(this)">
          <i class="fas fa-play"></i>
        </button>
        
        <div class="tr-voice-wave">
          ${waveBarsHTML}
        </div>
        
        <span class="tr-voice-time">${formattedTime}</span>
      </div>
    `;
  },

  /**
   * 2. Xử lý Play / Pause / Animation
   */
  play(btnElement) {
    const container = btnElement.closest(".tr-voice-msg");
    const url = container.dataset.url;
    const bars = container.querySelectorAll(".tr-voice-bar");
    const timeDisplay = container.querySelector(".tr-voice-time");
    const icon = btnElement.querySelector("i");
    const originalDuration = parseFloat(container.dataset.duration);

    // TH1: Đang play bài này -> Pause
    if (
      this.currentAudio &&
      this.currentAudio.src === url &&
      !this.currentAudio.paused
    ) {
      this.currentAudio.pause();
      icon.className = "fas fa-play";
      btnElement.classList.remove("playing");
      return;
    }

    // TH2: Đang pause bài này -> Resume
    if (
      this.currentAudio &&
      this.currentAudio.src === url &&
      this.currentAudio.paused
    ) {
      this.currentAudio.play();
      icon.className = "fas fa-pause";
      btnElement.classList.add("playing");
      return;
    }

    // TH3: Bấm bài mới -> Stop bài cũ
    if (this.currentAudio) {
      this.stopCurrent();
    }

    // --- SETUP BÀI MỚI ---
    this.currentAudio = new Audio(url);
    this.currentContainer = container;

    // Update UI sang trạng thái Loading/Playing
    icon.className = "fas fa-pause";
    btnElement.classList.add("playing");

    // EVENT: Update tiến độ (Waveform Animation)
    this.currentAudio.ontimeupdate = () => {
      const curTime = this.currentAudio.currentTime;
      // Dùng duration từ audio object hoặc từ data attribute nếu audio chưa load xong meta
      const duration = this.currentAudio.duration || originalDuration || 1;

      const percent = curTime / duration;
      const totalBars = bars.length;

      // Tính xem thanh nào cần sáng (Active)
      const activeIndex = Math.floor(totalBars * percent);

      bars.forEach((bar, index) => {
        if (index <= activeIndex) {
          bar.classList.add("active"); // Sáng
        } else {
          bar.classList.remove("active"); // Mờ
        }
      });

      // Update thời gian chạy (0:01 -> 0:02...)
      if (timeDisplay) timeDisplay.innerText = this.formatTime(curTime);
    };

    // EVENT: Kết thúc -> Reset
    this.currentAudio.onended = () => {
      this.stopCurrent();
    };

    // EVENT: Lỗi
    this.currentAudio.onerror = () => {
      console.error("Audio Load Error");
      this.stopCurrent();
    };

    this.currentAudio.play();
  },

  /**
   * 3. Dừng và Reset UI
   */
  stopCurrent() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    if (this.currentContainer) {
      const btn = this.currentContainer.querySelector(".tr-voice-btn");
      const icon = btn.querySelector("i");
      const bars = this.currentContainer.querySelectorAll(".tr-voice-bar");
      const timeDisplay = this.currentContainer.querySelector(".tr-voice-time");
      const originalDuration = this.currentContainer.dataset.duration;

      // Reset Icon
      if (icon) icon.className = "fas fa-play";
      if (btn) btn.classList.remove("playing");

      // Reset sóng về mờ hết
      bars.forEach((b) => b.classList.remove("active"));

      // Reset thời gian về tổng ban đầu
      if (timeDisplay)
        timeDisplay.innerText = this.formatTime(originalDuration);
    }

    this.currentAudio = null;
    this.currentContainer = null;
  },

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  },
};

// Global function để gọi từ onclick HTML
window.handleVoicePlay = (btn) => {
  AudioController.play(btn);
};
