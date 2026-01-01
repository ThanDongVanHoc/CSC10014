// logic.js
import { initMap } from "./map/index.js";


async function initialize() {
  console.log("🚀 logic.js loaded: Initializing app...");
  // 1. KHỞI TẠO MAP
  const { map } = initMap();
}

document.addEventListener("DOMContentLoaded", initialize);
