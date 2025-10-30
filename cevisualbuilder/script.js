/* =========================================================
   ConditionalEvents Visual Builder — Data-Driven version
   Cómo agregar bloques rápido:
   1) Agrega tu bloque en REGISTRY[kind][subtype] con:
      - label: texto en la UI
      - className: ev | cond | msg | cmd | danger | setting
      - defaults: datos iniciales (objeto)
      - render(bodyEl, block, update): pinta controles y llama a update() cuando cambien
      - toYAML(block): devuelve string YAML (acción) o condición (sin prefijo)
      - settingKey (opcional): si es un "setting", qué clave escribir (p.ej. 'repetitive_time')
   2) La paleta, el render y el YAML se actualizan solos. Disfruta :D
   ========================================================= */

const state = { events: [], dragData: null };
const canvas = document.getElementById('canvas');
const ymlOut = document.getElementById('yml');
const appEl = document.querySelector('.app');
const yamlPanel = document.getElementById('yamlPanel');
const yamlShowBtn = document.getElementById('yamlShowBtn');

const MIN_WIDTH = 980;
document.getElementById('minWidthText').textContent = MIN_WIDTH + ' px';

const uid = () => Math.random().toString(36).slice(2, 9);
const escQ = s => String(s ?? '').replace(/'/g, "''");

/* ---------- REGISTRY (edita aquí para agregar bloques) ---------- */
const REGISTRY = {
  eventType: {
    block_interact: { label:'Block Interact', className:'ev' },
    player_attack:  { label:'Player Attack',  className:'ev' },
    player_command: { label:'Player Command', className:'ev' },
    repetitive:     { label:'Repetitive',     className:'ev' },
  },

  condition: {
    basic_condition: {
      label:'Add Condition',
      className:'cond',
      defaults: { left:'%block%', op:'==', right:'STONE_BUTTON' },
      render(body, block, update){
        body.innerHTML = `
          <div class="row">
            <input type="text" value="${block.data.left}" title="Variable/placeholder (ej: %block%)" />
            <select>
              ${['==','!=','>=','<=','>','<','contains','equals'].map(op=>`<option ${block.data.op===op?'selected':''}>${op}</option>`).join('')}
            </select>
            <input type="text" value="${block.data.right}" title="Valor (ej: STONE_BUTTON)" />
          </div>`;
        const [left, sel, right] = body.querySelectorAll('input, select');
        left.addEventListener('input', e=>{ block.data.left = e.target.value; update(); });
        sel.addEventListener('change', e=>{ block.data.op   = e.target.value; update(); });
        right.addEventListener('input',e=>{ block.data.right= e.target.value; update(); });
      },
      toYAML(block){ return `'${block.data.left} ${block.data.op} ${block.data.right}'`; }
    }
  },

  action: {
    send_message: {
      label:'Send Message', className:'msg',
      defaults:{ text:'Mensaje aquí…' },
      render(body, block, update){
        body.innerHTML = `<div class="row single"><input type="text" value="${block.data.text}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.text = e.target.value; update(); });
      },
      toYAML(block){ return `'message: ${escQ(block.data.text)}'`; }
    },
    console_command: {
      label:'Console Command', className:'cmd',
      defaults:{ cmd:'say Hello' },
      render(body, block, update){
        body.innerHTML = `<div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'console_command: ${escQ(block.data.cmd)}'`; }
    },
    cancel_event: {
      label:'Cancel Event', className:'danger',
      defaults:{ value:true },
      render(body, block, update){
        body.innerHTML = `<div class="row two">
            <label style="opacity:.8; align-self:center;">Cancelar este evento</label>
            <select>
              <option ${block.data.value?'selected':''} value="true">true</option>
              <option ${!block.data.value?'selected':''} value="false">false</option>
            </select>
          </div>`;
        body.querySelector('select').addEventListener('change', e=>{ block.data.value = (e.target.value==='true'); update(); });
      },
      toYAML(block){ return `'cancel_event: ${block.data.value ? 'true':'false'}'`; }
    },
    kick: {
      label:'Kick Player', className:'danger',
      defaults:{ reason:'&cWhat are you trying to do?' },
      render(body, block, update){
        body.innerHTML = `<div class="row single"><input type="text" value="${block.data.reason}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.reason = e.target.value; update(); });
      },
      toYAML(block){ return `'kick: ${escQ(block.data.reason)}'`; }
    },
    to_target: {
      label:'To Target → Action', className:'msg',
      defaults:{ innerType:'message', value:'&cYou were poisoned by &e%player%&c!' },
      render(body, block, update){
        body.innerHTML = `<div class="row two">
            <select>
              ${['message','give_potion_effect','console_command','playsound','title'].map(t=>`<option ${block.data.innerType===t?'selected':''}>${t}</option>`).join('')}
            </select>
            <input type="text" value="${block.data.value}" />
          </div>
          <small style="opacity:.8">Formato: <code>to_target: &lt;acción&gt;: &lt;valor&gt;</code></small>`;
        const [sel, inp] = body.querySelectorAll('select, input');
        sel.addEventListener('change', e=>{ block.data.innerType = e.target.value; update(); });
        inp.addEventListener('input',  e=>{ block.data.value    = e.target.value; update(); });
      },
      toYAML(block){ return `'to_target: ${block.data.innerType}: ${escQ(block.data.value)}'`; }
    }
  },

  setting: {
    repetitive_time: {
      label:'Repetitive Time', className:'setting',
      defaults:{ ticks:20 },
      settingKey:'repetitive_time',
      render(body, block, update){
        body.innerHTML = `<div class="row single">
          <input type="number" min="1" step="1" value="${block.data.ticks}" title="Ticks (20 = 1s)" />
        </div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.ticks = parseInt(e.target.value||'0',10); update(); });
      }
    },
    ignore_with_permission: {
      label:'Ignore With Permission', className:'setting',
      defaults:{ perm:'conditionalevents.ignore.example' },
      settingKey:'ignore_with_permission',
      render(body, block, update){
        body.innerHTML = `<div class="row single"><input type="text" value="${block.data.perm}" placeholder="conditionalevents.ignore.<id>" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.perm = e.target.value; update(); });
      }
    }
  }
};

