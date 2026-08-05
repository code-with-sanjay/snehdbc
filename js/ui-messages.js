// js/ui-messages.js
import { chatContainer, scrollToBottom } from './ui-dom.js';
import { formatMessageContent } from './ui-format.js';
import { renderWelcomeScreen, updateHasMessages, updateActiveIncognitoBanner } from './ui-components.js';
import { getCurrentMessages, currentSessionId } from './storage.js';

// --- Feedback Helpers ---
function getFeedbackKey(sessionId, msgIndex) {
  return `feedback_${sessionId}_${msgIndex}`;
}
function loadFeedback(sessionId, msgIndex) {
  return localStorage.getItem(getFeedbackKey(sessionId, msgIndex));
}
function saveFeedback(sessionId, msgIndex, value) {
  const key = getFeedbackKey(sessionId, msgIndex);
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
}

// --- Clipboard Utility ---
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) { /* fall through */ }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

export function updateRegenerateButtons() {
  const assistants = document.querySelectorAll('.message-assistant');
  if (!assistants.length) return;
  const last = assistants[assistants.length - 1];
  assistants.forEach(a => {
    const btn = a.querySelector('.regenerate-btn');
    if (btn) btn.style.display = (a === last) ? 'flex' : 'none';
  });
}

export function createMessageElement(content, isUser = false, msgIndex = null) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${isUser ? 'message-user' : 'message-assistant'} fade-in`;
  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';
  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'message-bubble';

  if (isUser) {
    bubbleEl.textContent = content;
  } else {
    bubbleEl.innerHTML = formatMessageContent(content);
  }
  contentEl.appendChild(bubbleEl);

  const actionsEl = document.createElement('div');
  actionsEl.className = 'message-actions';

  // --- Copy Button ---
  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn';
  copyBtn.innerHTML = '<i data-lucide="copy" class="action-icon"></i>';
  copyBtn.onclick = async (e) => {
    e.stopPropagation();
    let text = '';
    if (isUser) {
      text = content;
    } else {
      const ans = bubbleEl.querySelector('.answer-content');
      text = ans ? ans.textContent.trim() : bubbleEl.textContent.trim();
    }
    const ok = await copyToClipboard(text);
    copyBtn.innerHTML = ok
      ? '<i data-lucide="check" class="action-icon" style="color:#34c759;"></i>'
      : '<i data-lucide="alert-triangle" class="action-icon" style="color:#ff3b30;"></i>';
    if (window.lucide) lucide.createIcons({ root: copyBtn });
    setTimeout(() => {
      copyBtn.innerHTML = '<i data-lucide="copy" class="action-icon"></i>';
      if (window.lucide) lucide.createIcons({ root: copyBtn });
    }, 2000);
  };
  actionsEl.appendChild(copyBtn);

  if (isUser) {
    actionsEl.style.display = 'none';
    let timeout = null;
    bubbleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (timeout) clearTimeout(timeout);
      actionsEl.style.display = 'flex';
      timeout = setTimeout(() => { actionsEl.style.display = 'none'; }, 3000);
    });
  } else {
    // --- Share Button ---
    const shareBtn = document.createElement('button');
    shareBtn.className = 'action-btn';
    shareBtn.innerHTML = '<i data-lucide="share" class="action-icon"></i>';
    shareBtn.onclick = async (e) => {
      e.stopPropagation();
      let userMsg = messageEl.previousElementSibling;
      let userText = '';
      while (userMsg) {
        if (userMsg.classList.contains('message-user')) {
          const ub = userMsg.querySelector('.message-bubble');
          userText = ub ? ub.textContent.trim() : '';
          break;
        }
        userMsg = userMsg.previousElementSibling;
      }
      let assistantText = bubbleEl.querySelector('.answer-content')
        ? bubbleEl.querySelector('.answer-content').textContent.trim()
        : bubbleEl.textContent.trim();
      assistantText = assistantText
        .replace(/\*\*(.*?)\*\*/g, '*$1*')
        .replace(/### (.*?)\n/g, '*$1*\n')
        .replace(/`/g, '');
      const MAX_USER = 200, MAX_AI = 3000;
      if (userText.length > MAX_USER) userText = userText.slice(0, MAX_USER) + '…';
      if (assistantText.length > MAX_AI) assistantText = assistantText.slice(0, MAX_AI) + '…\n\n*[Read full response on Snèh AI]*';
      const appUrl = 'https://snehaidbc.netlify.app';
      const shareText = (userText ? `*Q: ${userText}*\n\n` : '') +
                        `*A:* ${assistantText}\n\n` +
                        `--\n🤖 Generated via Snèh AI\n🔗 ${appUrl}`;

      const copyFallback = async () => {
        const ok = await copyToClipboard(shareText);
        shareBtn.innerHTML = ok
          ? '<i data-lucide="check" class="action-icon" style="color:#34c759;"></i>'
          : '<i data-lucide="alert-triangle" class="action-icon" style="color:#ff3b30;"></i>';
        if (window.lucide) lucide.createIcons({ root: shareBtn });
        setTimeout(() => {
          shareBtn.innerHTML = '<i data-lucide="share" class="action-icon"></i>';
          if (window.lucide) lucide.createIcons({ root: shareBtn });
        }, 2000);
          };

      if (navigator.share) {
        try {
          if (navigator.canShare && !navigator.canShare({ text: shareText })) {
            await copyFallback();
            return;
          }
          await navigator.share({ title: 'Snèh AI Chat', text: shareText });
          shareBtn.innerHTML = '<i data-lucide="check" class="action-icon" style="color:#34c759;"></i>';
          if (window.lucide) lucide.createIcons({ root: shareBtn });
          setTimeout(() => {
            shareBtn.innerHTML = '<i data-lucide="share" class="action-icon"></i>';
            if (window.lucide) lucide.createIcons({ root: shareBtn });
          }, 2000);
        } catch (err) {
          if (err.name !== 'AbortError') await copyFallback();
        }
      } else {
        await copyFallback();
      }
    };
    actionsEl.appendChild(shareBtn);

    // --- Like & Dislike ---
    const likeBtn = document.createElement('button');
    likeBtn.className = 'action-btn';
    likeBtn.innerHTML = '<i data-lucide="thumbs-up" class="action-icon"></i>';
    const dislikeBtn = document.createElement('button');
    dislikeBtn.className = 'action-btn';
    dislikeBtn.innerHTML = '<i data-lucide="thumbs-down" class="action-icon"></i>';

    let currentFeedback = null;
    if (msgIndex !== null && currentSessionId) {
      currentFeedback = loadFeedback(currentSessionId, msgIndex);
      if (currentFeedback === 'like') likeBtn.classList.add('active-feedback');
      else if (currentFeedback === 'dislike') dislikeBtn.classList.add('active-feedback');
    }

    const setFeedback = (type) => {
      likeBtn.classList.remove('active-feedback');
      dislikeBtn.classList.remove('active-feedback');
      if (type === 'like') {
        likeBtn.classList.add('active-feedback');
        if (msgIndex !== null && currentSessionId) saveFeedback(currentSessionId, msgIndex, 'like');
      } else if (type === 'dislike') {
        dislikeBtn.classList.add('active-feedback');
        if (msgIndex !== null && currentSessionId) saveFeedback(currentSessionId, msgIndex, 'dislike');
      } else {
        if (msgIndex !== null && currentSessionId) saveFeedback(currentSessionId, msgIndex, null);
      }
    };

    likeBtn.onclick = (e) => {
      e.stopPropagation();
      const newVal = currentFeedback === 'like' ? null : 'like';
      setFeedback(newVal);
      currentFeedback = newVal;
    };
    dislikeBtn.onclick = (e) => {
      e.stopPropagation();
      const newVal = currentFeedback === 'dislike' ? null : 'dislike';
      setFeedback(newVal);
      currentFeedback = newVal;
    };
    actionsEl.appendChild(likeBtn);
    actionsEl.appendChild(dislikeBtn);

    // --- Regenerate ---
    const regenBtn = document.createElement('button');
    regenBtn.className = 'action-btn regenerate-btn';
    regenBtn.innerHTML = '<i data-lucide="refresh-cw" class="action-icon"></i>';
    regenBtn.style.display = 'none';
    regenBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof window.regenerateLastAssistant === 'function') window.regenerateLastAssistant();
    };
    actionsEl.appendChild(regenBtn);

    // --- PDF Export ---
    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'action-btn';
    pdfBtn.innerHTML = '<i data-lucide="download" class="action-icon"></i>';
    pdfBtn.title = 'Download as PDF';
    pdfBtn.onclick = async (e) => {
      e.stopPropagation();
      pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin action-icon"></i>';

      let userMsg = messageEl.previousElementSibling;
      let userText = 'User Query';
      while (userMsg) {
        if (userMsg.classList.contains('message-user')) {
          const ub = userMsg.querySelector('.message-bubble');
          userText = ub ? ub.textContent.trim() : 'User Query';
          break;
        }
        userMsg = userMsg.previousElementSibling;
      }

      let assistantHTML = '';
      if (bubbleEl) {
        const ans = bubbleEl.querySelector('.answer-content');
        assistantHTML = ans ? ans.innerHTML : bubbleEl.innerHTML;
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const safeName = userText.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-').slice(0, 35) || 'chat';
      const filename = `SnehAI_${safeName}.pdf`;

      const container = document.createElement('div');
      container.innerHTML = `
        <div style="font-family: 'Helvetica Neue', sans-serif; color:#1a1a1a; padding:40px; line-height:1.6; max-width:800px; margin:0 auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0B57CF; padding-bottom:15px; margin-bottom:30px;">
            <div><h1 style="margin:0; font-size:24px; color:#0B57CF; font-weight:800;">Snèh AI</h1><p style="margin:4px 0 0 0; font-size:12px; color:#666;">by DBC Technologies</p></div>
            <div style="text-align:right; font-size:12px; color:#888;"><p style="margin:0;">${dateStr}</p><p style="margin:4px 0 0 0;">${timeStr}</p></div>
          </div>
          <div style="background:#f8f9fa; border-left:4px solid #34c759; padding:20px; border-radius:4px 8px 8px 4px; margin-bottom:30px;">
            <p style="margin:0; font-size:12px; text-transform:uppercase; color:#34c759; font-weight:700; margin-bottom:8px;">Your Question</p>
            <p style="margin:0; font-size:16px; font-weight:600; color:#333;">${userText}</p>
          </div>
          <div style="font-size:14px; color:#2c3e50;"><p style="margin:0 0 15px 0; font-size:12px; text-transform:uppercase; color:#0B57CF; font-weight:700;">AI Response</p><div style="background:#fff;">${assistantHTML}</div></div>
          <div style="margin-top:50px; padding-top:20px; border-top:1px solid #eee; text-align:center; font-size:11px; color:#999;"><p style="margin:0;">Generated via Snèh AI • DBC Technologies, Narwana</p><p style="margin:4px 0 0 0; color:#0B57CF;">https://snehaidbc.netlify.app</p></div>
        </div>
      `;

      try {
        if (typeof html2pdf !== 'undefined') {
          await html2pdf().set({
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
          }).from(container).save();
          pdfBtn.innerHTML = '<i data-lucide="check" class="action-icon" style="color:#34c759;"></i>';
        } else {
          throw new Error('html2pdf missing');
        }
      } catch (err) {
        console.error('PDF Error:', err);
        pdfBtn.innerHTML = '<i data-lucide="alert-triangle" class="action-icon" style="color:#ff3b30;"></i>';
      } finally {
        if (window.lucide) lucide.createIcons({ root: pdfBtn });
        setTimeout(() => {
          pdfBtn.innerHTML = '<i data-lucide="download" class="action-icon"></i>';
          if (window.lucide) lucide.createIcons({ root: pdfBtn });
        }, 2500);
      }
    };
    actionsEl.appendChild(pdfBtn);
  }

  contentEl.appendChild(actionsEl);
  messageEl.appendChild(contentEl);
  return messageEl;
}

