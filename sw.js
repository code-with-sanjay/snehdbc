// ================================================================
//  Snèh AI — Automated Auto-Update Service Worker
//  Updates silently, automatically, and safely across environments
//
//  HOW TO DEPLOY A NEW VERSION:
//  1. Change BUILD_VERSION below (e.g. '34.25.217.g' → '34.25.218.g')
//  2. Upload all changed files to your hosting server (Netlify, etc.)
//  3. The app shell updates in the background on client load.
// ================================================================
// bol sat.shree.akal maharaaj ki jai

const BUILD_VERSION = 'snehai-5.2.5'; 
const CORE_CACHE_NAME = `sneh-ai-core-${BUILD_VERSION}`;
const CDN_CACHE_NAME = `sneh-ai-cdn-v1`; // Dedicated cache keeps CDNs intact across minor local updates

// ── App Shell: All local files that must work offline ──────────
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sidebar-content.html',

  // Modals
  '/modals/c2.html',
  '/modals/careers-modal.html',
  '/modals/contact-modal.html',
  '/modals/legal-modal.html',
  '/modals/profile-full.html',

  // CSS – root level
  '/modal.css',
  '/sidebar.css',
  '/c2.css',

  // CSS – subfolder
  '/css/animations.css',
  '/css/base.css',
  '/css/header.css',
  '/css/chat.css',
  '/css/input.css',
   '/css/table.css',
  '/css/markdown.css',
  '/css/responsive.css',
  '/css/utilities.css',

  // JavaScript modules – core
  '/js/config.js',
  '/js/storage.js',
  '/js/ui.js',
  '/js/ui-dom.js',
  '/js/ui-format.js',
  '/js/table-enhancer',
  '/js/ui-components.js',
  '/js/ui-messages.js',
  '/js/chat-core.js',
  '/js/chat-identity.js',
  '/js/chat-api.js',
  '/js/chat-handlers.js',
  '/js/input-sanitizer.js',   // Critical for injection defense
  '/js/theme.js',
  '/js/pwa.js',
  '/js/modal.js',
  '/js/sidebar.js',
  '/js/c2.js',
  '/js/i18n.js',
  '/js/main.js',
  '/js/suggestions.js',
  '/js/profile.js',
  '/js/profile-page.js',
  '/js/profile-hero-patch.js', // Aesthetic engine
  '/js/auth.js',
  '/js/llm-router.js',

  // Icons / Images
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/dbc-logo-light.png',
  '/icons/dbc-logo-dark.png',
  '/icons/sidebar-logo-light.png',
  '/icons/sidebar-logo-dark.png',
  '/icons/logo-header.png',
];

// ── External CDN assets (cached with fault tolerance) ──────────
const EXTERNAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
];

const CDN_HOSTNAMES = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// ==============================================================
//  INSTALL — Parallel pre-caching ensures robust setups
//  skipWaiting() forces the new SW to register instantly
// ==============================================================
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const coreCache = await caches.open(CORE_CACHE_NAME);
    
    // Resilient local caching: prevents installation failures if a single file is missing
    const corePromises = APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await coreCache.put(url, response);
        } else {
          console.warn(`[SW] Skipping static asset cache (Status ${response.status}): ${url}`);
        }
      } catch (err) {
        console.warn(`[SW] Network error caching asset: ${url}`, err);
      }
    });
    await Promise.all(corePromises);

    // Dynamic external CDN caching
    const cdnCache = await caches.open(CDN_CACHE_NAME);
    await Promise.allSettled(
      EXTERNAL_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cdnCache.put(url, response);
          }
        } catch (err) {
          console.warn(`[SW] CDN asset bypassed cache: ${url}`, err);
        }
      })
    );

    await self.skipWaiting();
    console.log(`[SW] v${BUILD_VERSION} installed & active`);
  })());
});