/* ---------- Helpers ---------- */
window.addEventListener("beforeunload", (e) => {
  if (state.events.length > 0) {
    e.preventDefault();
    e.returnValue = "Si recargas la página, perderás todos los datos del builder.";
    return e.returnValue;
  }
});

function buildPalette(){
  const palette = document.getElementById('palette');
  palette.innerHTML = '';

  const sections = [
    ['Event Types','eventType'],
    ['Conditions','condition'],
    ['Actions','action'],
    ['Settings','setting'],
  ];

  for (const [title, kind] of sections){
    const sec = document.createElement('div');
    sec.className = 'palette-section';
    sec.innerHTML = `<div class="palette-title">${title}</div>`;
    Object.entries(REGISTRY[kind]).forEach(([subtype, meta])=>{
      const chip = document.createElement('div');
      chip.className = `chip ${meta.className}`;
      chip.textContent = meta.label;
      chip.dataset.kind = kind;
      chip.dataset.subtype = subtype;
      chip.setAttribute('draggable','true');
      sec.appendChild(chip);
    });
    palette.appendChild(sec);
  }

  setupDragAndTouch(); // enganchar DnD/touch a los chips creados
}

function blockLabel(kind, subtype){ return REGISTRY[kind]?.[subtype]?.label || subtype; }
function blockClass(kind, subtype){ return REGISTRY[kind]?.[subtype]?.className || 'ev'; }

function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

/* ---------- Event CRUD ---------- */
document.getElementById('newEventBtn').addEventListener('click', () => {
  const id = uid();
  const evt = { id, name: `example${state.events.length+1}`, type: null, blocks: [], settings: {} };
  state.events.push(evt);
  render();
});

function removeEventCompletely(eventId){
  const idx = state.events.findIndex(e => e.id === eventId);
  if (idx === -1) return;
  state.events.splice(idx, 1);
  render();
}

/* ---------- Drag & Drop (desktop + touch) ---------- */
function setupDragAndTouch(){
  const palette = document.getElementById('palette');

  // Desktop native DnD
  palette.querySelectorAll('.chip').forEach(chip => chip.setAttribute('draggable','true'));
  palette.addEventListener('dragstart', (e) => {
    const el = e.target.closest('.chip');
    if(!el) return;
    const payload = { kind: el.dataset.kind, subtype: el.dataset.subtype };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
    el.classList.add('dragging');
  });
  palette.addEventListener('dragend', (e) => { e.target.closest('.chip')?.classList.remove('dragging'); });

  // Touch
  let touchedChip = null;
  palette.addEventListener('touchstart', (e) => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    touchedChip = chip;
    state.dragData = { kind: chip.dataset.kind, subtype: chip.dataset.subtype };
    chip.classList.add('dragging');
    e.preventDefault();
  }, { passive:false });

  palette.addEventListener('touchmove', (e) => {
    if(!touchedChip) return; e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.zone').forEach(z => z.classList.remove('over'));
    el?.closest('.zone')?.classList.add('over');
  }, { passive:false });

  palette.addEventListener('touchend', (e) => {
    if(!touchedChip || !state.dragData) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const zone = el?.closest('.zone');
    if(zone){
      const eventCard = zone.closest('.event-card');
      const eventId = eventCard?.dataset.eventId;
      if(eventId){ addBlock(eventId, state.dragData.kind, state.dragData.subtype); }
    }
    touchedChip.classList.remove('dragging');
    document.querySelectorAll('.zone').forEach(z => z.classList.remove('over'));
    touchedChip = null; state.dragData = null;
  });
  palette.addEventListener('touchcancel', () => {
    touchedChip?.classList.remove('dragging');
    document.querySelectorAll('.zone').forEach(z => z.classList.remove('over'));
    touchedChip = null; state.dragData = null;
  });
}

