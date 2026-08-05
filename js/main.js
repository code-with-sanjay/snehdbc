// js/main.js
// ============================================================
//  1. OFFLINE ENGINE SINGLETON
// ============================================================
import { OfflineEngine } from '../offline-pack/offline-engine.js';

const offlineEngine = new OfflineEngine();
window.__offlineEngine = offlineEngine;

// ============================================================
//  2. IMPORT OFFLINE INTERCEPTOR
// ============================================================
import '../offline-pack/offline-interceptor.js';

// ============================================================
//  3. OTHER IMPORTS
// ============================================================
import { initGoogleI18n } from './i18n.js';
import { initGoogleAuth, renderAuthElements, dismissAuthBanner } from './auth.js';
import { sessions, currentSessionId, createNewChat, createIncognitoChat, saveAndRefresh, loadChat, deleteChat, setPendingIncognito, getPendingIncognito } from './storage.js';
import { setDomElements, renderChat, updateHasMessages, updateIncognitoButtonUI, updateActiveIncognitoBanner } from './ui.js';
import { handleSendMessage, regenerateLastAssistant } from './chat-core.js';
import { initTheme, toggleTheme } from './theme.js';
import { initPWA } from './pwa.js';
import * as modal from './modal.js';
import * as sidebar from './sidebar.js';
import * as c2 from './c2.js';

// ============================================================
//  4. IMPORT SEARCH TOGGLE STATE FUNCTIONS
// ============================================================
import { setSearchToggleState, getSearchToggleState } from './ui-dom.js';
// ============================================================
//  5. GLOBAL FUNCTIONS
// ============================================================
window.createNewChat = () => {
  setPendingIncognito(false);
  createNewChat();
  renderChat();
  sidebar.updateSidebar();
  updateHasMessages();
  updateIncognitoButtonUI();
  updateActiveIncognitoBanner();
};

window.toggleIncognito = () => {
  const newValue = !getPendingIncognito();
  setPendingIncognito(newValue);
  updateIncognitoButtonUI();
  updateActiveIncognitoBanner();
};

window.saveAndRefresh = saveAndRefresh;
window.toggleTheme = toggleTheme;
window.showLegalModal = modal.showLegalModal;
window.closeModal = modal.closeModal;
window.showCareersModal = modal.showCareersModal;
window.showContactModal = modal.showContactModal;
window.toggleAccordion = modal.toggleAccordion;
window.openLegalSection = modal.openLegalSection;
window.toggleRoleDetails = modal.toggleRoleDetails;
window.toggleSidebar = sidebar.toggleSidebar;
window.updateSidebar = sidebar.updateSidebar;
window.loadChat = (id) => {
  setPendingIncognito(false);
  sidebar.loadChat(id);
  updateIncognitoButtonUI();
  updateActiveIncognitoBanner();
};
window.deleteChat = sidebar.deleteChat;
window.showc2Modal = c2.showc2Modal;
window.c2CloseModal = c2.c2CloseModal;
window.c2ToggleSection = c2.c2ToggleSection;
window.regenerateLastAssistant = regenerateLastAssistant;
window.renderChat = renderChat;

// ============================================================
//  6. WAVEFORM SVG
// ============================================================
function getWaveformSVG() {
  return `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9.5" fill="#0B57CF"/>
      <g fill="#FFFFFF">
        <rect x="4.2" y="9" width="3" height="6" rx="1.5"/>
        <rect x="8.4" y="7" width="3" height="10" rx="1.5"/>
        <rect x="12.6" y="5" width="3" height="14" rx="1.5"/>
        <rect x="16.8" y="7" width="3" height="10" rx="1.5"/>
      </g>
    </svg>
  `;
}

// ============================================================
//  7. THEME CHANGE EVENT
// ============================================================
document.addEventListener('sneh:theme-changed', () => {
  renderAuthElements();
});

