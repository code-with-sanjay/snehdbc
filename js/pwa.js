/* ============================================================
   SNEH AI PRODUCTION-GRADE PWA ENGINE
   ============================================================ */

let deferredPrompt;
const boundButtons = new WeakSet(); // Safely tracks event listeners without memory leaks

/**
 * Standard Toast Utility for PWA actions
 */
export function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(#000000);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-weight: 500;
    font-size: 0.9rem;
    pointer-events: none;
    animation: fadeInOut 2s ease forwards;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

/**
 * Dynamically binds click events to any matching install buttons in the DOM
 */
function bindInstallButton() {
  const installButton = document.getElementById('install-app-btn');
  if (!installButton) return;

  // Prevent duplicate bindings or layout thrashing
  if (boundButtons.has(installButton)) {
    installButton.style.display = deferredPrompt ? 'block' : 'none';
    return;
  }

  boundButtons.add(installButton);

  if (deferredPrompt) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', handleInstallClick);
  } else {
    installButton.style.display = 'none';
  }
}

/**
 * Handles PWA installation prompt flows
 */
async function handleInstallClick(e) {
  if (!deferredPrompt) return;
  
  const button = e.currentTarget;
  deferredPrompt.prompt();
  
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] Install prompt outcome: ${outcome}`);
  
  deferredPrompt = null;
  button.style.display = 'none';
}

/**
 * Parses and processes system share intents, shortcuts, or protocol launches
 */
function handleAppLaunchIntents() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');

  // Case 1: Capture native Share Target contents from other applications
  if (action === 'share-target') {
    const sharedText = params.get('text') || '';
    const sharedUrl = params.get('url') || '';
    const sharedTitle = params.get('title') || '';
    
    let combinedPayload = '';
    if (sharedTitle) combinedPayload += `Title: ${sharedTitle}\n`;
    if (sharedUrl) combinedPayload += `Link: ${sharedUrl}\n`;
    if (sharedText) combinedPayload += `${sharedText}`;

    if (combinedPayload) {
      injectTextToChatInput(combinedPayload);
    }
  }

  // Case 2: Custom Protocol Intercepts (e.g., web+snehai://chat?text=Hello)
  if (action === 'protocol') {
    const rawUri = params.get('uri');
    if (rawUri) {
      try {
        const urlObj = new URL(decodeURIComponent(rawUri));
        const textParam = urlObj.searchParams.get('text');
        if (textParam) {
          injectTextToChatInput(textParam);
        }
      } catch (err) {
        console.warn('[PWA] Protocol parse error:', err);
      }
    }
  }

  // Case 3: App Shortcuts
  if (action === 'new-chat') {
    window.addEventListener('DOMContentLoaded', () => {
      if (typeof window.createNewChat === 'function') window.createNewChat();
    });
  }

  if (action === 'contact-dbc') {
    window.addEventListener('DOMContentLoaded', () => {
      if (typeof window.showc2Modal === 'function') window.showc2Modal();
    });
  }

  if (action === 'settings') {
    window.addEventListener('DOMContentLoaded', () => {
      if (typeof window.openProfileModal === 'function') window.openProfileModal();
    });
  }
}

/**
 * Safely writes text to Sneh AI's textarea and fires standard input events to resize the container
 */
function injectTextToChatInput(text) {
  window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('text-input');
    if (input) {
      input.value = text;
      // Triggers autogrow and send-button state triggers
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    }
  });
}

/**
 * Dynamic Theme Color Injector (Android status bar, iOS Theme Color, Desktop Borders)
 */
export function updatePWAThemeColor(theme) {
  const targetColor = theme === 'dark' ? '#000000' : '#FAFAFA';

  const metaTags = document.querySelectorAll('meta[name="theme-color"]');
  if (metaTags.length > 0) {
    metaTags.forEach(tag => tag.setAttribute('content', targetColor));
  } else {
    const newMeta = document.createElement('meta');
    newMeta.name = 'theme-color';
    newMeta.content = targetColor;
    document.head.appendChild(newMeta);
  }

  document.documentElement.style.setProperty('color-scheme', theme);
  console.log(`[PWA] Theme color synchronized to: ${targetColor} (${theme})`);
}

/**
 * Native Badging support for installed icons (Windows / MacOS / Android)
 */
export function updatePWABadge(count) {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch((err) => console.log(err));
    } else {
      navigator.clearAppBadge().catch((err) => console.log(err));
    }
  }
}

/**
 * Dynamic connectivity state banner
 */
function handleConnectivityChange(isOnline) {
  const existing = document.getElementById('pwa-offline-indicator');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'pwa-offline-indicator';
  el.style.cssText = `
    position: fixed;
    bottom: 95px;
    left: 50%;
    transform: translateX(-50%);
    background: ${isOnline ? 'var(--secondary, #34c759)' : 'var(--text-tertiary, #8e8e93)'};
    color: white;
    padding: 8px 18px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    z-index: 10002;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: fadeInOut 3.5s ease forwards;
  `;
  el.innerHTML = isOnline 
    ? '<i class="fas fa-wifi"></i> Online Mode Active' 
    : '<i class="fas fa-wifi-slash"></i> Offline Sync Active';

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/**
 * Master Initialization
 */
export function initPWA() {
  // 1. Listen for PWA Install prompts
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    bindInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const installButton = document.getElementById('install-app-btn');
    if (installButton) installButton.style.display = 'none';
    showToast('App installed successfully!');
  });

  // 2. Continuous dynamic DOM Observer to catch any late-rendered install buttons
  const observer = new MutationObserver(() => {
    bindInstallButton();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 3. Resolve Share Intents, Custom Protocols, or Shortcut launches
  handleAppLaunchIntents();

  // 4. Desktop File Handling API Registration
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files.length) return;
      const fileHandle = launchParams.files[0];
      const file = await fileHandle.getFile();
      const content = await file.text();
      injectTextToChatInput(`[Opened File: ${file.name}]\n\n${content}`);
    });
  }

  // 5. Connect monitoring
  window.addEventListener('online', () => handleConnectivityChange(true));
  window.addEventListener('offline', () => handleConnectivityChange(false));

  // Initial check
  bindInstallButton();
}