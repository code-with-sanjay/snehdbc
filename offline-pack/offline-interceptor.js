/**
 * offline-pack/offline-interceptor.js
 * Intercepts Groq API calls and routes to local engine if available.
 */
import { OfflineEngine } from "./offline-engine.js";

const offlineEngine = window.__offlineEngine || new OfflineEngine();
let engineReady = false;

// Warm up engine state
offlineEngine.checkInstallationHealth().then(() => {
  engineReady = true;
});

const originalFetch = window.fetch;

window.fetch = async function(resource, options) {
  const url = typeof resource === "string" ? resource : resource?.url;

  // Only intercept Groq chat completions
  if (url === "https://api.groq.com/openai/v1/chat/completions" && options?.body) {
    const route = await offlineEngine.getDynamicRoute();
    if (route === "OFFLINE_LOCAL") {
      // Check if engine is actually ready
      const installed = await offlineEngine.verifyInstallation();
      if (installed) {
        return await handleLocalInference(options);
      } else {
        // fallback to cloud
        console.warn("[Interceptor] Offline mode selected but model not installed. Falling back to cloud.");
        showToast("Offline AI not ready. Using cloud.");
        return originalFetch.apply(this, arguments);
      }
    }
  }
  return originalFetch.apply(this, arguments);
};

async function handleLocalInference(options) {
  try {
    const payload = JSON.parse(options.body);
    const messages = payload.messages || [];
    const systemPrompt = messages.find(m => m.role === "system")?.content || "You are Sneh AI.";
    const lastUserQuery = messages.filter(m => m.role === "user").pop()?.content || "";
    const formattedPrompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${lastUserQuery}<|im_end|>\n<|im_start|>assistant\n`;

    // Ensure engine worker is booted
    await offlineEngine.bootWorker();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        offlineEngine.onToken = (token) => {
          if (token === null) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
          const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`;
          controller.enqueue(encoder.encode(sse));
        };
        offlineEngine.generate(formattedPrompt, { maxTokens: 256 });
      }
    });

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" }
    });
  } catch (err) {
    console.error("[Interceptor] Local inference error:", err);
    // Fallback to cloud if local fails
    return originalFetch.apply(this, arguments);
  }
}

// Simple toast helper (uses existing c2-toast if available)
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'c2-toast show';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}