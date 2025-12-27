const $ = id => document.getElementById(id);

/* ---------- DOM ---------- */
const els = {
  upload: $('btnUpload'),
  clear: $('btnClear'),
  lowOnly: $('btnLowOnly'),
  file: $('file'),
  makeFilter: $('makeFilter'),
  modelFilter: $('modelFilter'),
  totalItems: $('totalItems'),
  totalMakes: $('totalMakes'),
  totalModels: $('totalModels'),
  breakdown: $('breakdown')
};

/* ---------- STATE ---------- */
let rows = [];
let showLowOnly = false;

/* ---------- HELPERS ---------- */
const norm = v =>
  String(v ?? '')
    .replace(/"/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isNew = r =>
  norm(r.Condition).toLowerCase().includes('new') || !r.Condition;

/* ---------- CSV PARSER (GUNTRADER SAFE) ---------- */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];

  // detect delimiter
  const delim = lines[0].includes(';') ? ';' : ',';

  // find header row
  const headerIndex = lines.findIndex(l =>
    /make/i.test(l) && /model/i.test(l)
  );
  if (headerIndex < 0) return [];

  const headers = lines[headerIndex]
    .split(delim)
    .map(h => h.toLowerCase());

  return lines.slice(headerIndex + 1).map(line => {
    const v = line.split(delim);
    const o = {};

    headers.forEach((h, i) => {
      if (h.includes('make')) o.Make = norm(v[i]);
      if (h.includes('model')) o.Model = norm(v[i]);
      if (h.includes('cal')) o.Calibre = norm(v[i]);
      if (h.includes('condition')) o.Condition = norm(v[i]);
    });

    return o;
  }).filter(r => r.Make && r.Model && isNew(r));
}

/* ---------- FILTER BUILD ---------- */
function buildFilters() {
  const makes = [...new Set(rows.map(r => r.Make))].sort();
  els.makeFilter.innerHTML =
    '<option value="">All Makes</option>' +
    makes.map(m => `<option value="${m}">${m}</option>`).join('');
  updateModelFilter();
}

function updateModelFilter() {
  const make = els.makeFilter.value;
  const models = [...new Set(
    rows.filter(r => !make || r.Make === make).map(r => r.Model)
  )].sort();

  els.modelFilter.innerHTML =
    '<option value="">All Models</option>' +
    models.map(m => `<option value="${m}">${m}</option>`).join('');
}

/* ---------- RENDER ---------- */
function render() {
  const data = rows.filter(r => {
    if (els.makeFilter.value && r.Make !== els.makeFilter.value) return false;
    if (els.modelFilter.value && r.Model !== els.modelFilter.value) return false;
    return true;
  });

  els.totalItems.textContent = data.length;
  els.totalMakes.textContent = new Set(data.map(r => r.Make)).size;
  els.totalModels.textContent = new Set(data.map(r => r.Model)).size;

  const grouped = {};
  data.forEach(r => {
    grouped[r.Model] ??= {};
    grouped[r.Model][r.Calibre || '—'] =
      (grouped[r.Model][r.Calibre || '—'] || 0) + 1;
  });

  let html = '';
  Object.keys(grouped).sort().forEach(model => {
    html += `<div class="model-block">
      <div class="model-name">${model}</div>`;
    Object.entries(grouped[model]).forEach(([cal, count]) => {
      if (showLowOnly && count > 2) return;
      const cls = count === 1 ? 'last' : count === 2 ? 'low' : 'ok';
      html += `<div class="cal-line ${cls}">
        <span>${cal}</span><span>${count} in stock</span>
      </div>`;
    });
    html += '</div>';
  });

  els.breakdown.innerHTML = html || '<p>No stock</p>';
}

/* ---------- EVENTS ---------- */
els.upload.onclick = () => {
  els.file.value = '';
  els.file.click();
};

els.file.onchange = e => {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = () => {
    rows = parseCSV(r.result);
    buildFilters();
    render();
  };
  r.readAsText(f);
};

els.makeFilter.onchange = () => {
  updateModelFilter();
  render();
};

els.modelFilter.onchange = render;

els.lowOnly.onclick = () => {
  showLowOnly = !showLowOnly;
  els.lowOnly.classList.toggle('active', showLowOnly);
  render();
};

els.clear.onclick = () => {
  rows = [];
  els.breakdown.innerHTML = '';
  els.totalItems.textContent = 0;
  els.totalMakes.textContent = 0;
  els.totalModels.textContent = 0;
};
