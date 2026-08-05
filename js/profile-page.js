

// js/profile-page.js
import { getUserProfile, logoutUser } from './storage.js';
import { renderAuthElements } from './auth.js';

let currentUserId = null;
let currentPhone = '';

function loadPhoneNumber(userId) {
  if (!userId) return '';
  return localStorage.getItem(`sneh_phone_${userId}`) || '';
}

function savePhoneNumber(userId, phone) {
  if (!userId) return;
  if (phone && phone.trim()) {
    localStorage.setItem(`sneh_phone_${userId}`, phone.trim());
  } else {
    localStorage.removeItem(`sneh_phone_${userId}`);
  }
}

function updatePhoneDisplay(phone) {
  const displaySpan = document.getElementById('phone-display');
  if (displaySpan) displaySpan.textContent = phone || 'Not set';
}

function enterEditMode() {
  const container = document.getElementById('phone-container');
  const currentVal = currentPhone;
  container.innerHTML = `
    <input type="tel" id="phone-input" class="phone-edit-input" value="${escapeHtml(currentVal)}" placeholder="+91 12345 67890">
    <div class="phone-edit-actions">
      <button id="save-phone">Save</button>
      <button id="cancel-phone" class="cancel">Cancel</button>
    </div>
  `;
  const input = document.getElementById('phone-input');
  const saveBtn = document.getElementById('save-phone');
  const cancelBtn = document.getElementById('cancel-phone');

  const saveHandler = () => {
    const newPhone = input.value.trim();
    savePhoneNumber(currentUserId, newPhone);
    currentPhone = newPhone;
    updatePhoneDisplay(newPhone);
    rebuildStaticView();
  };

  const cancelHandler = () => {
    rebuildStaticView();
  };

  saveBtn.addEventListener('click', saveHandler);
  cancelBtn.addEventListener('click', cancelHandler);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveHandler();
  });
  input.focus();
}

function rebuildStaticView() {
  const container = document.getElementById('phone-container');
  container.innerHTML = `
    <span id="phone-display">${currentPhone || '—'}</span>
    <button class="edit-phone-btn" id="edit-phone-btn"><i class="fas fa-pen"></i> Edit</button>
  `;
  const editBtn = document.getElementById('edit-phone-btn');
  if (editBtn) editBtn.addEventListener('click', enterEditMode);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

async function initProfilePage() {
  const profile = getUserProfile();
  if (!profile) {
    // Not logged in – redirect to main app
    window.location.href = 'index.html';
    return;
  }

  currentUserId = profile.id;
  currentPhone = loadPhoneNumber(currentUserId);

  // Fill avatar, name, email
  const avatar = document.getElementById('profile-avatar');
  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');

  if (avatar) avatar.src = profile.picture;
  if (nameEl) nameEl.textContent = profile.name;
  if (emailEl) emailEl.textContent = profile.email;

  updatePhoneDisplay(currentPhone);
  rebuildStaticView();

  // Sign out button
  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      logoutUser();
      if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
      renderAuthElements();
      window.location.href = 'index.html';
    });
  }
}

// Run when DOM ready
document.addEventListener('DOMContentLoaded', initProfilePage);