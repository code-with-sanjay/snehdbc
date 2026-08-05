// js/auth.js
import { GOOGLE_CLIENT_ID } from './config.js';
import { setUserProfile, getUserProfile, logoutUser } from './storage.js';

const DISMISSAL_COOLDOWN_MS = 48 * 60 * 60 * 1000;
let retryCount = 0;
const MAX_RETRIES = 3;

export function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, m => map[m]);
}

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) { return null; }
}

function isAuthDismissed() {
  const dismissedTime = localStorage.getItem('sneh_dismissed_auth');
  if (!dismissedTime) return false;
  return (Date.now() - parseInt(dismissedTime, 10)) < DISMISSAL_COOLDOWN_MS;
}

export function dismissAuthBanner() {
  localStorage.setItem('sneh_dismissed_auth', Date.now().toString());
  const banner = document.getElementById('guest-login-banner');
  if (banner) {
    banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-10px)';
    setTimeout(() => { banner.style.display = 'none'; }, 300);
  }
}

function handleCredentialResponse(response) {
  const profileData = decodeJwt(response.credential);
  if (profileData) {
    const parsedProfile = {
      name: profileData.name,
      email: profileData.email,
      picture: profileData.picture,
      id: profileData.sub
    };
    setUserProfile(parsedProfile);
    renderAuthElements();
    document.dispatchEvent(new CustomEvent('sneh:auth-changed', { detail: { profile: parsedProfile } }));
  }
}

export function handleLogout() {
  logoutUser();
  if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
  renderAuthElements();
  document.dispatchEvent(new CustomEvent('sneh:auth-changed', { detail: { profile: null } }));
}

// Renders the sidebar header (profile link OR sign‑in button) – now calls the modal
function renderSidebarHeader() {
  const headerLeft = document.getElementById('sidebar-user-header');
  if (!headerLeft) return;

  const profile = getUserProfile();

  if (profile) {
    // ✅ Opens the unified modal instead of navigating away
    headerLeft.innerHTML = `
      <div class="sidebar-profile-link" onclick="window.showProfileModal(); event.stopPropagation();" style="display: flex; align-items: center; gap: 12px; width: 100%; cursor: pointer;">
        <img class="sidebar-user-avatar" src="${escapeHtml(profile.picture)}" alt="${escapeHtml(profile.name)}" referrerpolicy="no-referrer" />
        <span class="sidebar-user-name">${escapeHtml(profile.name)}</span>
      </div>
    `;
    headerLeft.style.cursor = 'pointer';
  } else {
    // Guest: show sign-in button
    headerLeft.innerHTML = `
      <div class="sidebar-guest-signin" id="sidebar-guest-signin-trigger">
        <i class="fas fa-user-circle"></i>
        <span>Sign in with Google</span>
      </div>
      <div id="sidebar-google-btn-container" style="display: none;"></div>
    `;
    headerLeft.style.cursor = 'default';
    const trigger = document.getElementById('sidebar-guest-signin-trigger');
    if (trigger && typeof google !== 'undefined') {
      trigger.addEventListener('click', () => {
        trigger.style.display = 'none';
        const container = document.getElementById('sidebar-google-btn-container');
        container.style.display = 'inline-flex';
        google.accounts.id.renderButton(container, {
          theme: document.documentElement.getAttribute('data-theme') === 'dark' ? "filled_black" : "outline",
          size: "small",
          shape: "pill"
        });
        const btn = container.querySelector('div[role="button"]');
        if (btn) btn.click();
      });
    }
  }
}

export function renderAuthElements() {
  const profile = getUserProfile();
  const banner = document.getElementById('guest-login-banner');
  const bannerContainer = document.getElementById('google-banner-btn-container');

  if (profile) {
    if (banner) banner.style.display = 'none';
  } else {
    if (banner && !isAuthDismissed()) {
      banner.style.display = 'flex';
      banner.style.opacity = '1';
      banner.style.transform = 'translateY(0)';
      if (bannerContainer && typeof google !== 'undefined') {
        bannerContainer.innerHTML = '';
        google.accounts.id.renderButton(bannerContainer, {
          theme: document.documentElement.getAttribute('data-theme') === 'dark' ? "filled_black" : "outline",
          size: "medium",
          shape: "pill"
        });
      }
    } else if (banner) {
      banner.style.display = 'none';
    }
  }
  renderSidebarHeader(); // always refresh sidebar header
}

function renderOfflineStates() {
  const banner = document.getElementById('guest-login-banner');
  if (banner) banner.style.display = 'none';
  const headerLeft = document.getElementById('sidebar-user-header');
  if (headerLeft && !getUserProfile()) {
    headerLeft.innerHTML = `
      <div class="sidebar-guest-signin offline">
        <i class="fas fa-wifi-slash"></i>
        <span>Offline</span>
      </div>
    `;
  }
}

export function initGoogleAuth() {
  if (typeof google !== 'undefined' && google.accounts) {
    try {
      const profile = getUserProfile();
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: !!profile,
        cancel_on_tap_outside: true
      });
      renderAuthElements();

      if (!profile && !isAuthDismissed()) {
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log("One Tap skipped – browser context.");
          }
        });
      }
      retryCount = 0;
    } catch (err) {
      console.error("GIS init error:", err);
      handleInitFailure();
    }
  } else {
    handleInitFailure();
  }
}

function handleInitFailure() {
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    setTimeout(initGoogleAuth, 1000 * retryCount);
  } else {
    renderOfflineStates();
  }
}