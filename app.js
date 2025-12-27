const $ = id => document.getElementById(id);

/* ---------- DOM ---------- */
const els = {
  upload: $('btnUpload'),
  clear: $('btnClear'),
  file: $('file'),

  makeFilter: $('makeFilter'),
  modelFilter: $('modelFilter'),
  lowOnly: $('btnLowOnly'),

  statItems: $('statItems'),
  statMakes: $('statMakes'),
  statModels: $('statModels'),

  list: $('stockList')
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

const cleanKey = v =>
  normalise(v).toLowerCase().replace(/\s+/g, '');

/* ✅ FIXED NEW CHECK (Guntrader-safe) */
const isNew = r => {
  const c = normalise(r.Condition).toLowerCase();
  return c.includes('new') || c === '';
};

/* ---------- CSV PARSE ---------- */
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headerRow = lines.findIndex(l => /make/i.test(l) && /model/i.test(l));
  if (headerRow < 0) return [];

  const headers = lines[headerRow].split(',');

  return lines.slice(headerRow + 1).map(row => {
    const v = row.split(',');
    const o = {};
    headers.forEach((h,i) => {
      const k = h.toLowerCase();
      if (k.includes('make')) o.Make = normalise(v[i]);
      if (k.includes('model')) o.Model = normalise(v[i]);
      if (k.includes('cal')) o.Calibre = normalise(v[i]);
      if (k.includes('condition')) o.Condition = normalise(v[i]);
    });
    return o;
  }).filter(r => r.Make && r.Model);
}

/* ---------- GROUP STOCK ---------- */
function buildStock(){
  const grouped = {};
  rows.forEach(r => {
    if (!isNew(r)) return;

    const make = r.Make;
    const model = r.Model;
    const cal = r.Calibre || '—';

    grouped[make] ??= {};
    grouped[make][model] ??= {};
    grouped[make][model][cal] = (grouped[make][model][cal] || 0) + 1;
  });
  return grouped;
}

/* ---------- FILTERS ---------- */
function populateFilters(grouped){
  els.makeFilter.innerHTML =
    '<option value="">All Makes</option>' +
    Object.keys(grouped).sort().map(m =>
      `<option value="${m}">${m}</option>`
    ).join('');

  els.modelFilter.innerHTML = '<option value="">All Models</option>';
}

/* ---------- RENDER ---------- */
function render(){
  const grouped = buildStock();
  const makeSel = els.makeFilter.value;
  const modelSel = els.modelFilter.value;

  els.list.innerHTML = '';

  let itemCount = 0;
  const makeSet = new Set();
  const modelSet = new Set();

  Object.keys(grouped).sort().forEach(make => {
    if (makeSel && make !== makeSel) return;

    Object.keys(grouped[make]).sort().forEach(model => {
      if (modelSel && model !== modelSel) return;

      const lines = grouped[make][model];
      const total = Object.values(lines).reduce((a,b)=>a+b,0);

      Object.entries(lines).forEach(([cal,count]) => {
        if (showLowOnly && count > 2) return;

        itemCount++;
        makeSet.add(make);
        modelSet.add(model);

        const status =
          count === 1 ? 'last' :
          count === 2 ? 'low' : 'ok';

        els.list.insertAdjacentHTML('beforeend', `
          <div class="stock-row ${status}">
            <div class="title">${model}</div>
            <div class="meta">${make} · ${cal}</div>
            <div class="qty">${count} IN STOCK</div>
          </div>
        `);
      });
    });
  });

  els.statItems.textContent = itemCount;
  els.statMakes.textContent = makeSet.size;
  els.statModels.textContent = modelSet.size;
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
    localStorage.setItem('gt_rows', JSON.stringify(rows));
    populateFilters(buildStock());
    render();
  };
  r.readAsText(f);
};

els.clear.onclick = () => {
  localStorage.clear();
  location.reload();
};

els.makeFilter.onchange = () => {
  const grouped = buildStock();
  const make = els.makeFilter.value;

  els.modelFilter.innerHTML =
    '<option value="">All Models</option>' +
    (make && grouped[make]
      ? Object.keys(grouped[make]).sort().map(m =>
          `<option value="${m}">${m}</option>`
        ).join('')
      : '');

  render();
};

els.modelFilter.onchange = render;

els.lowOnly.onclick = () => {
  showLowOnly = !showLowOnly;
  els.lowOnly.classList.toggle('active', showLowOnly);
  render();
};

/* ---------- INIT ---------- */
const saved = localStorage.getItem('gt_rows');
if (saved) {
  rows = JSON.parse(saved);
  populateFilters(buildStock());
  render();
}