// ============================================================
//  8. INPUT HEIGHT CONTROLLER
// ============================================================
let textInputElement = null;

function adjustInputHeight() {
  if (!textInputElement) return;
  textInputElement.style.height = 'auto';
  const newHeight = Math.min(textInputElement.scrollHeight, 180);
  textInputElement.style.height = Math.max(newHeight, 38) + 'px';
}
window.adjustInputHeight = adjustInputHeight;

// ============================================================
//  9. MODEL SELECTOR LOGIC (FIXED)
// ============================================================
const modelOptions = [
  { id: 'smart', label: 'Smart Pro', icon: 'sparkles', description: '' },
  { id: 'web', label: 'Web Search', icon: 'globe', description: '' },
  { id: 'offline', label: 'Offline AI', icon: 'wifi-off', description: '' }
];

function getSelectedModel() {
  return localStorage.getItem('sneh_selected_model') || 'smart';
}

function setSelectedModel(modelId) {
  // Validate offline installation
  if (modelId === 'offline') {
    offlineEngine.verifyInstallation().then(installed => {
      if (!installed) {
        showToast('Offline AI not installed. Install from sidebar.');
        // Revert to smart if currently not smart
        if (getSelectedModel() !== 'smart') {
          localStorage.setItem('sneh_selected_model', 'smart');
          updateAllUI('smart');
          syncToggles('smart');
        }
        return;
      }
      // If installed, proceed
      applyModelSelection(modelId);
    });
    return;
  }
  applyModelSelection(modelId);
}

function applyModelSelection(modelId) {
  // 1. Store in localStorage
  localStorage.setItem('sneh_selected_model', modelId);

  // 2. Update UI (capsule + menu highlights)
  updateAllUI(modelId);

  // 3. Sync with the search toggle (using direct state setter)
  syncToggles(modelId);

  console.log(`[Model Selector] Switched to ${modelId}`);
}

function syncToggles(modelId) {
  // --- Sync search toggle ---
  const searchBtn = document.getElementById('web-search-btn');
  const shouldBeActive = (modelId === 'web');
  // Update internal state and button class
  setSearchToggleState(shouldBeActive);
  if (searchBtn) {
    searchBtn.classList.toggle('active', shouldBeActive);
  }

  // --- Sync offline toggle (sidebar) ---
  const switchEl = document.getElementById('offline-mode-switch');
  if (switchEl) {
    const shouldBeOffline = (modelId === 'offline');
    switchEl.checked = shouldBeOffline;
    // Also set the route preference for the interceptor
    localStorage.setItem('sneh_preferred_model_route', shouldBeOffline ? 'local' : 'cloud');
  }
}

function updateAllUI(modelId) {
  // Update capsule label
  updateModelCapsuleUI(modelId);
  // Update active state in menu
  document.querySelectorAll('.model-option').forEach(opt => {
    opt.classList.toggle('active-model', opt.dataset.model === modelId);
  });
}

function updateModelCapsuleUI(modelId) {
  const capsule = document.getElementById('model-capsule-btn');
  if (!capsule) return;
  const span = capsule.querySelector('span');
  if (span) {
    const option = modelOptions.find(o => o.id === modelId);
    span.textContent = option ? option.label : 'Smart Pro';
  }
}

