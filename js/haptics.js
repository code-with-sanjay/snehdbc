// js/haptics.js – Premium AI Haptic Engine v8.1
// Complete lifecycle management, production‑grade.
(function() {
  'use strict';

  // ─── 1. BOOTSTRAP GUARD ──────────────────────────────────────────
  if (window.__HAPTICS_BOOTSTRAPPED__) {
    console.warn('[Haptics] Already bootstrapped – skipping duplicate.');
    return;
  }
  window.__HAPTICS_BOOTSTRAPPED__ = true;

  // ─── 2. CONFIGURATION ──────────────────────────────────────────
  const CONFIG = {
    cooldown: 100,
    priorityCooldown: 30,
    focusCooldown: 400,
    thinkingStartCooldown: 0,
    thinkingReminderCooldown: 10000,
    completionDebounce: 300,
    reducedMotion: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    scrollBoundaryCooldown: 2000,
    successDedupeWindow: 250,
  };

  // ─── 3. HAPTIC PATTERNS ──────────────────────────────────────
  const PATTERNS = {
    selection: 6,
    action: 12,
    medium: 18,
    success: [8, 35, 16],
    warning: [18],
    error: [18, 40, 18, 40, 18],
    thinking: 5,
  };

  // ─── 4. PRIORITY SYSTEM ──────────────────────────────────────
  const PRIORITY = {
    selection: 1,
    action: 2,
    success: 3,
    warning: 4,
    error: 5,
    thinking: 0,
  };

  // ─── 5. NATIVE HAPTICS BRIDGE ──────────────────────────────
  function tryCapacitor(type) {
    if (window.Capacitor) {
      const haptics = window.Capacitor.Plugins?.Haptics || window.Capacitor.Haptics;
      if (!haptics) return false;

      // Impact styles (for selection, action, medium, thinking)
      const impactMap = {
        selection: 'light',
        action: 'medium',
        medium: 'medium',
        thinking: 'light',
      };

      // Notification types (for success, warning, error)
      const notificationMap = {
        success: 'success',
        warning: 'warning',
        error: 'error',
      };

      try {
        if (impactMap[type]) {
          haptics.impact({ style: impactMap[type] });
          return true;
        }
        if (notificationMap[type] && typeof haptics.notification === 'function') {
          haptics.notification({ type: notificationMap[type] });
          return true;
        }
        // Fallback: use impact for unknown types
        haptics.impact({ style: 'light' });
        return true;
      } catch (_) {}
    }
    return false;
  }

  function tryAndroidNative(type) {
    if (window.AndroidHaptics && typeof window.AndroidHaptics.perform === 'function') {
      const map = {
        selection: 'keyboard_tap',
        action: 'context_click',
        medium: 'virtual_key',
        success: 'confirm',
        warning: 'reject',
        error: 'reject',
        thinking: 'keyboard_tap',
      };
      try {
        window.AndroidHaptics.perform(map[type] || 'keyboard_tap');
        return true;
      } catch (_) {}
    }
    return false;
  }

  function tryVibration(pattern) {
    if (!navigator.vibrate) return false;
    try {
      navigator.vibrate(pattern);
      return true;
    } catch (_) { return false; }
  }

  // ─── 6. CORE ENGINE ──────────────────────────────────────────
  class HapticsEngine {
    constructor() {
      // State
      this.thinkingActive = false;
      this.completionTimer = null;
      this.longThinkingTimer = null;
      this.sidebarWasActive = false;
      this.destroyed = false;
      this.lastFocusTime = 0;
      this.hasTypedSinceFocus = false;
      this.lastPriority = 0;
      this.lastFireTime = 0;
      this.lastThinkingStartFire = 0;
      this.lastThinkingReminderFire = 0;
      this.themeSuccessTimer = null;
      this.lastScrollBoundaryTime = 0;
      this.lastSuccessTime = 0;
      this.lastSelectedText = '';
      this._online = navigator.onLine;
      this.observers = [];
      this.listeners = [];
      this.startedAtTop = false;

      // Bound handlers (for removal)
      this._bound = {};

      // ── Network listeners ──
      this._bound.online = () => {
        this._online = true;
        this.fire('success', PATTERNS.success, 'success');
      };
      this._bound.offline = () => {
        this._online = false;
        this.fire('error', PATTERNS.error, 'error');
      };
      window.addEventListener('online', this._bound.online);
      window.addEventListener('offline', this._bound.offline);
      this.listeners.push({ target: window, event: 'online', handler: this._bound.online });
      this.listeners.push({ target: window, event: 'offline', handler: this._bound.offline });

      // ── Visibility listener ──
      this._bound.visibility = () => {
        if (!document.hidden && this.thinkingActive) {
          this.recheckAIState();
        }
      };
      document.addEventListener('visibilitychange', this._bound.visibility);
      this.listeners.push({ target: document, event: 'visibilitychange', handler: this._bound.visibility });

      // ── Click listener ──
      this._bound.click = this._handleClick.bind(this);
      document.addEventListener('click', this._bound.click, true);
      this.listeners.push({ target: document, event: 'click', handler: this._bound.click, useCapture: true });

      // ── Input listener ──
      this._bound.input = this._handleInput.bind(this);
      document.addEventListener('input', this._bound.input);
      this.listeners.push({ target: document, event: 'input', handler: this._bound.input });

      // ── Selection listener ──
      this._bound.selection = this._handleSelection.bind(this);
      document.addEventListener('selectionchange', this._bound.selection);
      this.listeners.push({ target: document, event: 'selectionchange', handler: this._bound.selection });

      // ── Focus listener (delegated) ──
      this._bound.focus = this._handleFocus.bind(this);
      document.addEventListener('focus', this._bound.focus, true);
      this.listeners.push({ target: document, event: 'focus', handler: this._bound.focus, useCapture: true });

      // ── Touch listeners ──
      this._bound.touchstart = (e) => {
        this.startedAtTop = window.scrollY === 0;
        this.touchStartY = e.touches[0].clientY;
      };
      this._bound.touchend = (e) => {
        const deltaY = this.touchStartY - e.changedTouches[0].clientY;
        if (this.startedAtTop && deltaY < -80) {
          this.pullToRefreshDetected = true;
          setTimeout(() => {
            if (this.pullToRefreshDetected) {
              this.success();
              this.pullToRefreshDetected = false;
            }
          }, 500);
        }
      };
      document.addEventListener('touchstart', this._bound.touchstart, { passive: true });
      document.addEventListener('touchend', this._bound.touchend, { passive: true });
      this.listeners.push({ target: document, event: 'touchstart', handler: this._bound.touchstart });
      this.listeners.push({ target: document, event: 'touchend', handler: this._bound.touchend });

      // ── Upload listener ──
      this._bound.upload = (e) => {
        const input = e.target.closest('input[type="file"]');
        if (input && input.files && input.files.length > 0) {
          this.action();
        }
      };
      document.addEventListener('change', this._bound.upload);
      this.listeners.push({ target: document, event: 'change', handler: this._bound.upload });

      // ── Custom events ──
      const customEvents = [
        'sneh:error', 'sneh:warning', 'sneh:success',
        'sneh:toast', 'sneh:settings-saved',
        'sneh:copy-success', 'sneh:copy-error',
        'sneh:page-enter', 'sneh:page-exit', 'upload-complete'
      ];
      this._bound.custom = {};
      customEvents.forEach(event => {
        this._bound.custom[event] = () => {
          const map = {
            'sneh:error': 'error',
            'sneh:warning': 'warning',
            'sneh:success': 'success',
            'sneh:toast': 'success',
            'sneh:settings-saved': 'success',
            'sneh:copy-success': 'success',
            'sneh:copy-error': 'error',
            'sneh:page-enter': 'selection',
            'sneh:page-exit': 'selection',
            'upload-complete': 'success',
          };
          this.mapHaptic(map[event] || 'selection');
        };
        document.addEventListener(event, this._bound.custom[event]);
        this.listeners.push({ target: document, event: event, handler: this._bound.custom[event] });
      });

      // ── Scroll listener ──
      this._bound.scroll = this._handleScroll.bind(this);

      this.init();
    }

    // ── Core fire method ──────────────────────────────────────
    fire(type, pattern, priorityKey) {
      if (this.destroyed) return;
      if (document.hidden) return;
      if (CONFIG.reducedMotion) return;

      const isSuccess = priorityKey === 'success';
      const now = Date.now();

      // Dedupe success FIRST
      if (isSuccess && now - this.lastSuccessTime < CONFIG.successDedupeWindow) {
        return;
      }

      const priority = PRIORITY[priorityKey] || 0;

      let canFire = false;
      if (priority >= this.lastPriority) {
        if (now - this.lastFireTime >= CONFIG.priorityCooldown) canFire = true;
      } else {
        if (now - this.lastFireTime >= CONFIG.cooldown) canFire = true;
      }
      if (!canFire) return;

      // Update timestamps only after passing all checks
      this.lastFireTime = now;
      this.lastPriority = priority;
      if (isSuccess) {
        this.lastSuccessTime = now;
      }

      if (tryCapacitor(type)) return;
      if (tryAndroidNative(type)) return;
      tryVibration(pattern);
    }

    // ── Public haptic methods ────────────────────────────────
    selection() { this.fire('selection', PATTERNS.selection, 'selection'); }
    action()    { this.fire('action', PATTERNS.action, 'action'); }
    medium()    { this.fire('medium', PATTERNS.medium, 'action'); }
    success()   { this.fire('success', PATTERNS.success, 'success'); }
    warning()   { this.fire('warning', PATTERNS.warning, 'warning'); }
    error()     { this.fire('error', PATTERNS.error, 'error'); }

    thinkingStart() {
      const now = Date.now();
      if (now - this.lastThinkingStartFire < CONFIG.thinkingStartCooldown) return;
      this.lastThinkingStartFire = now;
      this.fire('thinking', PATTERNS.thinking, 'thinking');
    }

    thinkingReminder() {
      const now = Date.now();
      if (now - this.lastThinkingReminderFire < CONFIG.thinkingReminderCooldown) return;
      this.lastThinkingReminderFire = now;
      this.fire('thinking', PATTERNS.thinking, 'thinking');
    }

    // ── AI State ──────────────────────────────────────────────
    setThinking(active) {
      if (this.completionTimer) {
        clearTimeout(this.completionTimer);
        this.completionTimer = null;
      }

      if (active) {
        if (!this.thinkingActive) {
          this.thinkingActive = true;
          this.thinkingStart();

          if (!this.longThinkingTimer) {
            this.longThinkingTimer = setInterval(() => {
              if (this.thinkingActive) this.thinkingReminder();
            }, CONFIG.thinkingReminderCooldown);
          }
        }
      } else {
        if (this.thinkingActive) {
          this.completionTimer = setTimeout(() => {
            this.thinkingActive = false;
            if (this.longThinkingTimer) {
              clearInterval(this.longThinkingTimer);
              this.longThinkingTimer = null;
            }
            this.success();
            this.completionTimer = null;
          }, CONFIG.completionDebounce);
        }
      }
    }

    recheckAIState() {
      const sendBtn = document.getElementById('send-button');
      if (sendBtn) {
        const disabled = sendBtn.disabled;
        const loading = sendBtn.classList.contains('loading');
        this.setThinking(disabled && loading);
      }
    }

    // ── Voice ──────────────────────────────────────────────────
    voiceStart() { this.medium(); }
    voiceStop()  { this.success(); }
    voiceFail()  { this.error(); }

    // ── Sidebar ───────────────────────────────────────────────
    setSidebarActive(active) {
      if (active !== this.sidebarWasActive) {
        this.selection();
        this.sidebarWasActive = active;
      }
    }

    // ─── 7. EVENT HANDLERS ──────────────────────────────────────

    _handleFocus(e) {
      const el = e.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        const now = Date.now();
        if (now - this.lastFocusTime > CONFIG.focusCooldown) {
          this.selection();
          this.lastFocusTime = now;
          this.hasTypedSinceFocus = false;
        }
      }
    }

    _handleClick(e) {
      // 1) data-haptic (most accurate)
      const el = e.target.closest('[data-haptic]');
      if (el) {
        this.mapHaptic(el.dataset.haptic);
        return;
      }

      // 2) Semantic fallback (only for legacy elements)
      const fallback = e.target.closest('button, a, [role="button"], .clickable, .prompt-card, .follow-up-pill, .model-option, .history-item, .sidebar-footer a');
      if (!fallback) return;

      const id = fallback.id || '';
      const cls = fallback.className || '';
      const text = (fallback.textContent || fallback.getAttribute('aria-label') || '').toLowerCase();

      // Use classList.contains where possible
      const hasClass = (c) => fallback.classList ? fallback.classList.contains(c) : cls.includes(c);

      if (id === 'send-button' || hasClass('send-button') || text.includes('send')) {
        this.action(); return;
      }
      if (hasClass('stop') || text.includes('stop') || text.includes('cancel')) {
        this.warning(); return;
      }
      if (hasClass('new-chat') || text.includes('new chat')) {
        this.action(); return;
      }
      if (hasClass('theme-toggle') || id.includes('theme') || text.includes('theme')) {
        this.selection();
        if (this.themeSuccessTimer) clearTimeout(this.themeSuccessTimer);
        this.themeSuccessTimer = setTimeout(() => {
          this.success();
          this.themeSuccessTimer = null;
        }, 200);
        return;
      }
      if (hasClass('action-btn') && (text.includes('copy') || text.includes('📋'))) {
        this.success(); return;
      }
      if (hasClass('action-btn') && (text.includes('share') || text.includes('↗'))) {
        this.medium(); return;
      }
      if (hasClass('export') || text.includes('export') || hasClass('download') || text.includes('download')) {
        this.success(); return;
      }
      if (hasClass('regenerate') || text.includes('regenerate')) {
        this.medium(); return;
      }
      if (hasClass('model-capsule') || hasClass('model-option')) {
        this.selection();
        return;
      }
      if (id === 'sidebar-toggle' || hasClass('menu-toggle') || hasClass('close-sidebar')) {
        this.selection(); return;
      }
      if (hasClass('follow-up-pill') || hasClass('prompt-card')) {
        this.selection(); return;
      }
      if (hasClass('delete-chat') || text.includes('delete') || text.includes('trash')) {
        this.warning(); return;
      }
      if (hasClass('upload') || text.includes('upload') || text.includes('file')) {
        this.action(); return;
      }
      if (hasClass('voice') || hasClass('mic') || text.includes('voice')) {
        if (fallback.dataset.recording === 'true') {
          this.voiceStop();
          fallback.dataset.recording = 'false';
        } else {
          this.voiceStart();
          fallback.dataset.recording = 'true';
        }
        return;
      }
      if (hasClass('history-item')) {
        this.selection(); return;
      }
      if (fallback.matches('button, [role="button"]')) {
        this.selection();
      }
    }

    mapHaptic(type) {
      const map = {
        'send': 'action',
        'stop': 'warning',
        'new-chat': 'action',
        'theme': 'selection',
        'copy': 'success',
        'share': 'medium',
        'export': 'success',
        'download': 'success',
        'regenerate': 'medium',
        'model': 'selection',
        'sidebar': 'selection',
        'follow-up': 'selection',
        'prompt': 'selection',
        'delete': 'warning',
        'clear': 'warning',
        'upload': 'action',
        'voice': 'medium',
        'toast': 'success',
        'settings': 'selection',
        'success': 'success',
        'warning': 'warning',
        'error': 'error',
        'selection': 'selection',
        'action': 'action',
        'medium': 'medium',
      };
      const method = map[type] || 'selection';
      this[method]();
    }

    _handleInput(e) {
      const target = e.target;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return;
      if (target.id === 'text-input' || target.classList.contains('text-input')) {
        if (!this.hasTypedSinceFocus && target.value.length > 0) {
          this.selection();
          this.hasTypedSinceFocus = true;
        }
      }
    }

    _handleSelection() {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return;
      }

      clearTimeout(this._selectionTimer);
      this._selectionTimer = setTimeout(() => {
        const sel = window.getSelection();
        if (sel) {
          const text = sel.toString().trim();
          if (text.length > 0 && text !== this.lastSelectedText) {
            this.selection();
            this.lastSelectedText = text;
          }
        }
        this._selectionTimer = null;
      }, 100);
    }

    _handleScroll() {
      const chat = document.getElementById('chat-container');
      if (!chat) return;

      const now = Date.now();
      if (now - this.lastScrollBoundaryTime < CONFIG.scrollBoundaryCooldown) return;

      const top = chat.scrollTop;
      const max = chat.scrollHeight - chat.clientHeight;

      if (top <= 1 && this._lastScrollTop > 1) {
        this.selection();
        this.lastScrollBoundaryTime = now;
      } else if (top >= max - 1 && this._lastScrollTop < max - 1) {
        this.selection();
        this.lastScrollBoundaryTime = now;
      }
      this._lastScrollTop = top;
    }

    // ─── 8. INITIALISATION ──────────────────────────────────────
    init() {
      this.observeAIState();
      this.observeSidebar();
      this.observeNewMessages();
      this.observeModelSwitch();
      this.observeErrorStates();

      // Scroll listener (attached once)
      const chat = document.getElementById('chat-container');
      if (chat) {
        chat.addEventListener('scroll', this._bound.scroll);
        this.listeners.push({ target: chat, event: 'scroll', handler: this._bound.scroll });
        this._lastScrollTop = chat.scrollTop;
      }

      console.log('[Haptics] v8.1 engine ready');
    }

    // ─── 9. AI THINKING (with attribute change detection) ──────
    observeAIState() {
      const chat = document.getElementById('chat-container');
      const sendBtn = document.getElementById('send-button');

      if (sendBtn) {
        const obs = new MutationObserver(() => {
          const disabled = sendBtn.disabled;
          const loading = sendBtn.classList.contains('loading');
          this.setThinking(disabled && loading);
        });
        obs.observe(sendBtn, { attributes: true, attributeFilter: ['disabled', 'class'] });
        this.observers.push(obs);
      }

      if (chat) {
        const thinkingSelectors = ['.thinking', '.typing', '.loading', '.generating', '.is-streaming'];
        let thinkingSet = new Set();
        let lastAssistantCount = 0;

        const checkThinking = () => {
          const hasThinking = thinkingSet.size > 0;
          if (hasThinking) {
            this.setThinking(true);
            const assistants = chat.querySelectorAll('.message-assistant');
            lastAssistantCount = assistants.length;
          } else {
            const assistants = chat.querySelectorAll('.message-assistant');
            if (assistants.length > lastAssistantCount) {
              this.setThinking(false);
              lastAssistantCount = assistants.length;
            } else {
              this.setThinking(false);
            }
          }
        };

        let pending = false;
        const throttledCheck = () => {
          if (pending) return;
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            checkThinking();
          });
        };

        const obs = new MutationObserver((mutations) => {
          let changed = false;
          for (const mutation of mutations) {
            // Check node additions/removals
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) {
                if (node.matches && thinkingSelectors.some(s => node.matches(s))) {
                  thinkingSet.add(node);
                  changed = true;
                } else if (node.querySelector) {
                  const found = node.querySelector(thinkingSelectors.join(','));
                  if (found) {
                    thinkingSet.add(found);
                    changed = true;
                  }
                }
              }
            }
            for (const node of mutation.removedNodes) {
              if (node.nodeType === 1) {
                if (node.matches && thinkingSelectors.some(s => node.matches(s))) {
                  thinkingSet.delete(node);
                  changed = true;
                } else if (node.querySelector) {
                  const found = node.querySelector(thinkingSelectors.join(','));
                  if (found) {
                    thinkingSet.delete(found);
                    changed = true;
                  }
                }
              }
            }
            // Also check attribute changes on existing thinking nodes
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              const target = mutation.target;
              if (target.nodeType === 1 && target.matches) {
                const isThinkingNow = thinkingSelectors.some(s => target.matches(s));
                const wasInSet = thinkingSet.has(target);
                if (isThinkingNow && !wasInSet) {
                  thinkingSet.add(target);
                  changed = true;
                } else if (!isThinkingNow && wasInSet) {
                  thinkingSet.delete(target);
                  changed = true;
                }
              }
            }
          }
          if (changed) throttledCheck();
        });

        obs.observe(chat, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        });
        this.observers.push(obs);
        setTimeout(throttledCheck, 100);
      }
    }

    // ─── 10. NEW USER MESSAGE ────────────────────────────────────
    observeNewMessages() {
      const chat = document.getElementById('chat-container');
      if (!chat) return;

      const userSelectors = [
        '.message-user',
        '.user-message',
        '.message.user',
        '[data-role="user"]',
      ];

      const obs = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && node.matches) {
              if (userSelectors.some(s => node.matches(s))) {
                this.selection();
              } else if (node.querySelector) {
                const found = node.querySelector(userSelectors.join(','));
                if (found) this.selection();
              }
            }
          }
        }
      });
      obs.observe(chat, { childList: true, subtree: true });
      this.observers.push(obs);
    }

    // ─── 11. SIDEBAR ──────────────────────────────────────────────
    observeSidebar() {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return;
      this.sidebarWasActive = sidebar.classList.contains('active');
      const obs = new MutationObserver(() => {
        this.setSidebarActive(sidebar.classList.contains('active'));
      });
      obs.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
      this.observers.push(obs);
    }

    // ─── 12. MODEL SWITCH ─────────────────────────────────────────
    observeModelSwitch() {
      const capsule = document.getElementById('model-capsule-btn');
      if (!capsule) return;
      let lastModel = capsule.dataset.modelId || '';
      const obs = new MutationObserver(() => {
        const newModel = capsule.dataset.modelId || '';
        if (newModel !== lastModel && newModel !== '') {
          this.success();
          lastModel = newModel;
        }
      });
      obs.observe(capsule, { attributes: true, attributeFilter: ['data-model-id'] });
      this.observers.push(obs);
    }

    // ─── 13. ERROR STATES ──────────────────────────────────────────
    observeErrorStates() {
      const errorSelectors = [
        '.toast-error',
        '.error-message',
        '.network-error',
        '.failed',
        '[data-error]',
      ];
      const obs = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              if (node.matches && errorSelectors.some(s => node.matches(s))) {
                this.error();
              } else if (node.querySelector) {
                const found = node.querySelector(errorSelectors.join(','));
                if (found) this.error();
              }
            }
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      this.observers.push(obs);
    }

    // ─── 14. CLEANUP ──────────────────────────────────────────────
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;

      // Remove all event listeners
      this.listeners.forEach(({ target, event, handler, useCapture }) => {
        try {
          target.removeEventListener(event, handler, useCapture || false);
        } catch (_) {}
      });
      this.listeners = [];

      // Disconnect all MutationObservers
      this.observers.forEach(o => {
        try { o.disconnect(); } catch (_) {}
      });
      this.observers = [];

      // Clear all timers
      if (this.completionTimer) {
        clearTimeout(this.completionTimer);
        this.completionTimer = null;
      }
      if (this.longThinkingTimer) {
        clearInterval(this.longThinkingTimer);
        this.longThinkingTimer = null;
      }
      if (this.themeSuccessTimer) {
        clearTimeout(this.themeSuccessTimer);
        this.themeSuccessTimer = null;
      }
      if (this._selectionTimer) {
        clearTimeout(this._selectionTimer);
        this._selectionTimer = null;
      }

      // Reset state
      this.thinkingActive = false;
      console.log('[Haptics] Destroyed');
    }
  }

  // ─── 15. INSTANTIATE ────────────────────────────────────────────
  // Prevent duplicate instances
  if (window.HapticsEngine) {
    try {
      if (typeof window.HapticsEngine.destroy === 'function') {
        window.HapticsEngine.destroy();
      }
    } catch (_) {}
  }

  function createInstance() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.HapticsEngine = new HapticsEngine();
      });
    } else {
      window.HapticsEngine = new HapticsEngine();
    }
  }

  createInstance();

})();