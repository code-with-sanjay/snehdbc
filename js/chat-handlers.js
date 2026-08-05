
// js/chat-handlers.js
import {
  getCurrentMessages,
  pushMessageToCurrent,
  createNewChat,
  createIncognitoChat,
  saveAndRefresh,
  currentSessionId,
  getPendingIncognito,
  setPendingIncognito
} from './storage.js';

import {
  textInput,
  sendButton,
  appendMessageToUI,
  setSendButtonLoading,
  renderChat,
  updateRegenerateButtons,
  removeAllFollowUpPills,
  getSearchToggleState
} from './ui.js';

import { streamResponse, abortOngoingFollowUp } from './chat-api.js';
import { isIdentityQuestion, quickIdentityResponse, isIdentityChallenge, quickChallengeResponse } from './chat-identity.js';
import { sanitizeUserInput } from './input-sanitizer.js';

// NEW IMPORT: Sneh renderer for safe streaming
import { SnehStreamRenderer, makeSnehSafeDecoder } from './sneh-renderer.js';


export async function handleSendMessage() {
  
   
  if (sendButton.disabled) return;

  abortOngoingFollowUp();
  removeAllFollowUpPills(); 

  let rawText = textInput.value.trim();
  if (!rawText) return;
  

  // 🔹 Step 1: Detect identity challenges on RAW input (BEFORE sanitization)
  if (isIdentityChallenge(rawText)) {
    // Show user message as is (no need to sanitize a challenge)
    appendMessageToUI(rawText, true);
    pushMessageToCurrent('user', rawText);
    appendMessageToUI(quickChallengeResponse(), false);
    pushMessageToCurrent('assistant', quickChallengeResponse());
    saveAndRefresh();
    textInput.value = '';
    // Reset input height immediately
    if (window.adjustInputHeight) window.adjustInputHeight();
    setSendButtonLoading(false);
    updateRegenerateButtons();
    return;
  }

  // 🔹 Step 2: Now sanitize the input to remove injection patterns
  const cleanedText = sanitizeUserInput(rawText);

  // 🔹 Step 3: Normal chat flow
  const messages = getCurrentMessages();
  const hasUserMessages = messages.some(msg => msg.role === 'user');
  
  const welcome = document.getElementById('welcome-screen');
  if (welcome) welcome.remove();

  if (!hasUserMessages) {
    if (getPendingIncognito()) {
      createIncognitoChat();
      setPendingIncognito(false);
    } else {
      if (!currentSessionId) createNewChat();
    }
  }

  const forceSearch = getSearchToggleState();

  setSendButtonLoading(true);
  appendMessageToUI(cleanedText, true);
  pushMessageToCurrent('user', cleanedText);
  
  // Clear textarea and reset height
  textInput.value = '';
  if (window.adjustInputHeight) window.adjustInputHeight();

  // Handle simple "who are you" without streaming
  if (isIdentityQuestion(cleanedText)) {
    const reply = quickIdentityResponse();
    appendMessageToUI(reply, false);
    pushMessageToCurrent('assistant', reply);
    saveAndRefresh();
    setSendButtonLoading(false);
    updateRegenerateButtons();
    return;
  }

  await streamResponse(cleanedText, forceSearch);
}

export function regenerateLastAssistant() {
  if (sendButton.disabled) return;
  if (!currentSessionId) return;

  abortOngoingFollowUp();
  removeAllFollowUpPills(); 

  const messages = getCurrentMessages();
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIndex = i;
      break;
    }
  }
  if (lastUserIndex === -1) return;

  const lastUserMsg = messages[lastUserIndex].content;
  const truncated = messages.slice(0, lastUserIndex + 1);
  messages.length = 0;
  truncated.forEach(msg => messages.push(msg));

  const forceSearch = getSearchToggleState();

  saveAndRefresh();
  renderChat();
  streamResponse(lastUserMsg, forceSearch);
}

/**
 * Handles incoming LLM Stream connections safely
 * @param {Response} response - Direct fetch output from Groq/Sneh API
 * @param {HTMLElement} chatBubbleElement - Active message target container
 * @param {HTMLElement} chatListScrollContainer - Active chat scroll view container
 */
async function handleSnehResponseStream(response, chatBubbleElement, chatListScrollContainer) {
    // 1. Initialize our rendering and scroll engine pipeline
    const renderer = new SnehStreamRenderer(chatBubbleElement, chatListScrollContainer);
    renderer.start();

    try {
        // 2. Wrap network stream with the Unicode-Safe Decoder
        const safeTokenGenerator = makeSnehSafeDecoder(response.body);

        // 3. Process decoded tokens asynchronously as they arrive
        for await (const cleanToken of safeTokenGenerator) {
            renderer.pushToken(cleanToken);
        }
    } catch (streamError) {
        console.error("Critical stream transmission interrupt:", streamError);
    } finally {
        // 4. Finalize render. Resolves formatting and highlights code blocks.
        renderer.end();
    }
}