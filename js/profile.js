// profile.js
import { getUserProfile, logoutUser } from './storage.js';
import { renderAuthElements } from './auth.js';

let currentUserId = null;
let currentDOB = '';          // stored as YYYY-MM-DD

// Helper: load/save DOB for user
function loadDOB(userId) {
  if (!userId) return '';
  return localStorage.getItem(`sneh_dob_${userId}`) || '';
}
function saveDOB(userId, dob) {
  if (!userId) return;
  if (dob && dob.trim()) {
    localStorage.setItem(`sneh_dob_${userId}`, dob.trim());
  } else {
    localStorage.removeItem(`sneh_dob_${userId}`);
  }
}

// Age calculation (returns age in years)
function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Show custom error dialog (like appearance dialog)
function showErrorDialog(message) {
  const existing = document.getElementById('custom-error-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'custom-error-overlay';
  overlay.className = 'sub-dialog-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="sub-dialog-box">
      <div class="sub-dialog-header">
        <h3>⚠️ Age restriction</h3>
      </div>
      <div class="sub-dialog-body">
        <p style="color: var(--text-primary);">${message}</p>
      </div>
      <div class="sub-dialog-footer">
        <button class="dialog-confirm-btn" id="error-ok-btn">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeHandler = () => overlay.remove();
  document.getElementById('error-ok-btn')?.addEventListener('click', closeHandler);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHandler(); });
}

// Check age and show/hide blocker overlay
let blockerActive = false;
function checkAgeAndBlock() {
  const profile = getUserProfile();
  if (!profile) {
    removeBlocker();
    return;
  }
  const dob = loadDOB(profile.id);
  if (!dob) {
    removeBlocker();
    return;
  }
  const age = calculateAge(dob);
  if (age !== null && age < 13) {
    showBlocker(age);
  } else {
    removeBlocker();
  }
}

