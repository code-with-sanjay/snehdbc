// netlify/functions/chat.js

export default async (req, context) => {
  // 1. Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2. Read keys from Netlify Environment Variables
  const rawKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
  const apiKeys = rawKeys.split(",").map(k => k.trim()).filter(Boolean);

  if (apiKeys.length === 0) {
    return new Response(JSON.stringify({ 
      error: "Server Configuration Error: GROQ_API_KEYS environment variable is missing on Netlify." 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await req.json();

    // 3. Shuffle keys randomly to balance traffic load
    const shuffledKeys = [...apiKeys].sort(() => Math.random() - 0.5);
    let groqResponse = null;
    let lastError = null;

    // 4. Try keys; automatically fail over to next key on rate-limit (429/503/504)
    for (const apiKey of shuffledKeys) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        // If rate limited, log warning and try next key in loop
        if ([429, 503, 504].includes(response.status)) {
          console.warn(`[Netlify Function] Key rate-limited (${response.status}), switching key...`);
          continue;
        }

        groqResponse = response;
        break; // Connected successfully or returned valid error response
      } catch (err) {
        lastError = err;
      }
    }

    if (!groqResponse) {
      return new Response(JSON.stringify({ 
        error: "All Sneh AI API keys are currently rate-limited or busy.", 
        details: lastError?.message 
      }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5. Pipe response directly back to browser (Streaming SSE or JSON)
    const isStream = payload.stream === true;
    const contentType = isStream ? "text/event-stream" : "application/json";

    return new Response(groqResponse.body, {
      status: groqResponse.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Internal Gateway Error", 
      details: err.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// Route binding configuration
export const config = {
  path: "/.netlify/functions/chat"
};
