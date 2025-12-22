import { DOM } from "./core.js";
import { handleSendMessage } from "../logic.js";
import { State } from "./core.js";
import { DataManager } from "./data.js";
import {
  appendMessageToBox,
  showLoadingBubble,
  removeLoadingBubble,
} from "../components/box_ui.js";
import { renderSidebar } from "../components/sidebar_ui.js";
import { AudioController } from "../components/audio_ui.js";

const VISUALIZER_HTML = `
  <div class="tr-recorder-overlay" aria-hidden="true">
    <div class="siri-visualizer-container">
      <div id="siri-wave-canvas"></div>
    </div>
  </div>
`;

let siriInstance = null;
const recorders = new Map();

export function initMicrophoneFeature() {
  DOM.panels.forEach((panel) => {
    const body = panel.querySelector(".tr-panel__body");
    if (!body) return;

    body.insertAdjacentHTML("beforeend", VISUALIZER_HTML);
    setupMicLogic(panel);
  });
}

function getLocalContext(limit = 2) {
  if (!State.selectedId) return [];
  const currentChat = State.conversations.find((c) => c.id == State.selectedId);
  if (!currentChat || !currentChat.messages) return [];
  const recent = currentChat.messages.slice(-limit);
  return recent.map((m) => `${m.role} (${m.speaker_role}): ${m.content}`);
}

function setupMicLogic(panel) {
  const micBtn = panel.querySelector(".tr-mic");
  const sendBtn = panel.querySelector(".tr-iconbtn--send");
  const overlay = panel.querySelector(".tr-recorder-overlay");
  const canvasContainer = overlay?.querySelector("#siri-wave-canvas");
  const input = panel.querySelector(".tr-input");
  const body = panel.querySelector(".tr-panel__body");
  const composer = panel.querySelector(".tr-composer");

  if (!micBtn || !sendBtn || !overlay || !canvasContainer || !body) return;

  recorders.set(panel, {
    stream: null,
    recorder: null,
    chunks: [],
    isRecording: false,
    resizeHandler: null,
  });

  const updateOverlayLayout = () => {
    const h = composer ? composer.offsetHeight : 0;
    body.style.setProperty("--tr-composer-h", `${h}px`);
  };

  const setListeningUI = (isListening) => {
    if (isListening) {
      panel.classList.add("is-listening");

      // Đổi nút mic -> X (Cancel)
      micBtn.innerHTML = '<i class="fas fa-times"></i>';
      micBtn.classList.add("is-cancel");
      micBtn.title = "Cancel";

      // Đổi nút send -> ✅ (Confirm)
      sendBtn.innerHTML = '<i class="fas fa-check"></i>';
      sendBtn.classList.add("is-confirm");
      sendBtn.title = "Confirm";

      if (input) input.disabled = true;
    } else {
      panel.classList.remove("is-listening");

      micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
      micBtn.classList.remove("is-cancel");
      micBtn.title = "Record";

      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
      sendBtn.classList.remove("is-confirm");
      sendBtn.title = "Send";

      if (input) {
        input.disabled = false;
        input.focus();
      }
    }
  };

  micBtn.onclick = async (e) => {
    e.stopPropagation();
    const state = recorders.get(panel);
    if (!state) return;

    if (!state.isRecording) {
      try {
        state.stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        state.recorder = new MediaRecorder(state.stream);
        state.chunks = [];

        state.recorder.ondataavailable = (ev) => state.chunks.push(ev.data);
        state.recorder.start();
        state.isRecording = true;

        // UI
        updateOverlayLayout();
        overlay.classList.add("active");
        setListeningUI(true);

        // Resize safe
        state.resizeHandler = () => {
          if (state.isRecording) updateOverlayLayout();
        };
        window.addEventListener("resize", state.resizeHandler);

        // Siri Wave
        siriInstance = new SiriWave({
          container: canvasContainer,
          width: 600,
          height: 200,
          style: "ios9",
          amplitude: 1.5,
          speed: 0.1,
          autostart: true,
          pixelDepth: 0.1,
        });
      } catch (err) {
        alert("Microphone access denied.");
      }
    } else {
      stopRecording(panel, false);
    }
  };

  const originalSendHandler = sendBtn.onclick;

  sendBtn.onclick = (e) => {
    const state = recorders.get(panel);

    // Nếu đang thu âm: nút này là ✅ để confirm
    if (state?.isRecording) {
      e.stopPropagation();
      stopRecording(panel, true);
      return;
    }

    // Nếu KHÔNG thu âm: giữ hành vi gửi tin nhắn cũ từ index.js
    if (typeof originalSendHandler === "function") {
      originalSendHandler(e);
    }
  };
}

