/* =========================================================
   ConditionalEvents Visual Builder — Data-Driven + Action Groups
   ========================================================= */

const state = { events: [], dragData: null };
const canvas = document.getElementById('canvas');
const ymlOut = document.getElementById('yml');
const appEl = document.querySelector('.app');
const yamlPanel = document.getElementById('yamlPanel');
const yamlShowBtn = document.getElementById('yamlShowBtn');

const MIN_WIDTH = 980;
document.getElementById('minWidthText').textContent = MIN_WIDTH + ' px';

const uid  = () => Math.random().toString(36).slice(2, 9);
const escQ = s => String(s ?? '').replace(/'/g, "''");
const deepClone = o => JSON.parse(JSON.stringify(o));
const slugKey = s => String(s||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'_') || 'group';

/* ---------- REGISTRY (igual que el tuyo; puedes editar aquí para añadir bloques) ---------- */
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

/* ---------- Helpers / UX ---------- */
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
  setupDragAndTouch();
}

/* ---------- Event CRUD (con Action Groups) ---------- */
function newEventSkeleton(name){
  return {
    id: uid(),
    name,
    type: null,
    // condiciones y settings siguen como "blocks" (no-actions)
    blocks: [],
    settings: {},
    // Action Groups vive aparte
    actionGroups: [
      { id: uid(), name: 'default', blocks: [] } // grupo default
    ],
  };
}

document.getElementById('newEventBtn').addEventListener('click', () => {
  const evt = newEventSkeleton(`example${state.events.length+1}`);
  state.events.push(evt);
  render();
});

function removeEventCompletely(eventId){
  const idx = state.events.findIndex(e => e.id === eventId);
  if (idx === -1) return;
  state.events.splice(idx, 1);
  render();
}

/* ---------- Action Groups ops ---------- */
function addActionGroup(eventId, name='group'){
  const ev = state.events.find(e=>e.id===eventId);
  if(!ev) return;
  const base = name === 'default' && ev.actionGroups.some(g=>g.name==='default') ? 'group' : name;
  ev.actionGroups.push({ id: uid(), name: base, blocks: [] });
  render();
}

function removeActionGroup(eventId, groupId){
  const ev = state.events.find(e=>e.id===eventId);
  if(!ev) return;
  if(ev.actionGroups.length<=1) return alert('Debe existir al menos un action group.');
  const idx = ev.actionGroups.findIndex(g=>g.id===groupId);
  if(idx<0) return;
  ev.actionGroups.splice(idx,1);
  render();
}

function moveActionGroup(eventId, groupId, dir){
  const ev = state.events.find(e=>e.id===eventId);
  if(!ev) return;
  const i = ev.actionGroups.findIndex(g=>g.id===groupId);
  const j = i + (dir==='up'?-1:1);
  if(i<0 || j<0 || j>=ev.actionGroups.length) return;
  [ev.actionGroups[i], ev.actionGroups[j]] = [ev.actionGroups[j], ev.actionGroups[i]];
  render();
}

function renameActionGroup(eventId, groupId, newName){
  const ev = state.events.find(e=>e.id===eventId);
  if(!ev) return;
  const g = ev.actionGroups.find(x=>x.id===groupId);
  if(!g) return;
  g.name = newName || 'group';
  updateYAML();
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
      const card = zone.closest('.event-card');
      const eventId = card?.dataset.eventId;
      const ztype = zone.dataset.zoneType;
      const groupId = zone.dataset.groupId || null;
      if(eventId){
        addBlock(eventId, state.dragData.kind, state.dragData.subtype, { groupId, zoneType: ztype });
      }
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

function createZone(ev, { type, groupId=null, accept }){
  const z = document.createElement('div');
  z.className = 'zone';
  z.dataset.zoneType = type;      // 'non-action' | 'action-group'
  if(groupId) z.dataset.groupId = groupId;

  z.addEventListener('dragover', (e)=>{
    e.preventDefault();
    z.classList.add('over');
    e.dataTransfer.dropEffect='copy';
  });
  z.addEventListener('dragleave', ()=> z.classList.remove('over'));
  z.addEventListener('drop', (e)=>{
    e.preventDefault(); z.classList.remove('over');
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json'));
      if(!accept.includes(payload.kind)) return;
      addBlock(ev.id, payload.kind, payload.subtype, { groupId, zoneType: type });
    } catch(err){ console.warn(err); }
  });

  return z;
}

