// js/ui.js
// SAFE explicit re‑exports – no wildcards
export { 
  chatContainer, 
  textInput, 
  sendButton, 
  newChatButton, 
  incognitoButton, 
  setDomElements, 
  scrollToBottom, 
  smartScrollToBottom, 
  setSendButtonLoading, 
  handleSendMessageWithText,
  getSearchToggleState,     // ADDED
  setSearchToggleState      // ADDED
} from './ui-dom.js';

export { formatMessageContent } from './ui-format.js';

export { 
  updateHasMessages, 
  updateIncognitoButtonUI, 
  updateActiveIncognitoBanner, 
  addThinkingIndicator, 
  removeThinkingIndicator, 
  renderWelcomeScreen, 
  renderFollowUpSkeleton, 
  removeFollowUpSkeleton, 
  renderFollowUpPills, 
  removeAllFollowUpPills 
} from './ui-components.js';

export { 
  updateRegenerateButtons, 
  createMessageElement, 
  appendMessageToUI, 
  renderChat 
} from './ui-messages.js';

// for our table format ai gemereted table 
export { enhanceTables } from './ui-messages.js';