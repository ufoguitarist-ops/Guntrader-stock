const $ = id => document.getElementById(id);

/* ---------- DOM ---------- */
const els = {
  upload: $('btnUpload'),
  file: $('file'),
  makeFilter: $('makeFilter'),
  modelFilter: $('modelFilter'),

  list: $('stockList'),
  banner: $('banner')
};

/* ---------- STATE ---------- */
let rows = [];

/* ---------- HELPERS ---------- */
const normalise = v =>
  String(v || '')
    .replace(/"/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isNew = r =>
  normalise(r.Condition).toLowerCase() === 'new';

/* ---------- CSV PARSE ---------- */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headerIndex = lines.findIndex(l =>
    /stock/i.test(l) && /make/i.test(l) && /condition/i.test(l)
  );
  if (headerIndex < 0) return [];

  const headers = lines[headerIndex].split(',').map(h => h.toLowerCase());

  return lines.slice(headerIndex + 1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      const v = values[i]?.trim();
      if (h.includes('make')) row.Make = normalise(v);
      if (h.includes('model')) row.Model = normalise(v);
      if (h.includes('cal')) row.Calibre = normalise(v);
      if (h.includes('condition')) row.Condition = normalise(v);
    });
    return row;
  }).filter(r => r.Make && r.Model && isNew(r));
}

/* ---------- BUILD FILTERS ---------- */
function buildFilters() {
  const makes = [...new Set(rows.map(r => r.Make))].sort();
  els.makeFilter.innerHTML =
    '<option value="">All Makes</option>' +
    makes.map(m => `<option value="${m}">${m}</option>`).join('');

  els.modelFilter.innerHTML = '<option value="">All Models</option>';
}

/* ---------- RENDER ---------- */
function render() {
  const make = normalise(els.makeFilter.value);
  const model = normalise(els.modelFilter.value);

  const filtered = rows.filter(r =>
    (!make || r.Make === make) &&
    (!model || r.Model === model)
  );

  const grouped = {};
  filtered.forEach(r => {
    grouped[r.Model] ??= {};
    grouped[r.Model][r.Calibre] = (grouped[r.Model][r.Calibre] || 0) + 1;
  });

  let html = '';
  Object.keys(grouped).sort().forEach(modelName => {
    html += `<div class="model-block">
      <div class="model-name">${modelName}</div>`;
    Object.keys(grouped[modelName]).sort().forEach(cal => {
      const qty = grouped[modelName][cal];
      let cls = 'ok';
      if (qty === 2) cls = 'low';
      if (qty === 1) cls = 'critical';

      html += `<div class="cal-line ${cls}">
        <span>${cal}</span>
        <span>${qty} in stock</span>
      </div>`;
    });
    html += '</div>';
  });

  els.list.innerHTML = html || '<p style="opacity:.6">No stock found</p>';
}

/* ---------- EVENTS ---------- */
els.upload.onclick = () => {
  els.file.value = '';
  els.file.click();
};

els.file.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    rows = parseCSV(reader.result);
    localStorage.setItem('guntrader_rows', JSON.stringify(rows));
    buildFilters();
    render();
    els.banner.textContent = 'CSV loaded successfully';
    els.banner.classList.remove('hidden');
  };
  reader.readAsText(file);
};

els.makeFilter.onchange = () => {
  const make = normalise(els.makeFilter.value);
  const models = [...new Set(
    rows.filter(r => !make || r.Make === make).map(r => r.Model)
  )].sort();

  els.modelFilter.innerHTML =
    '<option value="">All Models</option>' +
    models.map(m => `<option value="${m}">${m}</option>`).join('');

  render();
};

els.modelFilter.onchange = render;

/* ---------- INIT ---------- */
(function init() {
  const saved = localStorage.getItem('guntrader_rows');
  if (saved) {
    rows = JSON.parse(saved);
    buildFilters();
    render();
  }
})();
