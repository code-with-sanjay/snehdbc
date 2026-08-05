/**
 * js/sidebar.js
 * Manages sidebar rendering, history, and offline AI controls.
 */
import { renderAuthElements } from './auth.js';
import { sessions, currentSessionId, createNewChat, deleteChat as storageDeleteChat, loadChat as storageLoadChat } from './storage.js';
import { renderChat } from './ui.js';
import { OfflineEngine, EngineStates } from "../offline-pack/offline-engine.js";

const offlineEngine = window.__offlineEngine || new OfflineEngine();
let sidebarLoaded = false;

document.addEventListener('sneh:auth-changed', () => {
  if (sidebarLoaded) renderAuthElements();
});

function loadSidebarContent() {
  return new Promise((resolve, reject) => {
    if (sidebarLoaded) { resolve(); return; }
    fetch('sidebar-content.html')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(html => {
        document.getElementById('sidebar').innerHTML = html;
        sidebarLoaded = true;
        if (window.lucide) lucide.createIcons({ root: document.getElementById('sidebar') });
        renderAuthElements();
        initOfflineSidebarControls();   // sets up download button
        initOfflineToggleUI();          // sets up toggle & status
        resolve();
      })
      .catch(err => {
        console.error('Failed to load sidebar template:', err);
        reject(err);
      });
  });
}

export async function toggleSidebar() {
  await loadSidebarContent();
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('active');
  if (overlay) overlay.style.display = sidebar.classList.contains('active') ? 'block' : 'none';
  if (sidebar.classList.contains('active')) updateSidebar();
}

export function updateSidebar() {
  const list = document.getElementById('history-list');
  if (!list) return;
  list.innerHTML = '';
  const sortedIds = Object.keys(sessions).sort((a, b) => b.split('_')[1] - a.split('_')[1]);
  sortedIds.forEach(id => {
    const firstMsg = sessions[id].find(m => m.role === 'user')?.content || "New Chat";
    const shortTitle = firstMsg.substring(0, 25) + (firstMsg.length > 25 ? '...' : '');
    const item = document.createElement('div');
    item.className = `history-item ${currentSessionId === id ? 'active-session' : ''}`;
    const span = document.createElement('span');
    span.textContent = shortTitle;
    span.style.cursor = 'pointer';
    span.onclick = () => window.loadChat(id);
    const icon = document.createElement('i');
    icon.className = 'fas fa-trash delete-chat-btn';
    icon.onclick = (e) => window.deleteChat(id, e);
    item.appendChild(span);
    item.appendChild(icon);
    list.appendChild(item);
  });
}

export function loadChat(id) {
  storageLoadChat(id);
  renderChat();
  toggleSidebar();
}

export function deleteChat(id, event) {
  event.stopPropagation();
  storageDeleteChat(id);
  if (currentSessionId === id) createNewChat();
  renderChat();
  updateSidebar();
}

// ========== OFFLINE DOWNLOAD BUTTON LOGIC (existing) ==========
export async function initOfflineSidebarControls() {
  const setupBtn = document.getElementById("btn-offline-setup");
  const descText = document.getElementById("offline-install-desc");
  const actionRow = document.getElementById("offline-actions-row");
  if (!setupBtn) return;

  const currentState = await offlineEngine.checkInstallationHealth();

  if (currentState === EngineStates.READY) {
    renderReadyState();
    return;
  } else if (currentState === EngineStates.REPAIR_NEEDED) {
    renderRepairState();
    return;
  } else if (currentState === EngineStates.WAITING_FOR_NETWORK) {
    renderPausedState("Setup interrupted. Tap to resume.");
  }

  // Auto‑resume on network reconnect
  window.addEventListener('online', () => {
    const partial = localStorage.getItem("sneh_offline_partial") === "true";
    if (partial && !offlineEngine.isDownloading) {
      descText.textContent = "Connection restored. Resuming...";
      triggerDownload();
    }
  });

  window.addEventListener('offline', () => {
    if (offlineEngine.isDownloading) {
      offlineEngine.cancelDownload();
      renderPausedState("Connection lost. Waiting for network...");
    }
  });

  setupBtn.addEventListener("click", triggerDownload);

  async function triggerDownload() {
    setupBtn.disabled = true;
    setupBtn.textContent = "Analyzing device...";

    try {
      await offlineEngine.verifyStorageQuota();
    } catch (quotaError) {
      descText.textContent = quotaError.message;
      setupBtn.disabled = false;
      setupBtn.textContent = "Clear Space & Retry";
      return;
    }

    const telemetry = await offlineEngine.checkHardwareTelemetry();
    if (telemetry.status === "WARNING" && offlineEngine.state === EngineStates.IDLE) {
      if (!confirm(`${telemetry.msg}\n\nProceed with download?`)) {
        setupBtn.disabled = false;
        setupBtn.textContent = "Download Offline AI";
        return;
      }
    } else if (telemetry.status === "CRITICAL") {
      alert(`Installation blocked: ${telemetry.msg}`);
      setupBtn.textContent = "Unavailable";
      return;
    }

    offlineEngine.onProgress = (percent) => {
      descText.textContent = `Downloading… ${percent}%`;
    };

    offlineEngine.onStatusChange = (status, info) => {
      if (status === EngineStates.DOWNLOADING) {
        descText.textContent = info || "Fetching components...";
        setupBtn.disabled = true;
        setupBtn.textContent = "Downloading...";
      } else if (status === EngineStates.VERIFYING) {
        descText.textContent = "Verifying files...";
      } else if (status === EngineStates.INSTALLING) {
        descText.textContent = "Finalizing...";
      } else if (status === EngineStates.READY) {
        renderReadyState();
        // enable toggle
        const sw = document.getElementById('offline-mode-switch');
        if (sw) sw.disabled = false;
        document.dispatchEvent(new CustomEvent('sneh:offline-ready'));
      } else if (status === EngineStates.WAITING_FOR_NETWORK) {
        renderPausedState(info || "Connection lost. Waiting to resume...");
      } else if (status === EngineStates.FAILED) {
        descText.textContent = `Setup failed: ${info}`;
        setupBtn.disabled = false;
        setupBtn.textContent = "Retry Download";
      }
    };

    try {
      localStorage.setItem("sneh_offline_state", "DOWNLOADING");
      await offlineEngine.installModel();
    } catch (err) {
      console.error("[Offline Setup Error]", err);
    }
  }

  function renderReadyState() {
    descText.textContent = "On‑Device AI Active (best for simple questions)";
    actionRow.innerHTML = `
      <span style="color:var(--secondary); font-weight:700; font-size:0.8rem; display:flex; align-items:center; gap:4px;">
        <i class="fas fa-check-circle"></i> On‑Device AI Active
      </span>
    `;
  }

  function renderRepairState() {
    descText.textContent = "Installation corrupt. Tap to repair.";
    setupBtn.disabled = false;
    setupBtn.textContent = "Repair Installation";
    setupBtn.style.background = "var(--c2-corp-red, #ff3b30)";
  }

  function renderPausedState(message) {
    descText.textContent = message;
    setupBtn.disabled = false;
    setupBtn.textContent = "Resume Download";
    setupBtn.style.background = "var(--c2-corp-blue, #1877f2)";
  }
}