function showBlocker(age) {
  if (blockerActive) return;
  const existing = document.getElementById('age-blocker');
  if (existing) existing.remove();

  const blockerDiv = document.createElement('div');
  blockerDiv.id = 'age-blocker';
  blockerDiv.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
    z-index: 20000; display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 20px; color: white; text-align: center;
    font-family: system-ui; padding: 2rem;
  `;
  blockerDiv.innerHTML = `
    <i data-lucide="alert-triangle" style="width: 48px; height: 48px; color: #ff3b30;"></i>
    <h2>Access Restricted</h2>
    <p>You must be at least 13 years old to use Snèh AI.<br>Your registered age: ${age} years.</p>
    <p style="font-size: 0.9rem; opacity: 0.7;">Please sign out or update your date of birth in settings.</p>
    <button id="blocker-signout-btn" style="background: #ff3b30; border: none; padding: 10px 24px; border-radius: 40px; color: white; font-weight: 600; margin-top: 20px;">Sign Out</button>
  `;
  document.body.appendChild(blockerDiv);
  if (window.lucide) lucide.createIcons({ root: blockerDiv });

  const signOutBtn = blockerDiv.querySelector('#blocker-signout-btn');
  signOutBtn.addEventListener('click', () => {
    logoutUser();
    if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
    renderAuthElements();
    removeBlocker();
    window.location.reload();
  });

  blockerActive = true;
}

function removeBlocker() {
  const blocker = document.getElementById('age-blocker');
  if (blocker) blocker.remove();
  blockerActive = false;
}

// Update DOB display in profile modal
function updateDOBDisplay(dob) {
  const displaySpan = document.getElementById('dob-display');
  if (!displaySpan) return;
  if (dob) {
    const formatted = new Date(dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    displaySpan.textContent = formatted;
  } else {
    displaySpan.textContent = 'Not set';
  }
}

// Show DOB dialog
function showDOBDialog() {
  const overlay = document.getElementById('dob-dialog-overlay');
  if (!overlay) return;
  const input = document.getElementById('dob-input');
  if (input) input.value = currentDOB;

  overlay.style.display = 'flex';

  const saveBtn = document.getElementById('dob-dialog-confirm');
  const cancelBtn = document.getElementById('dob-dialog-cancel');

  const saveHandler = () => {
    const newDOB = document.getElementById('dob-input').value;
    if (!newDOB) {
      showErrorDialog('Please select a valid date.');
      return;
    }
    const age = calculateAge(newDOB);
    if (age === null) {
      showErrorDialog('Invalid date format.');
      return;
    }
    if (age < 13) {
      showErrorDialog(`You are ${age} years old. You must be at least 13 years old to use Snèh AI.`);
      return;
    }
    if (age > 125) {
      showErrorDialog(`Age ${age} exceeds maximum allowed (125 years).`);
      return;
    }
    // Save DOB
    saveDOB(currentUserId, newDOB);
    currentDOB = newDOB;
    updateDOBDisplay(currentDOB);
    overlay.style.display = 'none';
    checkAgeAndBlock();  // re‑evaluate blocker (will remove if age now valid)
  };

  const cancelHandler = () => {
    overlay.style.display = 'none';
  };

  saveBtn.onclick = saveHandler;
  cancelBtn.onclick = cancelHandler;
  overlay.onclick = (e) => { if (e.target === overlay) cancelHandler(); };
}

// --- Custom delete confirmation dialog ---
function confirmDeleteAllChats() {
  const overlay = document.getElementById('delete-dialog-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';

  const confirmBtn = document.getElementById('delete-dialog-confirm');
  const cancelBtn = document.getElementById('delete-dialog-cancel');

  const performDelete = () => {
    // Delete all sessions
    localStorage.removeItem('sneh_sessions');
    localStorage.removeItem('sneh_current_session');
    // Also clear any incognito? not needed
    if (typeof window.createNewChat === 'function') {
      window.createNewChat();
    }
    closeProfileModal();
    // Show a small toast
    const toast = document.createElement('div');
    toast.className = 'c2-toast show';
    toast.textContent = 'All conversations deleted.';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
    overlay.style.display = 'none';
  };

  const cancelHandler = () => {
    overlay.style.display = 'none';
  };

  confirmBtn.onclick = performDelete;
  cancelBtn.onclick = cancelHandler;
  overlay.onclick = (e) => { if (e.target === overlay) cancelHandler(); };
}

// ----- Load profile modal with new DOB row -----
export async function showProfileModal() {
  const profile = getUserProfile();
  if (!profile) return;

  currentUserId = profile.id;
  currentDOB = loadDOB(currentUserId);

  await loadProfileFullTemplate();

  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  // Populate user info
  const avatarImg = document.getElementById('full-avatar');
  const nameHeader = document.getElementById('full-name');
  const nameDetail = document.getElementById('full-display-name');
  const emailSpan = document.getElementById('full-email');
  const userIdSpan = document.getElementById('full-user-id');
  const themeSpan = document.getElementById('full-theme-mode');

  if (avatarImg) avatarImg.src = profile.picture;
  if (nameHeader) nameHeader.textContent = profile.name;
  if (nameDetail) nameDetail.textContent = profile.name;
  if (emailSpan) emailSpan.textContent = profile.email;
  if (userIdSpan) userIdSpan.textContent = profile.id;

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (themeSpan) themeSpan.textContent = currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode';

  updateDOBDisplay(currentDOB);

  // DOB row trigger
  const dobTrigger = document.getElementById('dob-row-trigger');
  if (dobTrigger) dobTrigger.onclick = showDOBDialog;

  // --- Theme Picker Dialog logic (unchanged) ---
  const themeRowTrigger = document.getElementById('theme-row-trigger');
  const themeDialogOverlay = document.getElementById('theme-dialog-overlay');
  const themeDialogCancel = document.getElementById('theme-dialog-cancel');
  const themeDialogConfirm = document.getElementById('theme-dialog-confirm');

  if (themeRowTrigger && themeDialogOverlay) {
    themeRowTrigger.onclick = () => {
      const activeSetting = document.documentElement.getAttribute('data-theme') || 'dark';
      document.getElementById('theme-radio-dark').checked = (activeSetting === 'dark');
      document.getElementById('theme-radio-light').checked = (activeSetting === 'light');
      themeDialogOverlay.style.display = 'flex';
    };
  }
  if (themeDialogCancel) themeDialogCancel.onclick = () => themeDialogOverlay.style.display = 'none';
  if (themeDialogConfirm) {
    themeDialogConfirm.onclick = () => {
      const selected = document.querySelector('input[name="appearance-theme"]:checked');
      if (selected) applyExplicitTheme(selected.value);
      themeDialogOverlay.style.display = 'none';
    };
  }

  // Data improvement toggle (unchanged)
  const improveToggle = document.getElementById('improve-model-toggle');
  if (improveToggle) {
    improveToggle.checked = localStorage.getItem('sneh_improve_model') === 'true';
    improveToggle.onchange = function() {
      localStorage.setItem('sneh_improve_model', this.checked);
    };
  }

  // Delete all chats – custom
  const deleteTrigger = document.getElementById('delete-chats-trigger');
  if (deleteTrigger) deleteTrigger.onclick = confirmDeleteAllChats;

  // Check for updates (unchanged)
  const checkUpdatesTrigger = document.getElementById('check-updates-trigger');
  if (checkUpdatesTrigger) {
    checkUpdatesTrigger.onclick = () => {
      const icon = checkUpdatesTrigger.querySelector('.row-icon');
      if (icon) icon.classList.add('fa-spin');
      setTimeout(() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then(reg => reg?.update());
        }
        if (icon) icon.classList.remove('fa-spin');
      }, 1500);
    };
  }

  // Sign out
  const signOutBtn = document.getElementById('full-signout-btn');
  if (signOutBtn) {
    signOutBtn.onclick = () => {
      logoutUser();
      if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
      renderAuthElements();
      closeProfileModal();
      document.dispatchEvent(new CustomEvent('sneh:auth-changed', { detail: { profile: null } }));
    };
  }

  if (window.lucide) lucide.createIcons({ root: modal });
  modal.classList.add('fullscreen-profile');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

export function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) {
    modal.classList.remove('fullscreen-profile');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

// Helper to apply theme (unchanged, but kept)
function applyExplicitTheme(target) {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  if (current === target) return;
  const performThemeChange = () => {
    root.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    document.dispatchEvent(new CustomEvent('sneh:theme-changed', { detail: { theme: target } }));
    const themeBtn = document.querySelector('.theme-toggle-header');
    if (themeBtn) {
      const icon = themeBtn.querySelector('[data-lucide]');
      if (icon) {
        icon.setAttribute('data-lucide', target === 'light' ? 'sun' : 'moon');
        if (window.lucide) lucide.createIcons({ root: themeBtn });
      }
    }
    const labelSpan = document.getElementById('full-theme-mode');
    if (labelSpan) labelSpan.textContent = target === 'dark' ? 'Dark Mode' : 'Light Mode';
  };
  if (document.startViewTransition) {
    document.startViewTransition(performThemeChange);
  } else {
    root.classList.add('theme-switching');
    performThemeChange();
    setTimeout(() => root.classList.remove('theme-switching'), 600);
  }
}

// Preload template content (same as before)
let profileFullLoaded = false;
async function loadProfileFullTemplate() {
  if (profileFullLoaded) return Promise.resolve();
  try {
    const response = await fetch('modals/profile-full.html');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const modalContainer = document.getElementById('profile-modal');
    if (modalContainer) modalContainer.innerHTML = html;
    else throw new Error('Missing #profile-modal container');
    profileFullLoaded = true;
  } catch (err) {
    console.error('Failed to load profile template:', err);
    throw err;
  }
}

// Expose globally for inline handlers
window.showProfileModal = showProfileModal;
window.closeProfileModal = closeProfileModal;
window.checkAgeAndBlock = checkAgeAndBlock;   // for main.js / auth change

// Auto‑run age check on auth change
document.addEventListener('sneh:auth-changed', () => {
  checkAgeAndBlock();
});

// Also run on initial load if user already logged in
setTimeout(() => checkAgeAndBlock(), 500);