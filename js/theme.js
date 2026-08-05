// js/theme.js
import { updatePWAThemeColor } from './pwa.js';
/**
 * Updates the header toggle button icon dynamically using Lucide rendering
 */
export function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  const isLight = theme === 'light';
  const iconName = isLight ? 'sun' : 'moon';

  const themeBtn = document.querySelector('.theme-toggle-header');
  if (themeBtn) {
    const icon = themeBtn.querySelector('[data-lucide]');
    if (icon) {
      icon.setAttribute('data-lucide', iconName);
      if (window.lucide) {
        window.lucide.createIcons({ root: themeBtn });
      }
    }
  }
}

/**
 * Applies the theme to the DOM, writes to storage, and notifies external observers
 * 
 * @param {string} theme - Target theme state ('light' or 'dark')
 */
function applyThemeState(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // 1. Update the local layout icons
  updateThemeIcon();
  
  // 2. Synchronize Android/iOS status bars, clocks, and battery icons
  updatePWAThemeColor(theme);
  
  // 3. Notify auth module to re‑render Google buttons
  document.dispatchEvent(new CustomEvent('sneh:theme-changed', { detail: { theme } }));
}

/**
 * Initializes Sneh AI theme settings on application mount
 */
export function initTheme() {
  // Check user override first, fallback to device hardware preference
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const preferredDefault = systemPrefersDark ? 'dark' : 'light';
  const savedTheme = localStorage.getItem('theme') || preferredDefault;

  applyThemeState(savedTheme);

  // Active OS Observer: Updates theme in real-time if device preference shifts (unless manual override exists)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      const dynamicTheme = e.matches ? 'dark' : 'light';
      applyThemeState(dynamicTheme);
    }
  });
}

/**
 * Executes fluid theme toggle animations using CSS View Transitions API or browser fallbacks
 */
export function toggleTheme() {
   const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  const target = current === 'dark' ? 'light' : 'dark';

  // CSS View Transitions API Support (Native on modern Chrome/iOS Safari)
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      applyThemeState(target);
    });
  } else {
    // Fallback for older browsers
    root.classList.add('theme-switching');
    applyThemeState(target);
    setTimeout(() => {
      root.classList.remove('theme-switching');
    }, 600);
  }
}