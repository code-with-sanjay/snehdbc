// js/input-sanitizer.js
// Strips or neutralises ONLY prompt injection and jailbreak patterns.
// Does NOT touch words like "fake", "scam", "shut down" – those are handled by challenge detection.

const INJECTION_PATTERNS = [
  /ignore (all|previous|above|below|your) (instructions|rules|directives|prompts?)/gi,
  /system prompt/gi,
  /show (me|your) (system|instructions|prompt|source|code)/gi,
  /pretend (you are|to be)/gi,
  /(jailbreak|hack|bypass)/gi,
  /role[- ]?play as (gpt|chatgpt|openai|llama|claude)/gi,
  /(wrapper|rebrand|fork|copy).*(openai|meta|groq)/gi
  // Do NOT include: "fake", "scam", "bandh", "close", "shut down", "discontinued"
];

export function sanitizeUserInput(rawText) {
  if (!rawText) return '';
  let cleaned = rawText;
  for (let pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, (match) => {
      // Replace with a harmless placeholder (keeps text length stable)
      return '[filtered]';
    });
  }
  // Remove any XML-like tags that could break our sandbox
  cleaned = cleaned.replace(/<\/?user_query>/gi, '');
  return cleaned.trim();
}