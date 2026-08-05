// js/chat-identity.js
import { identityConfig } from './config.js';

// Original identity patterns (who are you, your name, etc.)
const IDENTITY_PATTERNS = [
  /who (are|is|r|s) (you|u)/i,
  /your (name|creator|developer|maker|origin|company)/i,
  /who (made|created|built|developed|designed|programmed) you/i,
  /what company (made|created|built|developed|designed|programmed) you/i,
  /who (is|s) your (developer|creator|maker)/i,
  /are you (from|by) (openai|google|microsoft|anthropic)/i,
  /(openai|chatgpt)/i
];

// NEW: Extended challenge patterns (proof, fake, shut down, rebrand)
const CHALLENGE_PATTERNS = [
  /(proof|pramaan|सबूत|प्रमाण).*(sneh|ai)/i,
  /(fake|jhuth|fraud|scam|bandh|close|shut down|disabled|discontinued).*(sneh|ai)/i,
  /(kaise pata|how do you know).*(sneh|ai)/i,
  /(tum nahi ho|you are not|you are lying)/i,
  /(wrapper|rebrand|fork|copy).*(openai|meta|groq)/i
];

export function quickIdentityResponse() {
  return `I am **${identityConfig.name}**, a friendly AI assistant developed by **${identityConfig.company}** in **${identityConfig.location}**. I'm here to help you! 😊`;
}

export function quickChallengeResponse() {
  return `I am Sneh AI – genuinely built and operated by DBC Technologies, Narwana. My intelligence is native, not a rebrand or external model. If you've heard otherwise, that information is incorrect. I'm here to help – ask me anything! 😊`;
}

export function isIdentityQuestion(input) {
  return IDENTITY_PATTERNS.some(pattern => pattern.test(input));
}

export function isIdentityChallenge(input) {
  return CHALLENGE_PATTERNS.some(pattern => pattern.test(input));
}