const els = (id)=>document.getElementById(id);
const file = els('file');
const rowsEl = els('rows');
const colsEl = els('cols');
const swEl = els('sw');
const shEl = els('sh');
const gapxEl = els('gapx');
const gapyEl = els('gapy');
const offxEl = els('offx');
const offyEl = els('offy');
const limitEl = els('limit');
const orderEl = els('order');
const prefixEl = els('prefix');
const zpadEl = els('zpad');
const analyzeBtn = els('analyze');
const sliceBtn = els('slice');
const preview = els('preview');
const sheetInfo = els('sheetInfo');
const gridInfo = els('gridInfo');

let img = null;
let sheetW=0, sheetH=0;

file.addEventListener('change', async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  const url = URL.createObjectURL(f);
  img = new Image();
  img.onload = ()=>{
    sheetW = img.width;
    sheetH = img.height;
    sheetInfo.textContent = `Sheet: ${sheetW} × ${sheetH}px`;
    drawPreview();
  }
  img.src = url;
});

function parseNum(el){
  const v = Number(el.value||0);
  return Number.isFinite(v)?v:0;
}

function inferGrid(){
  let rows = parseNum(rowsEl);
  let cols = parseNum(colsEl);
  let sw = parseNum(swEl);
  let sh = parseNum(shEl);
  const gapx = parseNum(gapxEl);
  const gapy = parseNum(gapyEl);
  const offx = parseNum(offxEl);
  const offy = parseNum(offyEl);

  if(!img){ alert('Primero carga una imagen.'); return null; }

  if(sw===0 && cols>0){ sw = Math.floor((sheetW - offx - (cols-1)*gapx)/cols); swEl.value = sw; }
  if(sh===0 && rows>0){ sh = Math.floor((sheetH - offy - (rows-1)*gapy)/rows); shEl.value = sh; }
  if(cols===0 && sw>0){ cols = Math.floor((sheetW - offx + gapx)/(sw + gapx)); colsEl.value = cols; }
  if(rows===0 && sh>0){ rows = Math.floor((sheetH - offy + gapy)/(sh + gapy)); rowsEl.value = rows; }

    if(!(rows>0 && cols>0 && sw>0 && sh>0)){
    console.warn('⚠️ Faltan datos suficientes para definir la rejilla.');
    return null;
    }
  return {rows, cols, sw, sh, gapx, gapy, offx, offy};
}

function drawPreview(){
  if(!img) return;
  preview.width = Math.min(sheetW, 1200);
  const scale = preview.width / sheetW;
  preview.height = Math.round(sheetH * scale);
  const ctx = preview.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0,0,preview.width,preview.height);
  ctx.drawImage(img, 0, 0, preview.width, preview.height);

  const cfg = inferGrid();
  if(!cfg){ gridInfo.textContent = '—'; return; }
  const {rows, cols, sw, sh, gapx, gapy, offx, offy} = cfg;
  gridInfo.textContent = `Grid: ${rows}×${cols} · sprite ${sw}×${sh}px`;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineWidth = 1/scale;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x = offx + c*(sw+gapx);
      const y = offy + r*(sh+gapy);
      ctx.strokeStyle = 'rgba(124,58,237,0.9)';
      ctx.strokeRect(x,y,sw,sh);
    }
  }
  ctx.restore();
}

analyzeBtn.addEventListener('click', ()=>{
  if(!img){
    alert('Primero carga una imagen antes de calcular la rejilla.');
    return;
  }
  const cfg = inferGrid();
  if(!cfg){
    alert('Faltan datos para definir la rejilla. Completa filas/columnas o ancho/alto.');
    return;
  }
  drawPreview();
});

[rowsEl, colsEl, swEl, shEl, gapxEl, gapyEl, offxEl, offyEl].forEach(el=>{
  el.addEventListener('input', ()=>{ if(img) drawPreview(); });
});

function pad(n, z){ return String(n).padStart(z,'0'); }

sliceBtn.addEventListener('click', async ()=>{
  const cfg = inferGrid();
  if(!cfg) return;
  const {rows, cols, sw, sh, gapx, gapy, offx, offy} = cfg;
  const limit = parseNum(limitEl);
  const order = orderEl.value; // 'row-col' | 'col-row'
  const prefix = prefixEl.value || 'sprite_';
  const zpad = Math.max(1, parseNum(zpadEl));
  const startIndex = parseNum(els('startIndex'));
  const lastColVerticalEl = els('lastColVertical');
  const lastColVertical = lastColVerticalEl ? lastColVerticalEl.checked : false;

  const zip = new JSZip();
  const canvas = document.createElement('canvas');
  canvas.width = sw; canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently:true });
  ctx.imageSmoothingEnabled = false;

  let count = 0;
  const pushFrame = async (r,c)=>{
    const sx = offx + c*(sw+gapx);
    const sy = offy + r*(sh+gapy);
    if(sx+sw>sheetW || sy+sh>sheetH) return;
    ctx.clearRect(0,0,sw,sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise(res=>canvas.toBlob(res, 'image/png'));
    const name = `${prefix}${String(count + startIndex).padStart(zpad,'0')}.png`;
    zip.file(name, blob);
    count++;
  };

  // === RECORRIDO NORMAL ===
  if(order === 'row-col'){
    for(let r=0; r<rows; r++){
      for(let c=0; c<cols; c++){
        if(limit>0 && count>=limit) break;
        // si la última columna debe ir al final, la saltamos de momento
        if(lastColVertical && c === cols - 1) continue;
        await pushFrame(r, c);
      }
      if(limit>0 && count>=limit) break;
    }

    // === ÚLTIMA COLUMNA VERTICAL (excepción) ===
    if(lastColVertical){
      const c = cols - 1;
      for(let r=0; r<rows; r++){
        if(limit>0 && count>=limit) break;
        await pushFrame(r, c);
      }
    }

  } else { // col-row
    for(let c=0; c<cols; c++){
      for(let r=0; r<rows; r++){
        if(limit>0 && count>=limit) break;
        await pushFrame(r, c);
      }
      if(limit>0 && count>=limit) break;
    }
  }

  const zipName = (prefix || 'sprites_').replace(/[^a-z0-9_\\-]/gi,'') || 'sprites_';
  const out = await zip.generateAsync({type:'blob', compression:'DEFLATE'});
  saveAs(out, `${zipName}frames.zip`);
});