// ===== ENHANCE TABLES (ADAPTIVE SYSTEMS ENGINE) =====
export function enhanceTables() {
  const wrappers = document.querySelectorAll('.table-wrapper');
  
  wrappers.forEach(wrapper => {
    const table = wrapper.querySelector('table');
    if (!table) return;

    // 1. Structure Initialization
    table.removeAttribute('width');
    table.style.width = '100%';

    const theadRow = table.querySelector('thead tr');
    const firstRow = table.querySelector('tbody tr') || table.querySelector('tr');
    const headerRow = theadRow || firstRow;
    if (!headerRow) return;

    const headers = headerRow.querySelectorAll('th, td');
    const colCount = headers.length;
    if (colCount === 0) return;

    wrapper.setAttribute('data-cols', colCount);

    const rows = table.querySelectorAll('tbody tr');
    const viewportWidth = window.innerWidth || 360;

    // Layer 5: Card Conversion Escape System
    let mode = 'standard';
    if (colCount >= 5 && colCount <= 8) {
      mode = 'compact';
    } else if (colCount >= 9) {
      mode = 'scrollable';
    }

    if (viewportWidth < 600 && (colCount > 4 || rows.length > 5)) {
      mode = 'card-conversion';
    }
    wrapper.setAttribute('data-mode', mode);

    // Layer 3: Memory-Safe Event Delegation for Collapsible Prose Cells
    if (!wrapper._tableDelegated) {
      wrapper.addEventListener('click', (e) => {
        const toggle = e.target.closest('.prose-toggle');
        if (!toggle) return;
        e.preventDefault();
        
        const cell = toggle.closest('td');
        const truncated = cell.querySelector('.prose-short');
        const full = cell.querySelector('.prose-full');
        
        if (toggle.textContent === '[More]') {
          truncated.style.display = 'none';
          full.style.display = 'inline';
          toggle.textContent = '[Less]';
        } else {
          truncated.style.display = 'inline';
          full.style.display = 'none';
          toggle.textContent = '[More]';
        }
      });
      wrapper._tableDelegated = true;
    }

    // 2. Metrics Setup
    const colStats = Array.from({ length: colCount }, () => ({
      maxLen: 0,
      totalLen: 0,
      cellCount: 0,
      isNumeric: true,
      isBoolean: true,
      isStatus: true
    }));

    const statusKeywords = ['active', 'pending', 'complete', 'completed', 'success', 'failed', 'error', 'inactive', 'done', 'yes', 'no', 'true', 'false', 'on', 'off'];
    const booleanKeywords = ['yes', 'no', 'true', 'false', 'on', 'off'];

    // Strict URL Validation Heuristic
    const strictUrlRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/i;

    // 3. Simple Heuristic Column Analysis
    headers.forEach((th, colIdx) => {
      const rawText = th.textContent.trim();
      const txt = rawText.toLowerCase();
      colStats[colIdx].maxLen = Math.max(colStats[colIdx].maxLen, txt.length);
      colStats[colIdx].totalLen += txt.length;
      colStats[colIdx].cellCount++;

      if (rawText) {
        if (isNaN(Number(rawText.replace(/[\$,%,₹]/g, '')))) colStats[colIdx].isNumeric = false;
        if (!booleanKeywords.includes(txt)) colStats[colIdx].isBoolean = false;
        if (!statusKeywords.includes(txt)) colStats[colIdx].isStatus = false;
      }
    });

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, colIdx) => {
        if (colIdx >= colCount) return;
        const rawText = cell.textContent.trim();
        const txt = rawText.toLowerCase();
        const len = rawText.length;

        colStats[colIdx].maxLen = Math.max(colStats[colIdx].maxLen, len);
        colStats[colIdx].totalLen += len;
        colStats[colIdx].cellCount++;

        if (rawText) {
          if (isNaN(Number(rawText.replace(/[\$,%,₹]/g, '')))) colStats[colIdx].isNumeric = false;
          if (!booleanKeywords.includes(txt)) colStats[colIdx].isBoolean = false;
          if (!statusKeywords.includes(txt)) colStats[colIdx].isStatus = false;
        }

        // Set metadata labels for card-conversion layouts
        const headerName = headers[colIdx] ? headers[colIdx].textContent.trim() : `Col ${colIdx + 1}`;
        cell.setAttribute('data-label', headerName);
      });
    });

    // Determine smart auto fallback for asymmetric tables
    let colMaxBound = 0;
    let colMinBound = Infinity;
    colStats.forEach(s => {
      if (s.maxLen > colMaxBound) colMaxBound = s.maxLen;
      if (s.maxLen < colMinBound) colMinBound = s.maxLen;
    });
    const maxLenDifference = colMaxBound - colMinBound;

    if (colCount <= 4 && maxLenDifference > 40) {
      table.style.tableLayout = 'auto';
    } else {
      table.style.tableLayout = 'fixed';
    }

    // 4. Layer 4: Column Type Classification & Proportional Weighting
    const classifications = colStats.map(stats => {
      if (stats.maxLen <= 4 && stats.isNumeric) return 'index';
      if (stats.maxLen <= 12 || stats.isBoolean || stats.isStatus) return 'short';
      return 'broad';
    });

    let indexColCount = 0;
    let shortColCount = 0;
    classifications.forEach(type => {
      if (type === 'index') indexColCount++;
      if (type === 'short') shortColCount++;
    });

    const indexWidth = 8;
    const shortWidth = 14;
    const totalReservedWidth = (indexColCount * indexWidth) + (shortColCount * shortWidth);
    const broadColCount = colCount - indexColCount - shortColCount;
    
    // Cap total short-column reservation
    const finalReservedWidth = Math.min(totalReservedWidth, 60);
    const remainingWidth = 100 - finalReservedWidth;
    const broadWidth = broadColCount > 0 ? (remainingWidth / broadColCount) : (100 / colCount);

    const finalWidths = classifications.map(type => {
      if (type === 'index') return (finalReservedWidth / (totalReservedWidth || 1)) * indexWidth;
      if (type === 'short') return (finalReservedWidth / (totalReservedWidth || 1)) * shortWidth;
      return broadWidth;
    });

    // 5. Update Alignments, Process URL Compaction, & Prose Collapsing
    colStats.forEach((stats, colIdx) => {
      const avgLen = stats.cellCount > 0 ? (stats.totalLen / stats.cellCount) : 0;

      let alignClass = 'col-left';
      if (stats.isNumeric) {
        alignClass = 'col-right';
      } else if (stats.isBoolean || stats.isStatus) {
        alignClass = 'col-center';
      }

      // Preserve existing classes using list manipulations
      const headerCell = headers[colIdx];
      if (headerCell) {
        headerCell.classList.remove('col-left', 'col-right', 'col-center');
        headerCell.classList.add(alignClass);
      }

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const cell = cells[colIdx];
        if (!cell) return;

        cell.classList.remove('col-left', 'col-right', 'col-center');
        cell.classList.add(alignClass);

        // Prevent redundant executions on already enhanced structures
        if (cell.getAttribute('data-enhanced') === 'true') return;

        const cellText = cell.textContent.trim();
        const cellLen = cellText.length;

        let processed = false;

        // URL Compaction Block (Strict Parsing)
        if (strictUrlRegex.test(cellText)) {
          try {
            const urlObj = new URL(cellText);
            const domain = urlObj.hostname.replace('www.', '');
            let pathname = urlObj.pathname;
            if (pathname.length > 15) {
              pathname = pathname.substring(0, 12) + '...';
            }
            const displayUrl = domain + (pathname === '/' ? '' : pathname);
            cell.innerHTML = `<a href="${cellText}" target="_blank" rel="noopener noreferrer" class="table-compact-url" title="${cellText}">${displayUrl}</a>`;
            processed = true;
          } catch (_) {
            // Fall back to plain-text rendering on parse errors
          }
        }

        // Layer 3: Prose Cell Compression (Truncates cells containing 120+ characters)
        if (!processed && cellLen > 120) {
          const truncated = cellText.substring(0, 100) + '...';
          cell.innerHTML = `
            <span class="prose-short">${truncated}</span>
            <span class="prose-full" style="display:none;">${cellText}</span>
            <button class="prose-toggle">[More]</button>
          `;
          processed = true;
        }

        // Layer 2: Outlier Cell Typography (Forces vertical growth)
        if (avgLen > 0 && cellLen > Math.max(avgLen * 3, 100)) {
          cell.classList.add('table-outlier-cell');
        }

        cell.setAttribute('data-enhanced', 'true');
      });
    });

    // 6. Inject Colgroup Width Assignments
    let colgroup = table.querySelector('colgroup');
    if (colgroup) {
      colgroup.remove();
    }

    colgroup = document.createElement('colgroup');
    finalWidths.forEach(width => {
      const col = document.createElement('col');
      col.style.width = `${width.toFixed(2)}%`;
      colgroup.appendChild(col);
    });
    table.insertBefore(colgroup, table.firstChild);
  });
}