/* ---------- Add/Remove/Move blocks ---------- */
function addBlock(eventId, kind, subtype, opts={}){
  const ev = state.events.find(x=>x.id===eventId);
  if(!ev) return;

  if(kind==='eventType'){
    ev.type = subtype;
  } else if (kind==='action') {
    // Sólo a grupos
    let group = null;
    if(opts.groupId) group = ev.actionGroups.find(g=>g.id===opts.groupId);
    if(!group){
      // fallback: default
      group = ev.actionGroups.find(g=>g.name==='default') || ev.actionGroups[0];
    }
    const meta = REGISTRY.action?.[subtype];
    if(!meta){ console.warn('Unknown action', subtype); return; }
    group.blocks.push({ id: uid(), kind, subtype, data: deepClone(meta.defaults || {}) });
  } else {
    // condition / setting permanecen en ev.blocks
    const meta = REGISTRY[kind]?.[subtype];
    if(!meta){ console.warn('Unknown block', kind, subtype); return; }
    ev.blocks.push({ id: uid(), kind, subtype, data: deepClone(meta.defaults || {}) });
  }

  render();
}

function removeBlock(eventId, blockId){
  const ev = state.events.find(x=>x.id===eventId);
  if(!ev) return;
  // primero intenta en no-actions
  const i = ev.blocks.findIndex(b=>b.id===blockId);
  if(i>=0){ ev.blocks.splice(i,1); render(); return; }
  // luego en groups
  for(const g of ev.actionGroups){
    const j = g.blocks.findIndex(b=>b.id===blockId);
    if(j>=0){ g.blocks.splice(j,1); render(); return; }
  }
}

function moveBlock(eventId, blockId, dir){
  const ev = state.events.find(x=>x.id===eventId);
  if(!ev) return;
  const i = ev.blocks.findIndex(b=>b.id===blockId);
  if(i<0) return;
  const j = i + (dir==='up'?-1:1);
  if(j<0 || j>=ev.blocks.length) return;
  [ev.blocks[i], ev.blocks[j]] = [ev.blocks[j], ev.blocks[i]];
  render();
}

function moveAction(eventId, groupId, blockId, dir){
  const ev = state.events.find(x=>x.id===eventId);
  const g  = ev?.actionGroups.find(gg=>gg.id===groupId);
  if(!g) return;
  const i = g.blocks.findIndex(b=>b.id===blockId);
  const j = i + (dir==='up'?-1:1);
  if(i<0 || j<0 || j>=g.blocks.length) return;
  [g.blocks[i], g.blocks[j]] = [g.blocks[j], g.blocks[i]];
  render();
}

/* ---------- Render ---------- */
function blockClass(kind, subtype){ return REGISTRY[kind]?.[subtype]?.className || 'ev'; }