function initModelSelector() {
  const capsule = document.getElementById('model-capsule-btn');
  if (!capsule) {
    console.warn('[Model Selector] Capsule button not found.');
    return;
  }

  // Build menu inside the input wrapper
  const wrapper = capsule.closest('.input-wrapper');
  if (!wrapper) return;

  // Remove any old menu
  const oldMenu = wrapper.querySelector('.model-menu');
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement('div');
  menu.className = 'model-menu';
  menu.id = 'model-menu';
  menu.innerHTML = `
    <div class="model-menu-header">
      <span>Choose Model</span>
    </div>
    <div class="model-options-wrapper">
      ${modelOptions.map(opt => `
        <div class="model-option ${opt.id === getSelectedModel() ? 'active-model' : ''}" data-model="${opt.id}">
          <i data-lucide="${opt.icon}" class="model-icon"></i>
          <span class="model-label">${opt.label}</span>
          <span class="model-badge">${opt.description}</span>
        </div>
      `).join('')}
    </div>
  `;
  wrapper.appendChild(menu);

  // Init Lucide icons
  if (window.lucide) lucide.createIcons({ root: menu });

  // Toggle menu on capsule click
  const toggleMenu = (e) => {
    e.stopPropagation();
    const isVisible = menu.style.display === 'flex';
    menu.style.display = isVisible ? 'none' : 'flex';
    capsule.classList.toggle('active', !isVisible);
  };
  capsule.addEventListener('click', toggleMenu);

  // Option click handler
  menu.querySelectorAll('.model-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const modelId = opt.dataset.model;
         if (modelId === getSelectedModel()) {
        // Close menu only
        menu.style.display = 'none';
        capsule.classList.remove('active');
        return;
      }
      // Attempt to set selection (handles offline check)
      setSelectedModel(modelId);
      menu.style.display = 'none';
      capsule.classList.remove('active');
      showToast(`Switched to ${modelOptions.find(o => o.id === modelId).label}`);
    });
  });

  // Dismiss on outside click
  document.addEventListener('click', () => {
    menu.style.display = 'none';
    capsule.classList.remove('active');
  });

  // Initial UI sync
  const initialModel = getSelectedModel();
  updateAllUI(initialModel);
  syncToggles(initialModel);

  // Listen for offline-ready event to enable offline selection
  document.addEventListener('sneh:offline-ready', () => {
    const current = getSelectedModel();
    if (current === 'offline') {
      // Re-apply to ensure toggles are set
      applyModelSelection('offline');
    }
  });

  // --- Sync with the web search toggle button (bidirectional) ---
  const searchBtn = document.getElementById('web-search-btn');
  if (searchBtn) {
    // Remove any previous listener to avoid duplicates
    const newBtn = searchBtn.cloneNode(true);
    searchBtn.parentNode.replaceChild(newBtn, searchBtn);
    newBtn.addEventListener('click', () => {
      // Toggle the active class
      const isActive = newBtn.classList.toggle('active');
      // Update internal state
      setSearchToggleState(isActive);
      // Update model selection accordingly
      if (isActive) {
        // If globe is turned on, set model to 'web'
        if (getSelectedModel() !== 'web') {
          setSelectedModel('web');
        }
      } else {
        // If globe is turned off, set model to 'smart' (unless offline is active)
        if (getSelectedModel() === 'web') {
          setSelectedModel('smart');
        }
      }
    });
    // Ensure initial state matches
    const isSearchActive = getSearchToggleState();
    newBtn.classList.toggle('active', isSearchActive);
  }

  // --- Sync with the sidebar offline toggle ---
  const offlineSwitch = document.getElementById('offline-mode-switch');
  if (offlineSwitch) {
    // Remove previous listener
    const newSwitch = offlineSwitch.cloneNode(true);
    offlineSwitch.parentNode.replaceChild(newSwitch, offlineSwitch);
    newSwitch.addEventListener('change', () => {
      if (newSwitch.checked) {
        setSelectedModel('offline');
      } else {
        // If offline was selected, revert to smart
        if (getSelectedModel() === 'offline') {
          setSelectedModel('smart');
        }
      }
    });
    // Initial sync
    newSwitch.checked = (getSelectedModel() === 'offline');
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'c2-toast show';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
//  10. DOM CONTENT LOADED – INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setDomElements();

  // ─── Dynamic input padding ──────────────────────────────
  const chatContainer = document.getElementById('chat-container');
  const inputContainer = document.querySelector('.input-container');

  function updateInputHeight() {
    if (!inputContainer || !chatContainer) return;
    const height = inputContainer.getBoundingClientRect().height;
    const newPaddingBottom = height + 26;
    chatContainer.style.paddingBottom = newPaddingBottom + 'px';
    document.documentElement.style.setProperty('--input-height', newPaddingBottom + 'px');
    requestAnimationFrame(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  }

  if (inputContainer && window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(updateInputHeight);
    resizeObserver.observe(inputContainer);
  }

  window.addEventListener('load', updateInputHeight);
  window.addEventListener('resize', updateInputHeight);
  window.addEventListener('orientationchange', () => setTimeout(updateInputHeight, 300));

  // ─── Textarea ────────────────────────────────────────────
  textInputElement = document.getElementById('text-input');
  if (textInputElement) {
    textInputElement.addEventListener('input', adjustInputHeight);
    adjustInputHeight();
  }

  // ─── Core initialisations ──────────────────────────────
  initTheme();
  initPWA();
  initGoogleI18n();
  initGoogleAuth();

  // ─── Banner close ──────────────────────────────────────
  const closeBannerBtn = document.getElementById('close-guest-banner-btn');
  if (closeBannerBtn) {
    closeBannerBtn.addEventListener('click', dismissAuthBanner);
  }

  // ─── Incognito button ─────────────────────────────────
  const incognitoBtn = document.querySelector('.incognito-btn');
  if (incognitoBtn) incognitoBtn.onclick = window.toggleIncognito;

  // ─── Send button ──────────────────────────────────────
  const sendButton = document.getElementById('send-button');
  if (sendButton) {
    sendButton.dataset.originalContent = sendButton.innerHTML;
    sendButton.addEventListener('click', handleSendMessage);
  }

  if (textInputElement) {
    textInputElement.addEventListener('input', function() {
      if (sendButton) {
        if (sendButton.disabled) return;
        const isEmpty = this.value.trim() === '';
        sendButton.innerHTML = isEmpty ? getWaveformSVG() : sendButton.dataset.originalContent;
        sendButton.style.background = '';
      }
    });
    if (sendButton) sendButton.innerHTML = getWaveformSVG();
  }

  // ─── Visual viewport (keyboard) ────────────────────────
  if (window.visualViewport) {
    let isUpdating = false;
    let lastViewportHeight = window.visualViewport.height;

    const updateAppHeight = () => {
      if (isUpdating) return;
      isUpdating = true;
      requestAnimationFrame(() => {
        const currentHeight = window.visualViewport.height;
        document.documentElement.style.setProperty('--app-height', `${currentHeight}px`);

        if (Math.abs(lastViewportHeight - currentHeight) > 30) {
          const wrapper = document.querySelector('.input-wrapper');
          if (wrapper) {
            wrapper.classList.toggle('input-active', currentHeight < lastViewportHeight);
          }
          const chat = document.getElementById('chat-container');
          if (chat) chat.scrollTop = chat.scrollHeight;
          lastViewportHeight = currentHeight;
        }
        isUpdating = false;
      });
    };

    window.visualViewport.addEventListener('resize', () => {
      updateAppHeight();
      updateInputHeight();
    });
    window.visualViewport.addEventListener('scroll', () => {
      updateAppHeight();
      updateInputHeight();
    });
    updateAppHeight();
  }

  // ─── Restore session or create new ─────────────────────
  if (currentSessionId && sessions[currentSessionId]) {
    setPendingIncognito(false);
    renderChat();
    updateHasMessages();
    updateIncognitoButtonUI();
    updateActiveIncognitoBanner();
  } else {
    window.createNewChat();
  }

  // ─── INIT MODEL SELECTOR ──────────────────────────────
  initModelSelector();
});

// ============================================================
//  OPTIONAL: EXPOSE ENGINE FOR DEBUGGING
// ============================================================
console.log('[Sneh AI] Offline engine singleton ready:', window.__offlineEngine);