// Recalculation Listener (Debounced Window Resize and Orientation support)
let tableResizeTimeout;
let tableResizeRAF;

if (typeof window !== 'undefined') {
  const executeRecalculation = () => {
    // Clear data-enhanced cache state on window size changes to enable clean redraw recalculations
    document.querySelectorAll('.table-wrapper td[data-enhanced="true"]').forEach(cell => {
      cell.removeAttribute('data-enhanced');
    });
    enhanceTables();
  };

  const handleGlobalTableResize = () => {
    clearTimeout(tableResizeTimeout);
    cancelAnimationFrame(tableResizeRAF);
    
    tableResizeTimeout = setTimeout(() => {
      tableResizeRAF = requestAnimationFrame(executeRecalculation);
    }, 150);
  };

  window.addEventListener('resize', handleGlobalTableResize);
  window.addEventListener('orientationchange', handleGlobalTableResize);
}

export function appendMessageToUI(content, isUser = false, msgIndex = null) {
  const el = createMessageElement(content, isUser, msgIndex);
  if (chatContainer) chatContainer.appendChild(el);
  scrollToBottom();
  updateRegenerateButtons();
  updateHasMessages();
  updateActiveIncognitoBanner();
  if (window.lucide) lucide.createIcons({ root: el });
  enhanceTables(); // apply table enhancements
  return el;
}

export function renderChat() {
  if (!chatContainer) return;
  const messages = getCurrentMessages();
  const hasUser = messages.some(msg => msg.role === 'user');

  chatContainer.innerHTML = '';

  if (!hasUser) {
    renderWelcomeScreen();
  } else {
    let idx = 0;
    messages.forEach(msg => {
      if (msg.role !== 'system') {
        appendMessageToUI(msg.content, msg.role === 'user', idx);
        idx++;
      }
    });
  }
  scrollToBottom();
  updateRegenerateButtons();
  updateHasMessages();
  updateActiveIncognitoBanner();
  enhanceTables(); // final pass
}