async function stopRecording(panel, shouldProcess) {
  const state = recorders.get(panel);
  if (!state?.recorder) return;

  const micBtn = panel.querySelector(".tr-mic");
  const sendBtn = panel.querySelector(".tr-iconbtn--send");
  const overlay = panel.querySelector(".tr-recorder-overlay");
  const input = panel.querySelector(".tr-input");
  const body = panel.querySelector(".tr-panel__body");

  state.recorder.onstop = async () => {
    // Stop SiriWave
    if (siriInstance) {
      siriInstance.stop();
      siriInstance = null;
    }

    const wave = overlay?.querySelector("#siri-wave-canvas");
    if (wave) wave.innerHTML = "";
    overlay?.classList.remove("active");

    // Cleanup resize listener + css var
    if (state.resizeHandler) {
      window.removeEventListener("resize", state.resizeHandler);
      state.resizeHandler = null;
    }
    if (body) body.style.removeProperty("--tr-composer-h");

    // Reset UI
    panel.classList.remove("is-listening");

    if (micBtn) {
      micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
      micBtn.classList.remove("is-cancel");
      micBtn.title = "Record";
    }

    if (sendBtn) {
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
      sendBtn.classList.remove("is-confirm");
      sendBtn.title = "Send";
    }

    if (input) {
      input.disabled = false;
      input.focus();
    }

    if (shouldProcess) {
      // 1. Bên trái: Đang upload/transcribe giọng User
      const blob = new Blob(state.chunks, { type: "audio/webm" });
      const file = new File([blob], "recording.webm", { type: "audio/webm" });
      const isDoctor = panel.dataset.role === "doctor";
      const speakerRole = isDoctor ? "doctor" : "patient";
      const userLoader = showLoadingBubble("left", speakerRole);

      const botLoader = showLoadingBubble("right", speakerRole);

      // Tạo chat mới nếu cần
      if (!State.selectedId) {
        const newChat = await DataManager.create("New Voice Chat");
        if (newChat) {
          State.conversations.unshift(newChat);
          State.selectedId = newChat.id;
          if (!State.isLoggedIn) DataManager.saveGuestData();
          renderSidebar();
        }
      }

      if (State.selectedId) {
        // Chuẩn bị FormData
        const formData = new FormData();
        formData.append("audio_file", file);
        formData.append("conversation_id", State.selectedId);
        formData.append("speaker_role", speakerRole);

        // Lấy Context từ Client -> Append vào FormData
        const contextList = getLocalContext(2);
        contextList.forEach((ctxStr) => {
          formData.append("context", ctxStr); // Append nhiều lần để tạo list
        });

        try {
          const res = await fetch("/translate/api/speech", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          removeLoadingBubble(userLoader);
          removeLoadingBubble(botLoader);

          if (data.status === "success") {
            // 1. INPUT AUDIO (Giọng User)
            if (data.input_audio_url) {
              const voiceHTML = AudioController.generateHTML(
                data.input_audio_url,
                data.input_audio_duration
              );
              appendMessageToBox(voiceHTML, "left", speakerRole, true);
            } else {
              appendMessageToBox(
                `🎤 ${data.original_text}`,
                "left",
                speakerRole
              );
            }
            // 2. OUTPUT AUDIO (Giọng AI)
            if (data.output_audio_url) {
              const voiceHTML = AudioController.generateHTML(
                data.output_audio_url,
                data.output_audio_duration
              );
              appendMessageToBox(voiceHTML, "right", speakerRole, true);
            } else {
              appendMessageToBox(data.translated_text, "right", speakerRole);
            }

            if (!State.isLoggedIn) {
              let currentChat = State.conversations.find(
                (c) => c.id == State.selectedId
              );
              if (currentChat) {
                const now = new Date().toISOString();
                currentChat.messages.push({
                  role: "user",
                  content: data.original_text,
                  speaker_role: speakerRole,
                  audio_url: data.input_audio_url,
                  duration_seconds: data.input_audio_duration,
                  created_at: now,
                });
                currentChat.messages.push({
                  role: "model",
                  content: data.translated_text,
                  speaker_role: speakerRole,
                  audio_url: data.output_audio_url,
                  duration_seconds: data.output_audio_duration,
                  created_at: now,
                });
                DataManager.saveGuestData();
              }
            }
          } else {
            alert("Error: " + data.message);
          }
        } catch (err) {
          console.error(err);
          alert("Error sending file.");
        }
      }
    }
  };

  state.recorder.stop();
  state.stream?.getTracks().forEach((t) => t.stop());
  state.isRecording = false;
}
