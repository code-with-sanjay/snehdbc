
// ============================================================
// Snèh AI — Automated IndexNow Submission Engine
// Canonical: https://snehaidbc.netlify.app/
// ============================================================

import https from 'https';

const HOST = 'snehaidbc.netlify.app';
const API_KEY = '3a8f9c2d1e0b4a7f6e5d8c3b2a1f0e9d';
const KEY_LOCATION = `https://${HOST}/${API_KEY}.txt`;

// All 10 Core Canonical Routes
const URL_LIST = [
  `https://${HOST}/`,
  `https://${HOST}/features/`,
  `https://${HOST}/privacy/`,
  `https://${HOST}/security/`,
  `https://${HOST}/about/`,
  `https://${HOST}/docs/`,
  `https://${HOST}/install/`,
  `https://${HOST}/faq/`,
  `https://${HOST}/changelog/`,
  `https://${HOST}/vs-chatgpt/`
];

const payload = JSON.stringify({
  host: HOST,
  key: API_KEY,
  keyLocation: KEY_LOCATION,
  urlList: URL_LIST
});

const options = {
  hostname: 'api.indexnow.org',
  path: '/indexnow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('🚀 Triggering IndexNow submission for Snèh AI...');

const req = https.request(options, (res) => {
  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 202) {
      console.log(`✅ IndexNow Success (HTTP ${res.statusCode}): All ${URL_LIST.length} URLs submitted to Bing & Copilot index!`);
    } else {
      console.error(`❌ IndexNow Failed (HTTP ${res.statusCode}):`, responseBody || res.statusMessage);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(payload);
req.end();
