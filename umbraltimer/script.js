const $ = s => document.querySelector(s);
const display = $('#display');
const timeEl = $('#time');
const stateLabel = $('#stateLabel');
const fmtEl = $('#format');
const speedEl = $('#speedMultiplier');
const speedLabel = $('#speedLabel');
const startPauseBtn = $('#startPause');
const resetBtn = $('#reset');
const fsBtn = $('#fullscreen');
const panel = $('#optionsPanel');
const wakeToggle = $('#wakeLockToggle');
const logBox = $('#log');

const thresholdList = $('#thresholdList');
const addThresholdBtn = $('#addThreshold');

let thresholds = [
  { time: 300, color: '#ef4444', message: 'Aún falta, ¡sigue!' },
  { time: 540, color: '#22c55e', message: 'Estas dentro del tiempo, ¡puedes terminarlo cuando quieras!' },
  { time: 720, color: '#facc15', message: 'Te estas alargando mucho, ¡aún estas dentro del tiempo!' },
  { time: 99999, color: '#ef4444', message: 'Te pasaste en el tiempo :(' },
];

const addLog = m => {
  const ts = new Date().toLocaleTimeString();
  const d = document.createElement('div');
  d.className = 'item';
  d.textContent = `[${ts}] ${m}`;
  logBox.prepend(d);
};

class Emitter {
  constructor() { this.map = new Map(); }
  on(e, f) { if (!this.map.has(e)) this.map.set(e, new Set()); this.map.get(e).add(f); return () => this.off(e, f); }
  off(e, f) { this.map.get(e)?.delete(f); }
  emit(e, ...a) { this.map.get(e)?.forEach(fn => { try{ fn(...a); } catch(err){ console.error(err); } }); }
}

class Stopwatch extends Emitter {
  constructor() {
    super();
    this.reset();
    this._loop = this._loop.bind(this);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.startEpoch = performance.now();
    this._raf = requestAnimationFrame(this._loop);
    this.emit('start', this.elapsedMs);
    addLog('▶️ Reanudado');
  }
  pause() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this._raf);
    const now = performance.now();
    this.elapsedMs += (now - this.startEpoch) * speed;
    this.emit('pause', this.elapsedMs);
    addLog('⏸️ Pausado');
  }
  reset() {
    this.running = false;
    this.startEpoch = 0;
    this.elapsedMs = 0;
    this.lastZoneRef = null; // referencia al objeto de zona actual
    cancelAnimationFrame?.(this._raf);
    this.emit?.('reset');
    addLog('↩️ Reiniciado');
  }
  _loop() {
    if (!this.running) return;
    const now = performance.now();
    this.elapsedMs += (now - this.startEpoch) * speed;
    this.startEpoch = now;
    this.emit('tick', this.elapsedMs);
    this._raf = requestAnimationFrame(this._loop);
  }
  get timeMs(){ return this.elapsedMs | 0; }
  get timeSec(){ return this.timeMs / 1000; }
}

function formatTime(ms, mode) {
  const total = Math.floor(ms / 1000);
  const msDec = Math.floor((ms % 1000) / 10); // centésimos
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  switch (mode) {
    case 'mm:ss': return `${pad(m)}:${pad(s)}`;
    case 'hh:mm:ss': return `${pad(h)}:${pad(m)}:${pad(s)}`;
    case 'mm:ss.dd': return `${pad(m)}:${pad(s)}.${pad(msDec, 2)}`;
    default: return `${pad(m)}:${pad(s)}.${Math.floor((ms % 1000) / 100)}`;
  }
}

const timer = new Stopwatch();
window.timer = timer;

/* ---------- util contraste ---------- */
function getTextColorForBackground(hex) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}

/* ---------- umbrales dinámicos ---------- */
function sortThresholds() {
  thresholds.sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
}

function applyZoneDynamic(seconds) {
  // Encuentra la primera zona cuyo time sea >= seconds
  let zone = thresholds.find(t => seconds <= t.time) || thresholds[thresholds.length - 1];
  display.style.setProperty('--zone-color', zone.color);
  stateLabel.style.color = getTextColorForBackground(zone.color);

  // Evita spam: compara por referencia
  if (timer.lastZoneRef !== zone) {
    timer.lastZoneRef = zone;
    addLog(`🎯 ${zone.message}`);
    stateLabel.textContent = zone.message;
  }
}

