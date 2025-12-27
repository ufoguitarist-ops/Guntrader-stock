const $ = id => document.getElementById(id);

/* ---------- DOM ---------- */
const els = {
  upload: $('btnUpload'),
  clear: $('btnClear'),
  makeFilter: $('makeFilter'),
  modelFilter: $('modelFilter'),
  lowOnly: $('btnLowOnly'),

  totalItems: $('totalItems'),
  totalMakes: $('totalMakes'),
  totalModels: $('totalModels'),

  search: $('search'),
  breakdown: $('breakdown')
};

/* ---------- STATE ---------- */
let rows = [];
let showLowOnly = false;

/* ---------- HELPERS ---------- */
const normalise = v =>
  String(v ?? '')
    .replace(/"/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();

const isNew = r =>
  String(r.Condition || '').toLowerCase().includes('new');

/* ---------- CSV PARSE (GUNTRADER SAFE) ---------- */
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];

  const headers = lines[0].split(',').map(h => h.toLowerCase());

  return lines.slice(1).map(row => {
    const v = row.split(',');
    const o = {};

    headers.forEach((h, i) => {
      if (h.includes('make')) o.Make = normalise(v[i]);
      if (h.includes('model')) o.Model = normalise(v[i]);
      if (h.includes('cal')) o.Calibre = normalise(v[i]);
      if (h.includes('condition')) o.Condition = normalise(v[i]);
    });

    return o;
  }).filter(r => r.Make && r.Model);
}

/* ---------- BUILD FILTERS ---------- */
function buildFilters(){
  const makes = [...new Set(rows.map(r => r.Make))].sort();
  els.makeFilter.innerHTML =
    `<option value="">All Makes</option>` +
    makes.map(m => `<option value="${m}">${m}</option>`).join('');

  els.modelFilter.innerHTML = `<option value="">All Models</option>`;
}

/* ---------- UPDATE MODEL FILTER ---------- */
function updateModelFilter(){
  const make = els.makeFilter.value;
  const models = [...new Set(
    rows.filter(r => !make || r.Make === make).map(r => r.Model)
  )].sort();

  els.modelFilter.innerHTML =
    `<option value="">All Models</option>` +
    models.map(m => `<option value="${m}">${m}</option>`).join('');
}

/* ---------- FILTERED DATA ---------- */
function filtered(){
  const mk = els.makeFilter.value;
  const md = els.modelFilter.value;
  const q  = els.search.value.toLowerCase().replace(/\s+/g, '');

  return rows.filter(r => {
    if (!isNew(r)) return false;
    if (mk && r.Make !== mk) return false;
    if (md && r.Model !== md) return false;

    const text = `${r.Make}${r.Model}${r.Calibre}`.toLowerCase().replace(/\s+/g,'');
    if (q && !text.includes(q)) return false;

    return true;
  });
}

/* ---------- RENDER DASHBOARD ---------- */
function render(){
  const data = filtered();

  els.totalItems.textContent = data.length;
  els.totalMakes.textContent = new Set(data.map(r => r.Make)).size;
  els.totalModels.textContent = new Set(data.map(r => r.Model)).size;

  const grouped = {};

  data.forEach(r => {
    grouped[r.Model] ??= {};
    grouped[r.Model][r.Calibre] = (grouped[r.Model][r.Calibre] || 0) + 1;
  });

  let html = '';
  Object.keys(grouped).sort().forEach(model => {
    html += `<div class="model-block"><div class="model-name">${model}</div>`;
    Object.entries(grouped[model]).forEach(([cal, count]) => {
      let cls = count === 1 ? 'last' : count === 2 ? 'low' : 'ok';
      if (showLowOnly && count > 2) return;
      html += `
        <div class="cal-line ${cls}">
          <span>${cal}</span>
          <span>${count} in stock</span>
        </div>`;
    });
    html += `</div>`;
  });

  els.breakdown.innerHTML = html || `<div class="empty">No results</div>`;
}

/* ---------- EVENTS ---------- */
els.upload.onclick = () => $('file').click();

$('file').onchange = e => {
  const f = e.target.files[0];
  if (!f) return;

  const reader = new FileReader();
  reader.onload = () => {
    rows = parseCSV(reader.result);
    buildFilters();
    updateModelFilter();
    render();
  };
  reader.readAsText(f);
};

els.makeFilter.onchange = () => {
  updateModelFilter();
  render();
};

els.modelFilter.onchange = render;
els.search.oninput = render;

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
