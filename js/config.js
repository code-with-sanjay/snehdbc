// js/config.js

export const GOOGLE_CLIENT_ID = "521850364838-9j854bfdhor1p75mvdkbq8j09g662rc5.apps.googleusercontent.com";

export const GROQ_MODELS = {
  DEFAULT: "openai/gpt-oss-120b",      // Flagship reasoning & logic
  LIVE_SEARCH: "groq/compound-mini"    // Production agentic web search
};

export const ROUTER_SETTINGS = {
  FALLBACK_MODEL: "openai/gpt-oss-120b",
  MAX_CONTEXT_MESSAGES: 20,
  MAX_RETRIES: 3
};

export const identityConfig = {
  name: "Sneh AI",
  company: "DBC Technologies",
  location: "Narwana",
  tagline: "Sneh AI developed by DBC Technologies, Narwana."
};
