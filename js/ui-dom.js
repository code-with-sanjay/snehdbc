// js/ui-dom.js
export let chatContainer, textInput, sendButton, newChatButton, incognitoButton;

export function setDomElements() {
  chatContainer = document.getElementById('chat-container');
  textInput = document.getElementById('text-input');
  sendButton = document.getElementById('send-button');
  newChatButton = document.querySelector('.new-chat-btn');
  incognitoButton = document.querySelector('.incognito-btn');
  
  if (textInput) {
  textInput.addEventListener('focus', () => {
      });
}
}

export function scrollToBottom() {
  if (!chatContainer) return;
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

export function smartScrollToBottom() {
  if (!chatContainer) return;
  const distanceFromBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
  if (distanceFromBottom < 150) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

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

export function setSendButtonLoading(isLoading) {
  if (!sendButton) return;
  const wrapper = document.querySelector('.input-wrapper');
  
  if (isLoading) {
    sendButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <rect x="6" y="6" width="12" height="12" rx="3" fill="#ffffff" />
      </svg>`;
    
    
    sendButton.classList.add('loading');          // ye add kiya h
    sendButton.disabled = true;
    sendButton.style.opacity = '1';
    sendButton.style.background = '#0B57CF';
    if (wrapper) wrapper.classList.add('loading');
    if (wrapper) wrapper.classList.add('processing'); // for input glow colors
  } else {
    sendButton.classList.remove('loading');       // ← and also this
    sendButton.disabled = false;
    sendButton.style.opacity = '';
    sendButton.style.background = '';

    if (textInput && textInput.value.trim() === '') {
      sendButton.innerHTML = getWaveformSVG();
    } else {
      sendButton.innerHTML = sendButton.dataset.originalContent ||
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    }
    if (wrapper) wrapper.classList.remove('loading');
    if (wrapper) {
  wrapper.classList.remove('processing');
  wrapper.classList.add('reply-ready');
  setTimeout(() => wrapper.classList.remove('reply-ready'), 700);
} // for input glow colors
  }
}

export function handleSendMessageWithText(text) {
  if (!sendButton || sendButton.disabled || !textInput) return;
  textInput.value = text;
  sendButton.click();
}

// ========== SEARCH TOGGLE STATE (FIXED: OUTSIDE ANY FUNCTION) ==========
let isSearchWebActive = false;

export function getSearchToggleState() {
  return isSearchWebActive;
}

export function setSearchToggleState(state) {
  isSearchWebActive = state;
  const btn = document.getElementById('search-toggle-btn');
  if (btn) {
    btn.classList.toggle('active', state);
  }
}