function renderThresholds() {
  thresholdList.innerHTML = '';
  sortThresholds();

  thresholds.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `
      <label>Umbral ${i + 1}</label>
      <input type="number" min="0" step="1" value="${t.time}" data-i="${i}" class="th-time" />
      <input type="color" value="${t.color}" data-i="${i}" class="th-color" />
      <input type="text" value="${t.message}" data-i="${i}" class="th-msg" />
      <button type="button" class="btn th-del" data-i="${i}">🗑️</button>
    `;
    thresholdList.appendChild(div);
  });

  // Wire events
thresholdList.querySelectorAll('.th-time').forEach(inp => {
  inp.oninput = e => {
    const i = +e.target.dataset.i;
    thresholds[i].time = Math.max(0, +e.target.value || 0);
    // solo actualiza el valor local, sin redibujar todavía
  };
  inp.onblur = e => { // 🔥 al perder foco (cuando termina de editar)
    sortThresholds();
    renderThresholds();
    applyZoneDynamic(timer.timeSec);
  };
  inp.onkeydown = e => { // 🔥 también si presiona Enter
    if (e.key === 'Enter') {
      e.target.blur(); // fuerza el blur, lo que activa el reordenamiento
    }
  };
});
  thresholdList.querySelectorAll('.th-color').forEach(inp => {
    inp.oninput = e => {
      const i = +e.target.dataset.i;
      thresholds[i].color = e.target.value;
      applyZoneDynamic(timer.timeSec);
    };
  });
  thresholdList.querySelectorAll('.th-msg').forEach(inp => {
    inp.oninput = e => {
      const i = +e.target.dataset.i;
      thresholds[i].message = e.target.value;
    };
  });
  thresholdList.querySelectorAll('.th-del').forEach(btn => {
    btn.onclick = e => {
      const i = +e.currentTarget.dataset.i;
      if (thresholds.length <= 1) return; // no dejar en 0
      thresholds.splice(i, 1);
      renderThresholds();
      applyZoneDynamic(timer.timeSec);
    };
  });
}

addThresholdBtn.onclick = () => {
  // Inserta antes del último para no perder la zona “final”
  thresholds.splice(Math.max(thresholds.length - 1, 0), 0, { time: 100000, color: '#8888ff', message: 'Nuevo umbral' });
  renderThresholds();
  applyZoneDynamic(timer.timeSec);
};

renderThresholds();

/* ---------- velocidad ---------- */
let speed = 1;
speedEl.oninput = () => {
  speed = parseFloat(speedEl.value);
  speedLabel.textContent = `×${speed.toFixed(2)}`;
};

/* ---------- eventos del cronómetro ---------- */
timer.on('tick', ms => {
  timeEl.textContent = formatTime(ms, fmtEl.value);
  applyZoneDynamic(ms / 1000);
});

timer.on('start', () => {
  startPauseBtn.textContent = 'Pausar';
  const bg = getComputedStyle(display).getPropertyValue('--zone-color').trim() || thresholds[0]?.color || '#111';
  stateLabel.style.color = getTextColorForBackground(bg);
});

timer.on('pause', () => {
  startPauseBtn.textContent = 'Reanudar';
  const bg = getComputedStyle(display).getPropertyValue('--zone-color').trim() || thresholds[0]?.color || '#111';
  stateLabel.style.color = getTextColorForBackground(bg);
});

timer.on('reset', () => {
  startPauseBtn.textContent = 'Iniciar';
  timeEl.textContent = formatTime(0, fmtEl.value);
  const baseColor = thresholds[0]?.color || '#111';
  display.style.setProperty('--zone-color', baseColor);
  stateLabel.textContent = thresholds[0]?.message || 'Listo';
  stateLabel.style.color = getTextColorForBackground(baseColor);
});

/* ---------- controles ---------- */
startPauseBtn.onclick = () => (timer.running ? timer.pause() : timer.start());
resetBtn.onclick = () => timer.reset();

fsBtn.onclick = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
    fsBtn.textContent = 'Salir de pantalla completa';
    panel.classList.add('hidden');
    document.querySelector('.app').style.height = '100vh';
    document.body.style.overflow = 'hidden';
  } else {
    await document.exitFullscreen();
    fsBtn.textContent = 'Pantalla completa';
    panel.classList.remove('hidden');
    document.querySelector('.app').style.height = '100%';
    document.body.style.overflow = '';
  }
};

/* ---------- wake lock ---------- */
let wakeLock = null;
async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
    wakeLock?.addEventListener('release', () => { wakeToggle.checked = false; });
  } catch (e) { console.warn('WakeLock no disponible', e); }
}
wakeToggle.onchange = () => {
  if (wakeToggle.checked) requestWakeLock();
  else { wakeLock?.release?.(); wakeLock = null; }
};

/* ---------- init ---------- */
timeEl.textContent = formatTime(0, fmtEl.value);
applyZoneDynamic(0);
