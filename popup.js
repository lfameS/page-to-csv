/* Page to CSV — popup logic.
 * Flow: when the popup opens we inject scanAndExtract() into the active tab, which
 * returns every <table> and meaningful <ul>/<ol> on the page as plain 2D string data.
 * The popup renders a preview per data set and builds the CSV locally on demand.
 * Nothing is ever sent to a server — extraction happens entirely in the user's browser. */

const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const toastEl = document.getElementById('toast');

let candidates = [];

/* ---------- Injected into the page (must be fully self-contained) ---------- */
function scanAndExtract() {
  const MAX_ROWS = 5000;
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const out = [];

  // Find a heading that genuinely precedes the element (bounded backward walk,
  // stopping at another data block so we don't borrow a far-away section's title).
  const labelFor = (el, fallback) => {
    let node = el.previousElementSibling;
    let steps = 0;
    while (node && steps < 4) {
      if (/^H[1-6]$/.test(node.tagName)) {
        const t = clean(node.textContent).slice(0, 80);
        if (t) return t;
      }
      if (/^(TABLE|UL|OL|SECTION|ARTICLE)$/.test(node.tagName)) break;
      node = node.previousElementSibling;
      steps++;
    }
    return fallback;
  };

  // --- Tables: each table is normalized from its OWN rows, honoring BOTH colspan and rowspan
  //     via a grid. Nested tables are extracted as their own data sets (their <tr>s belong to
  //     them via closest('table'), so they never leak into the parent's rows). ---
  Array.from(document.querySelectorAll('table')).forEach((table, i) => {
    const ownRows = Array.from(table.querySelectorAll('tr')).filter((tr) => tr.closest('table') === table);
    if (!ownRows.length) return;

    const grid = []; // grid[r][c] = value; spanned cells fill multiple grid positions
    ownRows.forEach((tr, r) => {
      if (!grid[r]) grid[r] = [];
      let c = 0;
      tr.querySelectorAll(':scope > th, :scope > td').forEach((cell) => {
        while (grid[r][c] !== undefined) c++; // skip positions already filled by a rowspan above
        const colspan = Math.max(1, Math.min(parseInt(cell.getAttribute('colspan') || '1', 10) || 1, 30));
        const rowspan = Math.max(1, Math.min(parseInt(cell.getAttribute('rowspan') || '1', 10) || 1, 1000));
        const val = clean(cell.textContent);
        for (let dr = 0; dr < rowspan; dr++) {
          const rr = r + dr;
          if (!grid[rr]) grid[rr] = [];
          for (let dc = 0; dc < colspan; dc++) grid[rr][c + dc] = val;
        }
        c += colspan;
      });
    });

    const cols = grid.reduce((m, row) => Math.max(m, row ? row.length : 0), 0);
    if (!cols) return;
    const rows = grid.slice(0, MAX_ROWS).map((row) => {
      const filled = (row || []).slice();
      for (let k = 0; k < cols; k++) if (filled[k] === undefined) filled[k] = '';
      return filled;
    });

    const caption = table.querySelector(':scope > caption');
    const label = caption
      ? (clean(caption.textContent).slice(0, 80) || 'Table ' + (i + 1))
      : labelFor(table, 'Table ' + (i + 1));
    out.push({ type: 'table', label: label, rows: rows, dataRows: rows.length });
  });

  // --- Lists (ul/ol): skip nav menus, table-embedded lists, and lists nested inside an <li>
  //     (those are handled as part of their parent list item). ---
  Array.from(document.querySelectorAll('ul, ol')).forEach((list, i) => {
    if (list.closest('table') || list.closest('nav') || list.getAttribute('role') === 'menu') return;
    if (list.parentElement && list.parentElement.closest('li')) return;
    const items = Array.from(list.children).filter((c) => c.tagName === 'LI');
    if (items.length < 3) return;

    const withLinks = items.filter((li) => li.querySelector('a[href]')).length >= Math.ceil(items.length / 2);
    const dataRows = [];
    items.forEach((li) => {
      // Strip nested-list text so it doesn't get jammed into this item's cell.
      const clone = li.cloneNode(true);
      clone.querySelectorAll('ul, ol').forEach((n) => n.remove());
      const text = clean(clone.textContent);
      if (!text) return;
      if (withLinks) {
        const a = li.querySelector('a[href]');
        dataRows.push([text, a ? a.href : '']);
      } else {
        dataRows.push([text]);
      }
    });
    if (dataRows.length < 3) return;

    const capped = dataRows.slice(0, MAX_ROWS);
    const rows = withLinks ? [['Item', 'Link']].concat(capped) : capped;
    out.push({ type: 'list', label: labelFor(list, 'List ' + (i + 1)), rows: rows, dataRows: dataRows.length });
  });

  return out;
}

