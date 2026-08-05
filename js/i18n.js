// js/i18n.js

export const googleLanguages = [
  // ===== ALL 22 SCHEDULED LANGUAGES OF INDIA (8th Schedule) =====
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
  { code: 'sa', name: 'संस्कृतम् (Sanskrit)', flag: '🇮🇳' },
  { code: 'as', name: 'অসমীয়া (Assamese)', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'brx', name: 'बर\' (Bodo)', flag: '🇮🇳' },
  { code: 'doi', name: 'डोगरी (Dogri)', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'ks', name: 'कॉशुर (Kashmiri)', flag: '🇮🇳' },
  { code: 'kok', name: 'कोंकणी (Konkani)', flag: '🇮🇳' },
  { code: 'mai', name: 'मैथिली (Maithili)', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
  { code: 'mni', name: 'মৈতৈলোন্ (Manipuri)', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'ne', name: 'नेपाली (Nepali)', flag: '🇳🇵' },
  { code: 'or', name: 'ଓଡ଼ିଆ (Odia)', flag: '🇮🇳' },
  { code: 'sat', name: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)', flag: '🇮🇳' },
  { code: 'sd', name: 'سنڌي (Sindhi)', flag: '🇵🇰' },
  { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو (Urdu)', flag: '🇵🇰' },

  // ===== OTHER MAJOR INDIAN SUBCONTINENT LANGUAGES =====
  { code: 'si', name: 'සිංහල (Sinhala)', flag: '🇱🇰' },
  { code: 'dv', name: 'ދިވެހި (Dhivehi)', flag: '🇲🇻' },

  // ===== EAST & SOUTHEAST ASIAN =====
  { code: 'zh-CN', name: '简体中文 (Chinese Simplified)', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文 (Chinese Traditional)', flag: '🇹🇼' },
  { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵' },
  { code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷' },
  { code: 'my', name: 'မြန်မာ (Burmese)', flag: '🇲🇲' },
  { code: 'km', name: 'ភាសាខ្មែរ (Khmer)', flag: '🇰🇭' },
  { code: 'lo', name: 'ພາສາລາວ (Lao)', flag: '🇱🇦' },
  { code: 'th', name: 'ภาษาไทย (Thai)', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)', flag: '🇻🇳' },
  { code: 'tl', name: 'Tagalog (Filipino)', flag: '🇵🇭' },
  { code: 'id', name: 'Bahasa Indonesia (Indonesian)', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu (Malay)', flag: '🇲🇾' },
  { code: 'jw', name: 'Basa Jawa (Javanese)', flag: '🇮🇩' },
  { code: 'su', name: 'Basa Sunda (Sundanese)', flag: '🇮🇩' },

  // ===== EUROPEAN (Major) =====
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano (Italian)', flag: '🇮🇹' },
  { code: 'pt', name: 'Português (Portuguese)', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
  { code: 'uk', name: 'Українська (Ukrainian)', flag: '🇺🇦' },

  // ===== EUROPEAN (Western & Northern) =====
  { code: 'nl', name: 'Nederlands (Dutch)', flag: '🇳🇱' },
  { code: 'sv', name: 'Svenska (Swedish)', flag: '🇸🇪' },
  { code: 'no', name: 'Norsk (Norwegian)', flag: '🇳🇴' },
  { code: 'da', name: 'Dansk (Danish)', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi (Finnish)', flag: '🇫🇮' },
  { code: 'is', name: 'Íslenska (Icelandic)', flag: '🇮🇸' },
  { code: 'ga', name: 'Gaeilge (Irish)', flag: '🇮🇪' },
  { code: 'gd', name: 'Gàidhlig (Scots Gaelic)', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },

  // ===== EUROPEAN (Eastern & Slavic) =====
  { code: 'pl', name: 'Polski (Polish)', flag: '🇵🇱' },
  { code: 'cs', name: 'Čeština (Czech)', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovenčina (Slovak)', flag: '🇸🇰' },
  { code: 'hu', name: 'Magyar (Hungarian)', flag: '🇭🇺' },
  { code: 'ro', name: 'Română (Romanian)', flag: '🇷🇴' },
  { code: 'bg', name: 'Български (Bulgarian)', flag: '🇧🇬' },
  { code: 'sr', name: 'Српски (Serbian)', flag: '🇷🇸' },
  { code: 'hr', name: 'Hrvatski (Croatian)', flag: '🇭🇷' },
  { code: 'sl', name: 'Slovenščina (Slovenian)', flag: '🇸🇮' },
  { code: 'el', name: 'Ελληνικά (Greek)', flag: '🇬🇷' },
  { code: 'sq', name: 'Shqip (Albanian)', flag: '🇦🇱' },
  { code: 'mk', name: 'Македонски (Macedonian)', flag: '🇲🇰' },

  // ===== MIDDLE EASTERN & CAUCASIAN =====
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'he', name: 'עברית (Hebrew)', flag: '🇮🇱' },
  { code: 'fa', name: 'فارسی (Persian)', flag: '🇮🇷' },
  { code: 'tr', name: 'Türkçe (Turkish)', flag: '🇹🇷' },
  { code: 'ku', name: 'Kurdî (Kurdish)', flag: '🇹🇷' },
  { code: 'hy', name: 'Հայերեն (Armenian)', flag: '🇦🇲' },
  { code: 'ka', name: 'ქართული (Georgian)', flag: '🇬🇪' },
  { code: 'az', name: 'Azərbaycanca (Azerbaijani)', flag: '🇦🇿' },

  // ===== AFRICAN =====
  { code: 'sw', name: 'Kiswahili (Swahili)', flag: '🇹🇿' },
  { code: 'am', name: 'አማርኛ (Amharic)', flag: '🇪🇹' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'yo', name: 'Yorùbá (Yoruba)', flag: '🇳🇬' },
  { code: 'zu', name: 'isiZulu (Zulu)', flag: '🇿🇦' },
  { code: 'xh', name: 'isiXhosa (Xhosa)', flag: '🇿🇦' },
  { code: 'sn', name: 'chiShona (Shona)', flag: '🇿🇼' },
  { code: 'so', name: 'Soomaali (Somali)', flag: '🇸🇴' },
  { code: 'mg', name: 'Malagasy', flag: '🇲🇬' },

  // ===== CENTRAL & SOUTH AMERICAN =====
  { code: 'qu', name: 'Runasimi (Quechua)', flag: '🇵🇪' },
  { code: 'gn', name: 'Avañe\'ẽ (Guarani)', flag: '🇵🇾' },
  { code: 'ht', name: 'Kreyòl Ayisyen (Haitian Creole)', flag: '🇭🇹' },

  // ===== OCEANIC & OTHER =====
  { code: 'mi', name: 'Te Reo Māori (Maori)', flag: '🇳🇿' },
  { code: 'sm', name: 'Gagana Sāmoa (Samoan)', flag: '🇼🇸' },
  { code: 'haw', name: 'ʻŌlelo Hawaiʻi (Hawaiian)', flag: '🇺🇸' },
  { code: 'la', name: 'Lingua Latina (Latin)', flag: '🏛️' },
  { code: 'eo', name: 'Esperanto', flag: '🌐' },
  { code: 'cy', name: 'Cymraeg (Welsh)', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
];

export function getActiveLanguage() {
  return localStorage.getItem('sneh_google_lang') || 'en';
}

function triggerHtmlEvent(element, eventName) {
  let event;
  if (document.createEvent) {
    event = document.createEvent('HTMLEvents');
    event.initEvent(eventName, true, true);
    element.dispatchEvent(event);
  } else {
    event = document.createEventObject();
    element.fireEvent('on' + eventName, event);
  }
}

export function changeGoogleLanguage(langCode) {
  localStorage.setItem('sneh_google_lang', langCode);
  const selectEl = document.querySelector('.goog-te-combo');
  if (selectEl) {
    selectEl.value = langCode;
    triggerHtmlEvent(selectEl, 'change');
  } else {
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    window.location.reload();
  }
}

export function protectTechnicalSyntax(rootElement = document.body) {
  if (!rootElement) return;
  const selectorsToProtect = [
    'pre', 'code', '.logo-text', '.dbc-logo', '.thinking', '.thinking-dots',
    '.val-code', '.sidebar-user-name', 'i.fas', 'i.fab', 'i.far'
  ];
  selectorsToProtect.forEach(selector => {
    const elements = rootElement.querySelectorAll(selector);
    elements.forEach(el => {
      el.classList.add('notranslate');
      el.setAttribute('translate', 'no');
    });
  });
}

export function loadGoogleTranslateScript() {
  window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false
    }, 'google_translate_element');
    
    let attempts = 0;
    const maxAttempts = 50;
    const pollInterval = setInterval(() => {
      const selectEl = document.querySelector('.goog-te-combo');
      if (selectEl) {
        clearInterval(pollInterval);
        const savedLang = getActiveLanguage();
        if (savedLang !== 'en') {
          selectEl.value = savedLang;
          triggerHtmlEvent(selectEl, 'change');
        }
      }
      attempts++;
      if (attempts >= maxAttempts) clearInterval(pollInterval);
    }, 150);
  };

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(script);
}

export function initGoogleI18n() {
  loadGoogleTranslateScript();

  const btn = document.getElementById('language-toggle-btn');
  const menu = document.getElementById('language-menu');
  const activeLang = getActiveLanguage();

  if (btn && menu) {
    // ===== UPDATED MENU WITH INFO BUTTON =====
    menu.innerHTML = `
      <div class="language-menu-header">
        <span>Select Language</span>
        <button id="lang-legal-btn" class="lang-legal-icon-btn" title="Translation & Data Protocol">
          <i class="fas fa-info-circle"></i>
        </button>
      </div>
      <div class="language-options-wrapper">
        ${googleLanguages.map(lang => `
          <div class="language-option ${lang.code === activeLang ? 'active-lang' : ''}" data-lang="${lang.code}">
            <span style="margin-right: 10px; display: inline-block;">${lang.flag}</span>
            <span>${lang.name}</span>
          </div>
        `).join('')}
      </div>
    `;

    // 🔐 Safe click handler for the info button
    const langLegalBtn = menu.querySelector('#lang-legal-btn');
    if (langLegalBtn) {
      langLegalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = 'none';
        btn.classList.remove('active');
        
        if (typeof window.openLegalSection === 'function') {
          window.openLegalSection('Machine Translation Protocol');
        } else if (typeof window.showLegalModal === 'function') {
          window.showLegalModal();
        } else {
          console.warn("[Sneh AI] Legal navigation handlers not ready.");
        }
      });
    }

    // Toggle dropdown on globe button click
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menu.style.display === 'flex';
      menu.style.display = isVisible ? 'none' : 'flex';
      btn.classList.toggle('active', !isVisible);
    });

    // Language selection click handlers
    const options = menu.querySelectorAll('.language-option');
    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedLang = opt.dataset.lang;
        options.forEach(o => o.classList.remove('active-lang'));
        opt.classList.add('active-lang');
        menu.style.display = 'none';
        btn.classList.remove('active');
        if (selectedLang !== getActiveLanguage()) {
          changeGoogleLanguage(selectedLang);
          showToastFeedback(selectedLang);
        }
      });
    });

    // Dismiss menu on click outside
    document.addEventListener('click', () => {
      menu.style.display = 'none';
      btn.classList.remove('active');
    });

    // Protect dynamically added content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            protectTechnicalSyntax(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    protectTechnicalSyntax(document.body);
  }
}

function showToastFeedback(langCode) {
  const target = googleLanguages.find(l => l.code === langCode);
  const name = target ? target.name : "Language";
  const toast = document.createElement('div');
  toast.className = 'c2-toast show';
  toast.textContent = `Translating interface to ${name}...`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}