function createZone(ev){
  const z = document.createElement('div');
  z.className = 'zone';
  z.addEventListener('dragover', (e)=>{ e.preventDefault(); e.dataTransfer.dropEffect='copy'; z.classList.add('over'); });
  z.addEventListener('dragleave', ()=> z.classList.remove('over'));
  z.addEventListener('drop', (e)=>{
    e.preventDefault(); z.classList.remove('over');
    try {
      const {kind, subtype} = JSON.parse(e.dataTransfer.getData('application/json'));
      addBlock(ev.id, kind, subtype);
    } catch(err){ console.warn(err); }
  });
  return z;
}

function addBlock(eventId, kind, subtype){
  const ev = state.events.find(x=>x.id===eventId);
  if(!ev) return;
  if(kind==='eventType'){
    ev.type = subtype;
  } else {
    const meta = REGISTRY[kind]?.[subtype];
    if(!meta){ console.warn('Unknown block', kind, subtype); return; }
    ev.blocks.push({ id: uid(), kind, subtype, data: deepClone(meta.defaults || {}) });
  }
  render();
}

function removeBlock(eventId, blockId){
  const ev = state.events.find(x=>x.id===eventId);
  if(!ev) return;
  ev.blocks = ev.blocks.filter(b=>b.id!==blockId);
  render();
}

function moveBlock(eventId, blockId, dir){
  const ev = state.events.find(x=>x.id===eventId);
  if(!ev) return;
  const i = ev.blocks.findIndex(b=>b.id===blockId);
  const j = i + (dir==='up'?-1:1);
  if(i<0 || j<0 || j>=ev.blocks.length) return;
  [ev.blocks[i], ev.blocks[j]] = [ev.blocks[j], ev.blocks[i]];
  render();
}

/* ---------- Render ---------- */
function render(){
  canvas.innerHTML = '';
  state.events.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.dataset.eventId = ev.id;

    const head = document.createElement('div');
    head.className = 'event-top';
    head.innerHTML = `
      <input class="event-name" value="${ev.name}" title="Nombre del evento" />
      <div class="event-type">
        ${ev.type ? ('Event: '+ (REGISTRY.eventType[ev.type]?.label || ev.type)) : '<em>Arrastra un tipo de Event aquí</em>'}
        <button class="icon-btn danger event-del" title="Eliminar evento" aria-label="Eliminar evento">🗑</button>
      </div>`;
    head.querySelector('.event-del').addEventListener('click', ()=>{
      if (confirm(`¿Eliminar el evento "${ev.name}"?`)) removeEventCompletely(ev.id);
    });
    head.querySelector('.event-name').addEventListener('input', (e)=>{ ev.name = e.target.value; updateYAML(); });
    card.appendChild(head);

    const zone = createZone(ev);

    ev.blocks.forEach(b => {
      const meta = REGISTRY[b.kind]?.[b.subtype];
      const block = document.createElement('div');
      block.className = `block ${blockClass(b.kind, b.subtype)}`;
      const title = meta?.label || b.subtype;
      block.innerHTML = `<div class="block-head">
          <div>${title}</div>
          <div class="tools">
            <button class="icon-btn" title="Subir">▲</button>
            <button class="icon-btn" title="Bajar">▼</button>
            <button class="icon-btn" title="Eliminar">🗑</button>
          </div>
        </div>`;

      const body = document.createElement('div');
      body.className = 'block-body';
      // Render específico desde el registry
      meta?.render?.(body, b, updateYAML);
      block.appendChild(body);

      const [up,down,del] = block.querySelectorAll('.icon-btn');
      up.addEventListener("click", ()=>moveBlock(ev.id,b.id,'up'));
      down.addEventListener("click", ()=>moveBlock(ev.id,b.id,'down'));
      del.addEventListener("click", ()=>removeBlock(ev.id,b.id));

      zone.appendChild(block);
    });

    const dropHelp = document.createElement('div');
    dropHelp.style.opacity = .7;
    dropHelp.style.fontSize = '12px';
    dropHelp.style.marginTop = '6px';
    dropHelp.textContent = 'Arrastra más bloques aquí…';
    zone.appendChild(dropHelp);

    card.appendChild(zone);
    canvas.appendChild(card);
  });

  updateYAML();
}

