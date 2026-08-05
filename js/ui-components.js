

// js/ui-components.js

import { chatContainer, newChatButton, incognitoButton, scrollToBottom, handleSendMessageWithText } from './ui-dom.js';
import { getWelcomePrompts } from './suggestions.js';
import { getCurrentMessages, currentSessionIsIncognito, getPendingIncognito } from './storage.js';

export function updateHasMessages() {
  if (!newChatButton) return;
  const messages = getCurrentMessages();
  const hasUserMessages = messages.some(msg => msg.role === 'user');
  newChatButton.style.display = hasUserMessages ? 'flex' : 'none';
  if (incognitoButton) {
    incognitoButton.style.display = hasUserMessages ? 'none' : 'flex';
  }
  const group = document.querySelector('.header-actions-group');
  if (group) {
    group.style.transform = 'translateZ(0)';
    setTimeout(() => { group.style.transform = ''; }, 0);
  }
  // Update placeholder based on conversation state
const textInput = document.getElementById('text-input');
if (textInput) {
  textInput.placeholder = hasUserMessages ? 'Reply to Snèh AI' : 'Ask Snèh AI...';
}
}

export function updateIncognitoButtonUI() {
  if (!incognitoButton) return;
  const isPending = getPendingIncognito();
  const icon = incognitoButton.querySelector('[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', isPending ? 'clock' : 'user-circle');
  }
  if (window.lucide) lucide.createIcons();
  const pendingBanner = document.getElementById('incognito-pending-banner');
  if (pendingBanner) pendingBanner.style.display = isPending ? 'block' : 'none';
}

export function updateActiveIncognitoBanner() {
  const oldBanner = document.getElementById('incognito-active-banner');
  if (oldBanner) oldBanner.remove();
  const messages = getCurrentMessages();
  const hasUserMessages = messages.some(msg => msg.role === 'user');
  
  if (currentSessionIsIncognito && hasUserMessages) {
    const banner = document.createElement('div');
    banner.id = 'incognito-active-banner';
    banner.className = 'incognito-banner active-banner';
    banner.innerHTML = '<i data-lucide="eye-off" style="width: 12px; margin-right: 4px;"></i> Incognito chat – not saved to history';
    if (chatContainer && chatContainer.firstChild) {
      chatContainer.insertBefore(banner, chatContainer.firstChild);
    } else if (chatContainer) {
      chatContainer.appendChild(banner);
    }
    if (window.lucide) lucide.createIcons();
  }
}

export function addThinkingIndicator() {
  const existing = document.getElementById('thinking-indicator');
  if (existing) return;
  const messageEl = document.createElement('div');
  messageEl.className = 'message message-assistant fade-in';
  messageEl.id = 'thinking-indicator';
  messageEl.innerHTML = `
    <div class="message-content">
      <div class="message-bubble" style="background: var(--bg-tertiary); padding: 14px 20px; border-radius: 20px;">
        <div class="thinking" style="display:flex; align-items:center; gap:12px;">
          <span style="font-weight:500; color:var(--text-secondary);">Snèh AI is thinking</span>
          <div class="thinking-dots">
            <span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>
          </div>
        </div>
      </div>
    </div>`;
  if (chatContainer) chatContainer.appendChild(messageEl);
  scrollToBottom();
}

export function removeThinkingIndicator() {
  const indicator = document.getElementById('thinking-indicator');
  if (indicator) {
    indicator.style.transition = 'opacity 0.3s ease';
    indicator.style.opacity = '0';
    setTimeout(() => indicator.remove(), 300);
  }
}

export async function renderWelcomeScreen() {
  if (!chatContainer) return;

  chatContainer.innerHTML = `
    <div class="welcome-screen" id="welcome-screen">
      <h1>Hi, I'm Snèh AI 👋</h1>
      <p>What can I help you with today?</p>
      <div class="prompt-grid" id="welcome-prompts-container">
        <div style="color: var(--text-tertiary); font-size: 0.95rem; margin-top: 1rem;">
          <i class="fas fa-spinner fa-pulse"></i> Personalizing your space...
        </div>
      </div>
    </div>
  `;

  const prompts = await getWelcomePrompts();
  const promptsContainer = document.getElementById('welcome-prompts-container');
  
  if (promptsContainer) {
    promptsContainer.innerHTML = prompts.map((prompt, index) => `
      <div class="prompt-card fade-in" data-prompt-index="${index}">
        <i data-lucide="${prompt.icon}"></i>
        <span>${prompt.text}</span>
      </div>
    `).join('');

    setTimeout(() => {
      if (window.lucide) lucide.createIcons();
      document.querySelectorAll('.prompt-card').forEach((card, index) => {
        card.addEventListener('click', () => {
          const welcome = document.getElementById('welcome-screen');
          if (welcome) welcome.remove();
          handleSendMessageWithText(prompts[index].text);
        });
      });
    }, 50);
  }
}

export function renderFollowUpSkeleton(bubbleEl) {
  if (!bubbleEl) return;
  const skeleton = document.createElement('div');
  skeleton.className = 'follow-up-skeleton fade-in';
  skeleton.id = 'temp-follow-up-skeleton';
  skeleton.innerHTML = `
    <div class="skeleton-pill"></div>
    <div class="skeleton-pill" style="width: 140px;"></div>
  `;
  bubbleEl.parentElement.appendChild(skeleton);
  scrollToBottom();
}

export function removeFollowUpSkeleton() {
  const skeleton = document.getElementById('temp-follow-up-skeleton');
  if (skeleton) skeleton.remove();
}

export function removeAllFollowUpPills() {
  const containers = document.querySelectorAll('.follow-up-container');
  containers.forEach(container => container.remove());
}

export function renderFollowUpPills(bubbleEl, questions) {
  if (!questions || questions.length === 0 || !bubbleEl) return;
  const container = document.createElement('div');
  container.className = 'follow-up-container fade-in';
  
  questions.forEach(q => {
    const pill = document.createElement('button');
    pill.className = 'follow-up-pill';
    pill.textContent = q;
    pill.onclick = () => {
      container.remove();  
      handleSendMessageWithText(q);
    };
    container.appendChild(pill);
  });
  
  bubbleEl.parentElement.appendChild(container);
  scrollToBottom();
}