const $ = id => document.getElementById(id);

const els = {
  upload: $('btnUpload'),
  clear: $('btnClear'),
  file: $('file'),
  list: $('list'),
  empty: $('empty'),
  banner: $('banner'),
  q: $('q'),
  makeFilter: $('makeFilter'),
  modelFilter: $('modelFilter'),
  lowBtn: $('btnLowOnly'),
  statItems: $('statItems'),
  statMakes: $('statMakes'),
  statModels: $('statModels')
};

const STORE = 'guntrader_stock_final';
let rows = [];
let view = [];
let lowOnly = false;

/* HELPERS */
const clean = v => String(v ?? '').replace(/\u00A0/g,' ').trim();
const norm = v => clean(v).toLowerCase();
const normSearch = v => norm(v).replace(/[\s\-_.]/g,'');
const isNew = r => norm(r.Condition).includes('new');
const badgeClass = n => n===1?'bad':n===2?'warn':'ok';

/* CSV PARSE */
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  const h = lines.findIndex(l=>l.toLowerCase().includes('stock')&&l.toLowerCase().includes('condition'));
  if(h<0) return [];
  const heads = lines[h].split(',').map(h=>h.toLowerCase());
  const idx = {
    Make: heads.findIndex(h=>h.includes('make')),
    Model: heads.findIndex(h=>h.includes('model')),
    Calibre: heads.findIndex(h=>h.includes('cal')),
    Condition: heads.findIndex(h=>h.includes('condition'))
  };
  return lines.slice(h+1).map(l=>{
    const c=l.split(',');
    return {
      Make: clean(c[idx.Make]),
      Model: clean(c[idx.Model]),
      Calibre: clean(c[idx.Calibre]),
      Condition: clean(c[idx.Condition])
    };
  }).filter(r=>r.Make&&r.Model&&r.Calibre);
}

/* BUILD VIEW */
function buildView(){
  view = rows.filter(isNew);
  buildMakeFilter();
  buildModelFilter();
}

function buildMakeFilter(){
  const makes=[...new Set(view.map(r=>r.Make))].sort();
  els.makeFilter.innerHTML='<option value="">All Makes</option>'+makes.map(m=>`<option>${m}</option>`).join('');
}

function buildModelFilter(){
  const mk=els.makeFilter.value;
  const models=[...new Set(view.filter(r=>!mk||r.Make===mk).map(r=>r.Model))].sort();
  els.modelFilter.innerHTML='<option value="">All Models</option>'+models.map(m=>`<option>${m}</option>`).join('');
}

/* STATS */
function updateStats(data){
  els.statItems.textContent=data.length;
  els.statMakes.textContent=new Set(data.map(r=>r.Make)).size;
  els.statModels.textContent=new Set(data.map(r=>r.Make+'|'+r.Model)).size;
}

/* RENDER */
function render(){
  els.list.innerHTML='';
  if(!view.length){els.empty.classList.remove('hidden');return;}
  els.empty.classList.add('hidden');

  let data=view;
  if(els.makeFilter.value) data=data.filter(r=>r.Make===els.makeFilter.value);
  if(els.modelFilter.value) data=data.filter(r=>r.Model===els.modelFilter.value);
  if(els.q.value) data=data.filter(r=>normSearch(`${r.Make}${r.Model}${r.Calibre}`).includes(normSearch(els.q.value)));

  updateStats(data);

  const grouped={};
  data.forEach(r=>{
    grouped[r.Make]??={};
    grouped[r.Make][r.Model]??={};
    grouped[r.Make][r.Model][r.Calibre]=(grouped[r.Make][r.Model][r.Calibre]||0)+1;
  });

  Object.entries(grouped).forEach(([make,models])=>{
    const makeEl=document.createElement('div');
    makeEl.className='make';
    makeEl.innerHTML=`<div class="make-head">${make}</div>`;
    const body=document.createElement('div');
    body.className='make-body';

    Object.entries(models).forEach(([model,cals])=>{
      const modelEl=document.createElement('div');
      modelEl.className='model';
      modelEl.innerHTML=`<div class="model-title">${model}</div>`;
      let shown=false;

      Object.entries(cals).forEach(([cal,count])=>{
        if(lowOnly&&count>2) return;
        const line=document.createElement('div');
        line.className='line';
        line.innerHTML=`<span>${cal}</span><span class="badge ${badgeClass(count)}">${count} in stock</span>`;
        modelEl.appendChild(line);
        shown=true;
      });

      if(shown) body.appendChild(modelEl);
    });

    if(body.children.length){
      makeEl.appendChild(body);
      makeEl.querySelector('.make-head').onclick=()=>makeEl.classList.toggle('open');
      els.list.appendChild(makeEl);
    }
  });
}

/* EVENTS */
els.upload.onclick=()=>{els.file.value='';els.file.click();};
els.file.onchange=e=>{
  const f=e.target.files[0];
  if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    rows=parseCSV(r.result);
    localStorage.setItem(STORE,JSON.stringify(rows));
    buildView();
    render();
    els.banner.textContent='CSV loaded — NEW stock only';
    els.banner.classList.remove('hidden');
  };
  r.readAsText(f);
};

els.clear.onclick=()=>{
  localStorage.removeItem(STORE);
  rows=[];view=[];
  render();
  els.banner.classList.add('hidden');
};

els.makeFilter.onchange=()=>{buildModelFilter();render();};
els.modelFilter.onchange=render;
els.q.oninput=render;

els.lowBtn.onclick=()=>{
  lowOnly=!lowOnly;
  els.lowBtn.textContent=lowOnly?'Showing Low Stock Only':'Show Low Stock Only';
  render();
};

/* INIT */
const saved=localStorage.getItem(STORE);
if(saved){
  rows=JSON.parse(saved);
  buildView();
  render();
}