/* ---------- CSV helpers (run in the popup) ---------- */
function toCSV(rows) {
  const esc = (cell) => {
    const s = cell == null ? '' : String(cell);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  // Prepend a UTF-8 BOM so Excel opens non-ASCII (e.g. Turkish) characters correctly.
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

function sanitizeName(name) {
  const s = (name || 'data').replace(/[^a-z0-9\-_]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return s || 'data';
}

function downloadCSV(idx) {
  const c = candidates[idx];
  if (!c) return;
  const blob = new Blob([toCSV(c.rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeName(c.label) + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast('CSV downloaded');
}

async function copyCSV(idx) {
  const c = candidates[idx];
  if (!c) return;
  const csv = toCSV(c.rows);
  try {
    await navigator.clipboard.writeText(csv);
  } catch (e) {
    // Fallback for environments where the async clipboard API is blocked.
    const ta = document.createElement('textarea');
    ta.value = csv;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  showToast('Copied to clipboard');
}

/* ---------- Rendering ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function render(list) {
  resultsEl.innerHTML = '';
  if (!list.length) {
    resultsEl.innerHTML = '<p class="empty">No tables or lists found here. Open a page that has a data table or list (try the included <code>demo/sample.html</code>) and click Rescan.</p>';
    return;
  }
  list.forEach((c, idx) => {
    const cols = c.rows.reduce((m, r) => Math.max(m, r.length), 0);
    const previewRows = c.rows.slice(0, 3).map((r) =>
      '<tr>' + r.slice(0, 6).map((cell) => `<td>${escapeHtml(cell)}</td>`).join('') + '</tr>'
    ).join('');

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-head">
        <span class="card-title">${escapeHtml(c.label)}<span class="badge">${c.type}</span></span>
        <span class="card-meta">${c.dataRows != null ? c.dataRows : c.rows.length} rows × ${cols} cols</span>
      </div>
      <div class="preview"><table>${previewRows}</table></div>
      <div class="card-actions">
        <button class="btn" data-act="download" data-idx="${idx}">Download CSV</button>
        <button class="btn btn-secondary" data-act="copy" data-idx="${idx}">Copy</button>
      </div>`;
    resultsEl.appendChild(card);
  });
}

let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function setStatus(msg) { statusEl.textContent = msg; }

/* ---------- Scan orchestration ---------- */
async function scan() {
  setStatus('Scanning page…');
  resultsEl.innerHTML = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^(https?|file):/.test(tab.url || '')) {
      setStatus('Open a normal web page (http/https/file), then click Rescan.');
      render([]);
      return;
    }
    const res = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scanAndExtract });
    candidates = (res && res[0] && res[0].result) || [];
    render(candidates);
    setStatus(candidates.length
      ? `${candidates.length} data set${candidates.length > 1 ? 's' : ''} found — pick one to export.`
      : 'No tables or lists found on this page.');
  } catch (e) {
    console.error('Page to CSV scan failed:', e);
    setStatus('Could not read this page (browser system pages are blocked). Try a normal website.');
    render([]);
  }
}

/* ---------- Events ---------- */
resultsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const idx = Number(btn.dataset.idx);
  if (btn.dataset.act === 'download') downloadCSV(idx);
  else if (btn.dataset.act === 'copy') copyCSV(idx);
});
document.getElementById('rescan').addEventListener('click', scan);
document.addEventListener('DOMContentLoaded', scan);