// ==============================================================
//  ACTIVATE — Deletes old registries, claims open client tabs
// ==============================================================
self.addEventListener('activate', event => {
  const activeCaches = [CORE_CACHE_NAME, CDN_CACHE_NAME];
  event.waitUntil((async () => {
    const allCaches = await caches.keys();
    await Promise.all(
      allCaches
        .filter(name => !activeCaches.includes(name))
        .map(name => {
          console.log(`[SW] Deleting legacy cache registry: ${name}`);
          return caches.delete(name);
        })
    );
    await self.clients.claim();
    console.log(`[SW] v${BUILD_VERSION} controlling all clients`);
  })());
});

// ==============================================================
//  FETCH — Smart Routing & Caching Policies
// ==============================================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching completely for non-GET queries
  if (request.method !== 'GET') return;

  // 1. BYPASS RULE: Dynamic APIs, Streaming completions, and Auth endpoints
  if (
    url.hostname.includes('groq.com') ||
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('openai.com') ||
    url.hostname.includes('cohere.ai') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('google-signin') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.pathname.includes('/.netlify/') ||
    url.pathname.includes('livereload')
  ) {
    return;
  }

  // 2. ROUTING RULE: CDN Libraries (Long-Term Cache First)
  if (CDN_HOSTNAMES.some(host => url.hostname.includes(host))) {
    event.respondWith(handleStaleWhileRevalidate(request, CDN_CACHE_NAME));
    return;
  }

  // 3. ROUTING RULE: HTML & Manifest (Network-First with Cache Fallback)
  if (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('manifest.json')
  ) {
    event.respondWith(handleNetworkFirst(request));
    return;
  }

  // 4. ROUTING RULE: Static local JS/CSS/Images (Stale-While-Revalidate)
  event.respondWith(handleStaleWhileRevalidate(request, CORE_CACHE_NAME).catch(() => {
    // Graceful offline fallback page for standard document requests
    if (request.headers.get('accept').includes('text/html')) {
      return getOfflineFallbackUI();
    }
  }));
});

// ==============================================================
//  STRATEGY: Network-First with Cache Fallback (for HTML)
// ==============================================================
async function handleNetworkFirst(request) {
  const cache = await caches.open(CORE_CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return getOfflineFallbackUI();
  }
}

// ==============================================================
//  STRATEGY: Cache-First with Async Background Cache Update
// ==============================================================
async function handleStaleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse || fetchPromise;
}

// ==============================================================
//  OFFLINE FALLBACK VIEWPORT
// ==============================================================
function getOfflineFallbackUI() {
  return new Response(
    `<!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Snèh AI — Offline</title>
       <style>
         body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif; background:#000000; color:#ffffff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; box-sizing:border-box; padding:24px; text-align:center; }
         .wrapper { max-width:400px; }
         h1 { font-size:1.6rem; font-weight:700; margin-bottom:12px; color:#1877f2; }
         p { opacity:0.65; font-size:0.95rem; line-height:1.5; margin:0 0 24px 0; }
         button { background-color:#1877f2; border:none; color:#ffffff; padding:12px 28px; border-radius:30px; font-weight:600; font-size:0.9rem; cursor:pointer; transition:background-color 0.2s; }
         button:hover { background-color:#1565c0; }
       </style>
     </head>
     <body>
       <div class="wrapper">
         <h1>You're Offline</h1>
         <p>Your local Sneh AI workspace is loaded, but initiating active chat generations requires an active internet connection.</p>
         <button onclick="window.location.reload()">Retry Connection</button>
       </div>
     </body>
     </html>`,
    { status: 503, headers: { 'Content-Type': 'text/html' } }
  );
}

// ==============================================================
//  MESSAGE ENGINE (Supports both strings and structural objects)
// ==============================================================
self.addEventListener('message', event => {
  if (!event.data) return;

  const data = event.data;
  if (data === 'SKIP_WAITING' || data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data === 'GET_VERSION' || data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: BUILD_VERSION });
  }
});