function render(){
  canvas.innerHTML = '';

  state.events.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.dataset.eventId = ev.id;

    // header
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

    // sección no-actions (conditions + settings)
    const nonActionZone = createZone(ev, { type:'non-action', accept:['condition','setting','eventType']});
    // pintar los no-actions
    ev.blocks.forEach(b=>{
      const meta  = REGISTRY[b.kind]?.[b.subtype];
      const block = document.createElement('div');
      block.className = `block ${blockClass(b.kind,b.subtype)}`;
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
      meta?.render?.(body, b, updateYAML);
      block.appendChild(body);
      const [up,down,del] = block.querySelectorAll('.icon-btn');
      up.addEventListener("click", ()=>moveBlock(ev.id,b.id,'up'));
      down.addEventListener("click", ()=>moveBlock(ev.id,b.id,'down'));
      del.addEventListener("click", ()=>removeBlock(ev.id,b.id));
      nonActionZone.appendChild(block);
    });

    const nonActionWrap = document.createElement('div');
    nonActionWrap.style.margin = '10px 12px';
    nonActionWrap.prepend(Object.assign(document.createElement('div'), {
      className:'palette-title',
      textContent:'Conditions & Settings'
    }));
    // hint
    const hintNA = document.createElement('div');
    hintNA.style.opacity = '.7';
    hintNA.style.fontSize = '12px';
    hintNA.style.marginTop = '6px';
    hintNA.textContent = 'Arrastra condiciones o settings aquí…';
    nonActionZone.appendChild(hintNA);
    nonActionWrap.appendChild(nonActionZone);
    card.appendChild(nonActionWrap);

    // sección Action Groups
    const groupsHeader = document.createElement('div');
    groupsHeader.className = 'builder-header';
    groupsHeader.style.borderTop = '1px solid var(--border)';
    groupsHeader.innerHTML = `
      <div style="font-weight:700">Action Groups</div>
      <div class="builder-actions">
        <button class="btn" title="Añadir action group">+ Add Group</button>
      </div>`;
    groupsHeader.querySelector('.btn').addEventListener('click', ()=>addActionGroup(ev.id, 'group'));
    card.appendChild(groupsHeader);

    // pintar cada group
    ev.actionGroups.forEach((g, idx)=>{
      const groupCard = document.createElement('div');
      groupCard.className = 'block';
      groupCard.style.margin = '10px 12px';

      const head = document.createElement('div');
      head.className = 'block-head';
      head.style.background = 'color-mix(in oklab, var(--msg) 18%, #0a0d16)';
      head.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center;">
          <div style="font-weight:700">Group:</div>
          <input class="group-name" value="${g.name}" title="Nombre del action group"/>
        </div>
        <div class="tools">
          <button class="icon-btn" title="Subir grupo">▲</button>
          <button class="icon-btn" title="Bajar grupo">▼</button>
          <button class="icon-btn danger" title="Eliminar grupo">🗑</button>
        </div>`;
      const [btnUp, btnDown, btnDel] = head.querySelectorAll('.icon-btn');
      head.querySelector('input').addEventListener('input', e=>renameActionGroup(ev.id, g.id, e.target.value));
      btnUp.addEventListener('click', ()=>moveActionGroup(ev.id, g.id, 'up'));
      btnDown.addEventListener('click', ()=>moveActionGroup(ev.id, g.id, 'down'));
      btnDel.addEventListener('click', ()=>{
        if(confirm(`¿Eliminar el grupo "${g.name}"?`)) removeActionGroup(ev.id, g.id);
      });
      groupCard.appendChild(head);

      const zone = createZone(ev, { type:'action-group', groupId:g.id, accept:['action'] });
      // acciones dentro del group
      g.blocks.forEach(b=>{
        const meta  = REGISTRY.action?.[b.subtype];
        const block = document.createElement('div');
        block.className = `block ${blockClass(b.kind,b.subtype)}`;
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
        meta?.render?.(body, b, updateYAML);
        block.appendChild(body);
        const [up,down,del] = block.querySelectorAll('.icon-btn');
        up.addEventListener("click",   ()=>moveAction(ev.id,g.id,b.id,'up'));
        down.addEventListener("click", ()=>moveAction(ev.id,g.id,b.id,'down'));
        del.addEventListener("click",  ()=>{ 
          const gg = ev.actionGroups.find(x=>x.id===g.id);
          const i = gg.blocks.findIndex(x=>x.id===b.id);
          if(i>=0){ gg.blocks.splice(i,1); render(); }
        });
        zone.appendChild(block);
      });
      // hint
      const hint = document.createElement('div');
      hint.style.opacity = '.7';
      hint.style.fontSize = '12px';
      hint.style.marginTop = '6px';
      hint.textContent = 'Arrastra acciones aquí…';
      zone.appendChild(hint);

      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'block-body';
      bodyWrap.appendChild(zone);
      groupCard.appendChild(bodyWrap);

      card.appendChild(groupCard);
    });

    canvas.appendChild(card);
  });

  updateYAML();
}

/* ---------- YAML (con múltiples action groups) ---------- */
function buildYAML(){
  const lines = [];
  lines.push('events:');
  state.events.forEach(ev => {
    const ename = (ev.name||'event').replace(/:/g,'').trim() || 'event';
    lines.push(`  ${ename}:`);
    lines.push(`    type: ${ev.type || 'repetitive'}`);

    // settings desde blocks (kind=setting)
    const settings = {};
    ev.blocks.forEach(b=>{
      const meta = REGISTRY[b.kind]?.[b.subtype];
      if(meta?.settingKey){
        settings[meta.settingKey] =
          ('ticks' in b.data) ? b.data.ticks :
          ('perm'  in b.data) ? b.data.perm  : b.data;
      }
    });
    if(settings.repetitive_time !== undefined) lines.push(`    repetitive_time: ${settings.repetitive_time}`);
    if(settings.ignore_with_permission)       lines.push(`    ignore_with_permission: ${settings.ignore_with_permission}`);

    // conditions (desde blocks)
    const conds = ev.blocks.filter(b=>b.kind==='condition').map(b=>{
      const meta = REGISTRY.condition[b.subtype];
      return meta?.toYAML ? meta.toYAML(b) : `'TODO condition'`;
    });
    if(conds.length){
      lines.push('    conditions:');
      conds.forEach(c => lines.push(`      - ${c}`));
    }

    // actions (por grupos)
    lines.push('    actions:');
    if(!ev.actionGroups.length){
      lines.push('      default:');
      lines.push('      - "message: &7No actions configured."');
    } else {
      ev.actionGroups.forEach(g=>{
        const key = slugKey(g.name);
        lines.push(`      ${key}:`);
        if(g.blocks.length){
          g.blocks.forEach(b=>{
            const meta = REGISTRY.action[b.subtype];
            const s = meta?.toYAML ? meta.toYAML(b) : `'message: TODO'`;
            lines.push(`      - ${s}`);
          });
        } else {
          lines.push('      - "message: &7No actions configured."');
        }
      });
    }
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

/* ---------- Watermark sólo en export ---------- */
const WATERMARK_ENABLED = true;
const WATERMARK_TEXT = () =>
  `# Generated with Conditional Events Visual Builder\n` +
  `# Source: https://utility.mxvd.me/cevisualbuilder\n` +
  `# Timestamp: ${new Date().toISOString().slice(0,10)} - ${new Date().toTimeString().slice(0,8)}`;

function getYAMLForExport() {
  const base = buildYAML();
  return WATERMARK_ENABLED ? `${base}\n\n${WATERMARK_TEXT()}` : base;
}

/* ---------- Copy / Download ---------- */
document.getElementById('copyBtn').addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(getYAMLForExport());
    alert('YAML copiado ✅');
  }catch(e){ alert('No se pudo copiar'); }
});
document.getElementById('downloadBtn').addEventListener('click', ()=>{
  const out = getYAMLForExport();
  const blob = new Blob([out], {type:'text/yaml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'events.yml';
  document.body.appendChild(a); a.click(); a.remove();
});

/* ---------- Boot ---------- */
buildPalette();
document.getElementById('newEventBtn').click();
const first = state.events[0].id;
addBlock(first,'eventType','block_interact');
addBlock(first,'condition','basic_condition');
addBlock(first,'action','send_message', { zoneType:'action-group' }); // cae en default
applyResponsiveYAML();
updateScreenGuard();