// ========== OFFLINE TOGGLE & STATUS BADGE ==========
function initOfflineToggleUI() {
  const switchEl = document.getElementById('offline-mode-switch');
  const badge = document.getElementById('offline-status-badge');
  if (!switchEl || !badge) return;

  // Load saved preference
  const pref = localStorage.getItem('sneh_preferred_model_route') === 'local';
  switchEl.checked = pref;

  // Disable toggle until engine is ready
  switchEl.disabled = (offlineEngine.state !== EngineStates.READY);

  // Update badge based on current state
  const updateBadge = () => {
    const state = offlineEngine.state;
    const textMap = {
      [EngineStates.READY]: '✅ Ready',
      [EngineStates.DOWNLOADING]: '⏳ Downloading...',
      [EngineStates.WAITING_FOR_NETWORK]: '⏸️ Paused',
      [EngineStates.FAILED]: '❌ Error',
      [EngineStates.REPAIR_NEEDED]: '⚠️ Repair needed',
      [EngineStates.IDLE]: '⚪ Not installed'
    };
    badge.textContent = textMap[state] || '⚪ Not installed';
    badge.style.color = (state === EngineStates.READY) ? 'var(--secondary)' :
                        (state === EngineStates.FAILED || state === EngineStates.REPAIR_NEEDED) ? 'var(--c2-corp-red)' :
                        (state === EngineStates.DOWNLOADING || state === EngineStates.WAITING_FOR_NETWORK) ? 'var(--accent)' :
                        'var(--text-tertiary)';
    switchEl.disabled = (state !== EngineStates.READY);
    // If offline mode is selected but engine not ready, show a hint
    if (switchEl.checked && state !== EngineStates.READY) {
      badge.textContent = badge.textContent + ' (offline mode pending)';
    }
  };

  // Listen to engine status changes
  offlineEngine.onStatusChange = (status) => {
    updateBadge();
  };

  // Also listen for the custom event when ready
  document.addEventListener('sneh:offline-ready', () => {
    updateBadge();
    // If user had offline mode selected, it will be enabled automatically
  });

  // Toggle change handler
  switchEl.addEventListener('change', () => {
    const newPref = switchEl.checked ? 'local' : 'cloud';
    localStorage.setItem('sneh_preferred_model_route', newPref);
    if (newPref === 'local' && offlineEngine.state !== EngineStates.READY) {
      // If not ready, prompt to install
      if (offlineEngine.state === EngineStates.IDLE) {
        // trigger the download via the existing button
        const setupBtn = document.getElementById("btn-offline-setup");
        if (setupBtn) setupBtn.click();
      } else {
        // show toast
        const toast = document.createElement('div');
        toast.className = 'c2-toast show';
        toast.textContent = 'Please wait for installation to complete.';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    }
    updateBadge();
  });

  // Initial update
  updateBadge();
}

// Preload sidebar template
loadSidebarContent();
// Add this at the bottom of js/sidebar.js
(function initCapsuleTicker() {
  const phrases = [
    "Local models & zero latency",
    "100% private on-device processing",
    "Works without internet connection",
    "Sub-100ms instant streaming"
  ];
  let index = 0;

  setInterval(() => {
    const el = document.getElementById("capsule-subtext-dynamic");
    if (!el) return;

    el.classList.add("fade-out");

    setTimeout(() => {
      index = (index + 1) % phrases.length;
      el.textContent = phrases[index];
      el.classList.remove("fade-out");
    }, 350);
  }, 3500);
})();
