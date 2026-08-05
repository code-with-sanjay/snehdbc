// js/ui-format.js

export function formatMessageContent(text, isStreaming = false) {
  if (!text) return '';

  let processedText = text;

  // 1. PREVENT LEAKS: Strip raw <style> and <script> contents completely
  processedText = processedText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  processedText = processedText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // 2. AUTO-CLOSE: Prevent Markdown code blocks from shattering the UI
  const backtickCount = (processedText.match(/```/g) || []).length;
  if (backtickCount % 2 !== 0) {
    processedText += '\n```';
  }

  // 3. FORCE PARSE: Ensure headings & tables render instantly during stream
  if (isStreaming) {
    processedText += '\n';
  }

  // 4. MARKDOWN PARSING (With safety fallback)
  let rawHtml = '';
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      gfm: true,
      breaks: true,
      mangle: false,
      headerIds: false,
      highlight: function (code, lang) {
        if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
          try { return hljs.highlight(code, { language: lang }).value; } catch (e) { }
        }
        return typeof hljs !== 'undefined' ? (hljs.highlightAuto(code).value || code) : code;
      }
    });
    try {
      rawHtml = marked.parse(processedText);
    } catch (e) {
      console.warn('Markdown parse error:', e);
      rawHtml = processedText.replace(/\n/g, '<br>');
    }
  } else {
    rawHtml = processedText.replace(/\n/g, '<br>');
  }

  // ========== NEW: WRAP TABLES WITH A SCROLLABLE CONTAINER ==========
  // Use a safe regex to wrap each <table> with a <div class="table-wrapper">
  // This ensures horizontal scrolling without breaking layout.
  rawHtml = rawHtml.replace(
    /<table([^>]*)>([\s\S]*?)<\/table>/gi,
    (match, attrs, content) => {
      return `<div class="table-wrapper"><table${attrs}>${content}</table></div>`;
    }
  );

  // 5. ENTERPRISE PURIFIER
  if (typeof DOMPurify !== 'undefined') {
    try {
      return DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'del', 'ins', 'u',
          'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'span', 'a', 'br', 'hr', 'img', 'div', 'section', 'article'
        ],
        ALLOWED_ATTR: ['target', 'rel', 'class', 'href', 'src', 'alt', 'id', 'data-*'],
        FORBID_TAGS: ['script', 'iframe', 'form', 'input', 'style'],
        FORBID_ATTR: ['on*', 'style'],
        KEEP_CONTENT: true,
        FORCE_BODY: true
      });
    } catch (e) {
      console.error("Sanitization error:", e);
      return rawHtml; // Fallback
    }
  }

  return rawHtml;
}