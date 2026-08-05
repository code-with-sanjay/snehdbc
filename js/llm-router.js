// js/llm-router.js
import { GROQ_MODELS } from './config.js';

const LIVE_SEARCH_PATTERNS = [
  /\b(weather|temperature|rain|forecast|humidity|climate)\b/i,
  /\b(news|headlines|latest|today|current events|what happened|update)\b/i,
  /\b(stock|crypto|bitcoin|market|price|score|match|game|result)\b/i,
  /\b(search|look up|who is|current president|prime minister|status of|live)\b/i
];

export function classifyIntent(text) {
  const lower = text.toLowerCase().trim();
  if (LIVE_SEARCH_PATTERNS.some(p => p.test(lower))) return 'live_search';
  return 'default';
}

export function getRouteConfig(intent, forceSearch = false) {
  // Read selected model from localStorage
  const selectedModel = localStorage.getItem('sneh_selected_model') || 'smart';

  // Force search if the selected model is 'web' OR the user explicitly clicked the globe
  const effectiveForceSearch = forceSearch || selectedModel === 'web';

  if (effectiveForceSearch || intent === 'live_search') {
    return {
      model: GROQ_MODELS.LIVE_SEARCH,
      statusText: "Live Search",
      useTools: false
    };
  }
  // For 'offline' model, we still return the default model because the interceptor
  // will override the route based on the preference set by the model selector.
  // But we also set a flag to tell the interceptor that we want offline.
  // However, the interceptor already checks sneh_preferred_model_route.
  // So we just return default; the interceptor will handle the rest.
  return {
    model: GROQ_MODELS.DEFAULT,
    statusText: "Thinking",
    useTools: false
  };
}