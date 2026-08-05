

// js/table-enhancer.js
// Sneh AI — Multi-Factor Adaptive Table Enhancement Engine

// Strict URL Validation Heuristic
const strictUrlRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/i;

/**
 * Main entry: analyzes all .table-wrapper elements, computes column weights,
 * applies responsive modes, and enhances cells with URL compaction, prose collapse, etc.
 */
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
            // fall through
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

        // Layer 2: Outlier Cell Typography
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

// Debounced Recalculation on Resize/Orientation
let tableResizeTimeout;
let tableResizeRAF;

function scheduleTableRecalculation() {
  clearTimeout(tableResizeTimeout);
  cancelAnimationFrame(tableResizeRAF);
  
  tableResizeTimeout = setTimeout(() => {
    tableResizeRAF = requestAnimationFrame(() => {
      // Clear data-enhanced cache to force fresh recalc
      document.querySelectorAll('.table-wrapper td[data-enhanced="true"]').forEach(cell => {
        cell.removeAttribute('data-enhanced');
      });
      enhanceTables();
    });
  }, 150);
}

// Auto‑attach listeners when this module loads
if (typeof window !== 'undefined') {
  window.addEventListener('resize', scheduleTableRecalculation);
  window.addEventListener('orientationchange', scheduleTableRecalculation);
}