/* ---------- YAML ---------- */
function buildYAML(){
  const lines = [];
  lines.push('events:');
  state.events.forEach(ev => {
    const ename = (ev.name||'event').replace(/:/g,'').trim() || 'event';
    lines.push(`  ${ename}:`);
    lines.push(`    type: ${ev.type || 'repetitive'}`);

    // settings
    const settings = {};
    ev.blocks.forEach(b=>{
      const meta = REGISTRY[b.kind]?.[b.subtype];
      if(meta?.settingKey){
        settings[meta.settingKey] = ('ticks' in b.data) ? b.data.ticks
                             : ('perm' in b.data) ? b.data.perm
                             : b.data;
      }
    });
    if(settings.repetitive_time !== undefined) lines.push(`    repetitive_time: ${settings.repetitive_time}`);
    if(settings.ignore_with_permission)       lines.push(`    ignore_with_permission: ${settings.ignore_with_permission}`);

    // conditions
    const conds = ev.blocks.filter(b=>b.kind==='condition').map(b=>{
      const meta = REGISTRY.condition[b.subtype];
      return meta?.toYAML ? meta.toYAML(b) : `'TODO condition'`;
    });
    if(conds.length){
      lines.push('    conditions:');
      conds.forEach(c => lines.push(`      - ${c}`));
    }

    // actions
    const acts = ev.blocks.filter(b=>b.kind==='action').map(b=>{
      const meta = REGISTRY.action[b.subtype];
      return meta?.toYAML ? meta.toYAML(b) : `'message: TODO'`;
    });

    lines.push('    actions:');
    lines.push('      default:');
    if(acts.length) acts.forEach(a => lines.push(`      - ${a}`));
    else lines.push('      - "message: &7No actions configured."');
  });
  return lines.join('\n');
}
function updateYAML(){ ymlOut.textContent = buildYAML(); }

/* ---------- YAML panel responsive ---------- */
function isMobileLandscape(){ return window.matchMedia('(max-width: 1024px)').matches && window.matchMedia('(orientation: landscape)').matches; }
function collapseYAML(){
  yamlPanel.classList.add('hidden');
  yamlPanel.classList.remove('overlay');
  appEl.classList.add('yaml-collapsed');
  yamlShowBtn.style.display='inline-flex';
}
function expandYAML(){
  if(isMobileLandscape()){
    yamlPanel.classList.remove('hidden');
    yamlPanel.classList.add('overlay');
    yamlShowBtn.style.display='none';
    appEl.classList.add('yaml-collapsed');
  }else{
    yamlPanel.classList.remove('hidden','overlay');
    appEl.classList.remove('yaml-collapsed');
    yamlShowBtn.style.display='none';
  }
}
function applyResponsiveYAML(){
  if(isMobileLandscape()){ collapseYAML(); }
  else if(yamlPanel.classList.contains('overlay')) yamlPanel.classList.remove('overlay');
}
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && yamlPanel.classList.contains('overlay')) collapseYAML(); });
document.getElementById('collapseBtn').addEventListener('click', collapseYAML);
yamlShowBtn.addEventListener('click', expandYAML);
window.addEventListener('resize', applyResponsiveYAML);
window.addEventListener('orientationchange', applyResponsiveYAML);

/* ---------- Screen Guard ---------- */
const guardEl = document.getElementById('screenGuard');
function isPortrait(){ return window.matchMedia('(orientation: portrait)').matches; }
function isMobileUA(){ return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia('(pointer: coarse)').matches; }
function shouldShowGuard(){
  const mobile = isMobileUA();
  const portrait = isPortrait();
  const narrow = window.innerWidth < MIN_WIDTH;
  return (mobile && portrait) || (!mobile && narrow);
}
function updateScreenGuard(){
  const show = shouldShowGuard();
  guardEl.classList.toggle('hidden', !show);
  document.body.style.overflow = show ? 'hidden' : '';
  if (show && !yamlPanel.classList.contains('hidden')) collapseYAML();
}
window.addEventListener('resize', updateScreenGuard);
window.addEventListener('orientationchange', updateScreenGuard);

/* ---------- Copy / Download ---------- */
document.getElementById('copyBtn').addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(ymlOut.textContent); alert('YAML copiado ✅'); }catch(e){ alert('No se pudo copiar'); }
});
document.getElementById('downloadBtn').addEventListener('click', ()=>{
  const blob = new Blob([ymlOut.textContent], {type:'text/yaml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'events.yml';
  document.body.appendChild(a); a.click(); a.remove();
});

/* ---------- Boot ---------- */
buildPalette();                  // genera los chips desde REGISTRY
document.getElementById('newEventBtn').click(); // seed
const first = state.events[0].id;
addBlock(first,'eventType','block_interact');
addBlock(first,'condition','basic_condition');
addBlock(first,'condition','basic_condition');
addBlock(first,'action','send_message');
applyResponsiveYAML();
updateScreenGuard();