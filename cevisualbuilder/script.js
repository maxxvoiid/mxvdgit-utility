/* =========================================================
   ConditionalEvents Visual Builder — Data-Driven + Action Groups
   ========================================================= */

const state = { events: [], dragData: null };
const canvas = document.getElementById('canvas');
const ymlOut = document.getElementById('yml');
const appEl = document.querySelector('.app');
const yamlPanel = document.getElementById('yamlPanel');
const yamlShowBtn = document.getElementById('yamlShowBtn');
const paletteSearchInput = document.getElementById('paletteSearch');
let paletteSearchQuery = '';

const importBtn = document.getElementById('importBtn');
const importOverlay = document.getElementById('importOverlay');
const importUploadOption = document.getElementById('importUploadOption');
const importPasteOption = document.getElementById('importPasteOption');
const importFileInput = document.getElementById('importFileInput');
const importPasteOverlay = document.getElementById('importPasteOverlay');
const importPasteTextarea = document.getElementById('importPasteTextarea');
const importPasteConfirm = document.getElementById('importPasteConfirm');
const importCloseButtons = document.querySelectorAll('[data-import-close]');
const importPasteCloseButtons = document.querySelectorAll('[data-paste-close]');
const introOverlay = document.getElementById('introOverlay');

if (introOverlay) {
  setTimeout(() => {
    introOverlay.classList.add('intro-overlay--hidden');
    setTimeout(() => {
      introOverlay.remove();
    }, 360);
  }, 5000);
}

if(paletteSearchInput){
  paletteSearchInput.addEventListener('input', (event) => {
    paletteSearchQuery = event.target.value;
    applyPaletteFilter();
  });
}

const MIN_WIDTH = 980;
document.getElementById('minWidthText').textContent = MIN_WIDTH + ' px';

const isActionKind = (k) => k === 'action' || /^actions?/i.test(k);
const ACTION_KINDS = () => Object.keys(REGISTRY).filter(isActionKind);
const getActionMeta = (kind, subtype) => REGISTRY[kind]?.[subtype] || null;
const isEventKind = (k) => k === 'eventType' || /^event.+Type$/.test(k);
const uid  = () => Math.random().toString(36).slice(2, 9);
const escQ = s => String(s ?? '').replace(/'/g, "''");
const deepClone = o => JSON.parse(JSON.stringify(o));
const slugKey = s => String(s||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'_') || 'group';

const LONG_PRESS_MS = 150;
const MOVE_TOLERANCE = 12; // px de "touch slop" para distinguir scroll de drag

/* ---------- REGISTRY (igual que el tuyo; puedes editar aquí para añadir bloques) ---------- */
const REGISTRY = {
  eventPlayerType: {
    __meta: { label: 'Player Events', color: 'var(--ev)' },
    player_join: { label:'Player Join', className:'ev' },
    player_leave:  { label:'Player Leave',  className:'ev' },
    player_pre_join: { label:'Player Pre Join', className:'ev' },
    player_respawn: { label:'Player Respawn', className:'ev' },
    player_death: { label:'Player Death', className:'ev' },
    player_command: { label:'Player Command', className:'ev' },
    player_chat: { label:'Player Chat', className:'ev' },
    player_levelup: { label:'Player Levelup', className:'ev' },
    player_world_change: { label:'Player World Change', className:'ev' },
    player_attack: { label:'Player Attack', className:'ev' },
    player_kill: { label:'Player Kill', className:'ev' },
    player_damage: { label:'Player Damage', className:'ev' },
    player_armor: { label:'Player Armor', className:'ev' },
    player_teleport: { label:'Player Teleport', className:'ev' },
    player_bed_enter: { label:'Player Bed Enter (1.13+)', className:'ev' },
    player_offhand: { label:'Player Offhand', className:'ev' },
    player_fish: { label:'Player Fish', className:'ev' },
    player_open_inventory: { label:'Player Open Inventory', className:'ev' },
    player_close_inventory: { label:'Player Close Inventory', className:'ev' },
    player_click_inventory: { label:'Player Click Inventory', className:'ev' },
    player_statistic: { label:'Player Statistic', className:'ev' },
    player_sneak: { label:'Player Sneak', className:'ev' },
    player_run: { label:'Player Run', className:'ev' },
    player_regain_health: { label:'Player Regain Health', className:'ev' },
    player_change_food: { label:'Player Change Food (1.16+)', className:'ev' },
    player_tab_complete: { label:'Player Tab Complete (1.9+)', className:'ev' },
  },

  eventBlockType: {
    __meta: { label: 'Block Events', color: 'var(--ev)' },
    block_interact: { label:'Block Interact', className:'ev' },
    block_break: { label:'Block Break', className:'ev' },
    block_place: { label:'Block Place', className:'ev' },
  },

  eventItemType: {
    __meta: { label: 'Item Events', color: 'var(--ev)' },
    item_interact: { label:'Item Interact', className:'ev' },
    item_consume: { label:'Item Consume', className:'ev' },
    item_pickup: { label:'Item Pickup', className:'ev' },
    item_move: { label:'Item Move', className:'ev' },
    item_craft: { label:'Item Craft', className:'ev' },
    item_drop: { label:'Item Drop', className:'ev' },
    item_select: { label:'Item Select', className:'ev' },
    item_enchant: { label:'Item Enchant', className:'ev' },
    item_repair: { label:'Item Repair (1.13+)', className:'ev' },
  },

  eventOtherType: {
    __meta: { label: 'Other Events', color: 'var(--ev)' },
    entity_interact: { label:'Entity Interact', className:'ev' },
    entity_spawn: { label:'Entity Spawn', className:'ev' },
    console_command: { label:'Console Command', className:'ev' },
    server_start: { label:'Server Start', className:'ev' },
    server_stop: { label:'Server Stop', className:'ev' },
    repetitive: { label:'Repetitive', className:'ev' },
    repetitive_server: { label:'Repetitive Server', className:'ev' },
    call: { label:'Call', className:'ev' },
  },

  eventPluginsType: {
    __meta: { label: 'Plugin Events', color: 'var(--ev)' },
    citizens_right_click_npc: { label:'Citizens Right Click NPC', className:'ev' },
    wgevents_region_enter: { label:'WGEvents Region Enter', className:'ev' },
    wgevents_region_leave: { label:'WGEvents Region Leave', className:'ev' },
    protocollib_receive_message: { label:'Protocollib Receive Message', className:'ev' },
  },

  condition: {
    __meta: { label: 'Conditions', color: 'var(--cond)' },
    basic_condition: {
      label:'Add Condition',
      className:'cond',
      defaults: { left:'%block%', op:'==', right:'STONE_BUTTON' },
      render(body, block, update, ctx){
        body.innerHTML = `
          <div class="row">
            <input type="text" value="${block.data.left}" title="Variable/placeholder (ej: %block%)" />
            <select>
              ${[
                '==',
                '!=',
                '>=',
                '<=',
                '>',
                '<',
                'equals',
                '!equals',
                'equalsIgnoreCase',
                '!equalsIgnoreCase',
                'startsWith',
                '!startsWith',
                'contains',
                '!contains',
                'endsWith',
                '!endsWith',
                'matches',
                '!matches'
              ].map(op=>`<option ${block.data.op===op?'selected':''}>${op}</option>`).join('')}
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
    __meta: { label: 'Actions', color: 'var(--msg)' },
    send_message: {
      label:'Send Message', className:'msg',
      defaults:{ text:'Enter your message here...' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sends a message to the player.
          </small>
          <div class="row single"><input type="text" value="${block.data.text}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.text = e.target.value; update(); });
      },
      toYAML(block){ return `'message: ${escQ(block.data.text)}'`; }
    },
    send_centered_message: {
      label:'Send Centered Message', className:'msg',
      defaults:{ text:'Enter your message here...' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sends a centered message to the player.
          </small>
          <div class="row single"><input type="text" value="${block.data.text}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.text = e.target.value; update(); });
      },
      toYAML(block){ return `'centered_message: ${escQ(block.data.text)}'`; }
    },
    send_console_message: {
      label:'Send Console Message', className:'msg',
      defaults:{ text:'Enter your message here...' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sends a message to the console.
          </small>
          <div class="row single"><input type="text" value="${block.data.text}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.text = e.target.value; update(); });
      },
      toYAML(block){ return `'console_message: ${escQ(block.data.text)}'`; }
    },
    send_json_message: {
      label: 'Send JSON Message', className: 'msg',
      defaults: { text: 'Enter your message here...' },
      render(body, block, update, ctx) {
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sends a JSON message to the player. These messages allows you to add click and hover events.
          </small>
          <div class="row single">
            <textarea rows="4" style="
              width:100%;
              resize:vertical;
              background:#121212;
              border:1px solid #0d1220;
              border-radius:10px;
              color:var(--fg);
              padding:0.6rem 0.7rem;
              font-family:monospace;
              font-size:0.9rem;
            ">${block.data.text}</textarea>
          </div>
          <small style="opacity:.7;font-size:12px">
            Puedes escribir JSON o texto con múltiples líneas; el YAML se exportará comprimido.
          </small>`;
        
        const ta = body.querySelector('textarea');
        ta.addEventListener('input', e => {
          block.data.text = e.target.value;
          update();
        });
      },
      toYAML(block) {
        // quita saltos de línea y espacios extra para que quede en una sola línea
        const singleLine = block.data.text
          .replace(/\r?\n+/g, ' ')     // reemplaza saltos por espacios
          .replace(/\s{2,}/g, ' ')     // colapsa espacios repetidos
          .trim();
        return `'json_message: ${escQ(singleLine)}'`;
      }
    },
    send_mini_message: {
      label:'Send Mini Message (Paper 1.19.4+)', className:'msg',
      defaults:{ text:'Enter your message here...' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sends a message in the Mini Message format to the player.
          </small>
          <div class="row single"><input type="text" value="${block.data.text}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.text = e.target.value; update(); });
      },
      toYAML(block){ return `'mini_message: ${escQ(block.data.text)}'`; }
    },
    console_command: {
      label:'Console Command', className:'cmd',
      defaults:{ cmd:'say Hello' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Executes a command from the console.
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'console_command: ${escQ(block.data.cmd)}'`; }
    },
    player_command: {
      label:'Player Command', className:'cmd',
      defaults:{ cmd:'say Hello' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Executes a command from the player.
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'player_command: ${escQ(block.data.cmd)}'`; }
    },
    player_command_as_op: {
      label:'Player Command as Op', className:'cmd',
      defaults:{ cmd:'say Hello' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Executes a command from the player as OP. (Not recommended)
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'player_command_as_op: ${escQ(block.data.cmd)}'`; }
    },
    player_send_chat: {
      label:'Player Send Chat', className:'msg',
      defaults:{ cmd:'Hello!' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sends a message in chat from the player. You can even execute a command that is not registered.
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'player_send_chat: ${escQ(block.data.cmd)}'`; }
    },
    teleport: {
      label:'Teleport', className:'fx',
      defaults:{ cmd:'lobby;0;60;0;90;0' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Teleports the player/entity. Use this format: <code>world;x;y;z;yaw;pitch</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'teleport: ${escQ(block.data.cmd)}'`; }
    },
    give_potion_effect: {
      label:'Give Potion Effect', className:'heal',
      defaults:{ cmd:'POISON;120;1;false' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Gives a potion effect to the player/entity. Use this format: "effect;duration_in_ticks;level;show_particles;show_icon"
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'give_potion_effect: ${escQ(block.data.cmd)}'`; }
    },
    remove_potion_effect: {
      label:'Remove Potion Effect', className:'heal',
      defaults:{ cmd:'POISON' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Removes a potion effect from the player/entity. Use "all" to remove all potion effects.
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'remove_potion_effect: ${escQ(block.data.cmd)}'`; }
    },
    cancel_event: {
      label:'Cancel Event', className:'danger',
      defaults:{ value:true },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Whether event should be cancelled or not.
          </small>
          <div class="row two">
            <label style="opacity:.8; align-self:center;">Cancel this event</label>
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
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Kicks the players from the server.
          </small>
          <div class="row single"><input type="text" value="${block.data.reason}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.reason = e.target.value; update(); });
      },
      toYAML(block){ return `'kick: ${escQ(block.data.reason)}'`; }
    },
    playsound: {
      label:'Play Sound', className:'fx',
      defaults:{ cmd:'BLOCK_NOTE_BLOCK_PLING;10;2;100,60,-127,world' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Plays a sound to the player. Use this format: "sound;volume;pitch;(optional, location)<x>,<y>,<z>,<world>"
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'playsound: ${escQ(block.data.cmd)}'`; }
    },
    playsound_resource_pack: {
      label:'Play Sound Resource Pack', className:'fx',
      defaults:{ cmd:'my_custom_sound;10;2;100,60,-127,world' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Plays a resource pack sound to the player. The format is the same as playsound action.
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'playsound_resource_pack: ${escQ(block.data.cmd)}'`; }
    },
    stopsound: {
      label:'Stop Sound (1.10+)', className:'fx',
      defaults:{ cmd:'BLOCK_NOTE_BLOCK_PLING' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Stops a sound for a player. 
              Use "<sound>" for specific sound. Only works on 1.10+.
              Use "all" for stopping all sounds. Only works on 1.17+.
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'stopsound: ${escQ(block.data.cmd)}'`; }
    },
    stopsound_resource_pack: {
      label:'Stop Sound Resource Pack (1.10+)', className:'fx',
      defaults:{ cmd:'scorpions:custom.test' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Stops a resource pack sound for a player.
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'stopsound_resource_pack: ${escQ(block.data.cmd)}'`; }
    },
    gamemode: {
      label: 'Set Gamemode',
      className: 'cmd',
      defaults: { mode: 'SURVIVAL' },
      render(body, block, update, ctx) {
        body.innerHTML = `
          <small style="opacity:1;font-size:14px">
              Sets a gamemode for the player.
          </small>
          <div class="row two">
            <label style="opacity:.8; align-self:center;">Select the game mode</label>
            <select>
              ${['SURVIVAL', 'CREATIVE', 'ADVENTURE', 'SPECTATOR']
                .map(mode => `<option ${block.data.mode === mode ? 'selected' : ''}>${mode}</option>`)
                .join('')}
            </select>
          </div>`;
        
        const sel = body.querySelector('select');
        sel.addEventListener('change', e => {
          block.data.mode = e.target.value;
          update();
        });
      },
      toYAML(block) {
        return `'gamemode: ${block.data.mode}'`;
      }
    },
    send_to_server: {
      label:'Send to Server', className:'cmd',
      defaults:{ cmd:'lobby' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sends the player to a bungee server.
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'send_to_server: ${escQ(block.data.cmd)}'`; }
    },
    actionbar: {
      label:'Actionbar', className:'msg',
      defaults:{ cmd:'&6Welcome to the server;120' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sends an actionbar message to the player. Use this format: "message;duration" (The duration must be in ticks) On repetitive events, use a time of 0 for no flickering.
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>
          <small style="opacity:.7;font-size:12px">
            20 ticks = 1 second. Example: 100 = 5 seconds.
          </small>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'actionbar: ${escQ(block.data.cmd)}'`; }
    },
    title: {
      label:'Title', className:'msg',
      defaults:{ cmd:'20;40;20;&6This is a title;none' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sends a title and subtitle message to the player. Use this format: "fadeIn;stay;fadeOut;title;subtitle" (The duration of fadeIn, stay and fadeOut must be in ticks) If you want just a title, or just subtitle write "none"
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>
          <small style="opacity:.7;font-size:12px">
            20 ticks = 1 second. Example: 100 = 5 seconds.
          </small>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'title: ${escQ(block.data.cmd)}'`; }
    },
    damage: {
      label:'Damage', className:'danger',
      defaults:{ point:5 },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Damages the player/entity a specific amount.
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.point}" />
        </div>
        <small style="opacity:.7;font-size:12px">
            1 point = 1 half-heart. Example: 5 = 2.5 hearts.
        </small>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.point = parseInt(e.target.value||'0',10); update(); });
      },
      toYAML(block){ return `'damage: ${block.data.point}'`; }
    },
    set_on_fire: {
      label:'Set On Fire', className:'danger',
      defaults:{ ticks:60 },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sets the player/entity on fire for a certain duration in ticks.
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.ticks}" />
        </div>
        <small style="opacity:.7;font-size:12px">
            20 ticks = 1 second. Example: 100 = 5 seconds.
        </small>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.ticks = parseInt(e.target.value||'0',10); update(); });
      },
      toYAML(block){ return `'set_on_fire: ${block.data.ticks}'`; }
    },
    freeze: {
      label:'Freeze (1.17+)', className:'fx',
      defaults:{ ticks:300 },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Freezes the player/entity for a certain duration in ticks.
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.ticks}" />
        </div>
        <small style="opacity:.7;font-size:12px">
            20 ticks = 1 second. Example: 100 = 5 seconds.
        </small>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.ticks = parseInt(e.target.value||'0',10); update(); });
      },
      toYAML(block){ return `'freeze: ${block.data.ticks}'`; }
    },
    heal: {
      label:'Heal', className:'heal',
      defaults:{ point:5 },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Heals the player/entity a specific amount.
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.point}" />
        </div>
        <small style="opacity:.7;font-size:12px">
            1 point = 1 half-heart. Example: 5 = 2.5 hearts.
        </small>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.point = parseInt(e.target.value||'0',10); update(); });
      },
      toYAML(block){ return `'heal: ${block.data.point}'`; }
    },
    set_food_level: {
      label:'Set Food Level', className:'heal',
      defaults:{ point:20 },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Sets the current food level of the player with a specific amount.
          </small>
        <div class="row single">
          <input type="number" min="0" max="20" step="1" value="${block.data.point}" />
        </div>
        <small style="opacity:.7;font-size:12px">
            1 point = 1 half-shank. Example: 20 = full food bar.
        </small>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.point = parseInt(e.target.value||'0',10); update(); });
      },
      toYAML(block){ return `'set_food_level: ${block.data.point}'`; }
    },
    throw_directional: {
      label:'Throw Directional', className:'fx',
      defaults:{ point:2 },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Will throw players toward the direction they are looking at, with a certain strength (impulse).
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.point}" />
        </div>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.point = parseInt(e.target.value||'0',10); update(); });
      },
      toYAML(block){ return `'throw_directional: ${block.data.point}'`; }
    },
    throw_coordinate: {
      label:'Throw Coordinate', className:'fx',
      defaults:{ cmd:'-1;0;-1' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Similar to Throw Directional. Players will be thrown with a defined strength. 
          Use this format: <code>&lt;strength_x&gt;;&lt;strength_y&gt;;&lt;strength_z&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'throw_coordinate: ${escQ(block.data.cmd)}'`; }
    },
    close_inventory: {
      label:'Close Inventory', className:'cmd',
      render(body){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Closes the player opened inventory.
          </small>
        <div class="row single">
          <small style="opacity:.7;font-size:12px">
              This action has no arguments.
          </small>
        </div>`;
      },
      toYAML(){ return `'close_inventory'`; }
    },
    clear_inventory: {
      label:'Clear Inventory', className:'cmd',
      render(body){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Clears the player inventory.
          </small>
        <div class="row single">
          <small style="opacity:.7;font-size:12px">
              This action has no arguments.
          </small>
        </div>`;
      },
      toYAML(){ return `'clear_inventory'`; }
    },
    wait: {
      label:'Wait', className:'flow',
      defaults:{ point:1 },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Waits X amount of seconds before executing more actions.
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.point}" />
        </div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.point = parseInt(e.target.value||'0',10); update(); });
      },
      toYAML(block){ return `'wait: ${block.data.point}'`; }
    },
    wait_ticks: {
      label:'Wait Ticks', className:'flow',
      defaults:{ point:20 },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Waits X amount of ticks before executing more actions.
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.point}" />
        </div>
        <small style="opacity:.7;font-size:12px">
            20 ticks = 1 second. Example: 100 = 5 seconds.
        </small>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.point = parseInt(e.target.value||'0',10); update(); });
      },
      toYAML(block){ return `'wait_ticks: ${block.data.point}'`; }
    },
    remove_item: {
      label:'Remove Item', className:'cmd',
      defaults:{ cmd:'DIAMOND;5;name: Unique Diamond' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Removes X amount of items. Use this format: 
          <code>&lt;type&gt;;&lt;amount&gt;;datavalue:&lt;datavalue&gt;;name:&lt;name&gt;;lorecontains:&lt;lore_line&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        const note = renderNote(
          `Datavalue, name and lorecontains attributes are <strong>OPTIONAL</strong>. Don't use color formatting.`,
          { tone: 'warn', icon: 'alert', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'remove_item: ${escQ(block.data.cmd)}'`; }
    },
    remove_item_slot: {
      label:'Remove Item Slot', className:'cmd',
      defaults:{ cmd:'HAND;1' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Removes items from a slot. Use this format: <code>&lt;slot&gt;;&lt;amount&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'remove_item_slot: ${escQ(block.data.cmd)}'`; }
    },
    firework: {
      label:'Firework', className:'fx',
      defaults:{ cmd:'colors:YELLOW,RED type:BALL fade:AQUA power:0' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Spawns a firework. Use this format: 
          <code>colors:&lt;color1&gt;,&lt;color2&gt; type:&lt;type&gt; fade:&lt;color1&gt;,&lt;color2&gt; &lt;propertyN&gt;:&lt;valueN&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'firework: ${escQ(block.data.cmd)}'`; }
    },
    lightning_strike: {
      label:'Lightning Strike', className:'fx',
      defaults:{ cmd:'%victim_block_world%;%victim_block_x%;%victim_block_y%;%victim_block_z%' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Generates a lightning strike. Use this format: <code>&lt;world&gt;;&lt;x&gt;;&lt;y&gt;;&lt;z&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'lightning_strike: ${escQ(block.data.cmd)}'`; }
    },
    particle: {
      label:'Particle (1.9+)', className:'fx',
      defaults:{ cmd:'effect:EXPLOSION_LARGE offset:0.1;0.1;0.1 speed:1 amount:5 for_player:true' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Spawns a particle. Use this format: 
          <code>effect:&lt;effect_name&gt; offset:&lt;x&gt;;&lt;y&gt;;&lt;z&gt; speed:&lt;speed&gt; amount:&lt;amount&gt; force:&lt;true/false&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        const note = renderNote(
          `Works with all living entities when using the <strong>to_target</strong> action tag.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'particle: ${escQ(block.data.cmd)}'`; }
    },
    give_item: {
      label:'Give Item', className:'heal',
      defaults:{ cmd:'id:IRON_HELMET;amount:1;name:&6Basic Helmet' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Gives an item. Use this format: <code>id:&lt;id&gt;;&lt;property&gt;:&lt;value&gt;;&lt;propertyN&gt;:&lt;valueN&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'give_item: ${escQ(block.data.cmd)}'`; }
    },
    drop_item: {
      label:'Drop Item', className:'heal',
      defaults:{ cmd:'location:%block_x%,%block_y%,%block_z%,%block_world%;id:DIAMOND;name:&bUnique Diamond' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Drops an item. Use this format: 
          <code>location:&lt;x&gt;,&lt;y&gt;,&lt;z&gt;,&lt;world&gt;;id:&lt;id&gt;;&lt;property&gt;:&lt;value&gt;;&lt;propertyN&gt;:&lt;valueN&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'drop_item: ${escQ(block.data.cmd)}'`; }
    },
    set_block: {
      label:'Set Block (1.13+)', className:'cmd',
      defaults:{ cmd:'location:50,50,-256,world;id:DIAMOND_BLOCK' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Places a block. Use this format: 
          <code>location:&lt;x&gt;,&lt;y&gt;,&lt;z&gt;,&lt;world&gt;;id:&lt;id&gt;;block_data:&lt;block_data&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'set_block: ${escQ(block.data.cmd)}'`; }
    },
    summon: {
      label:'Summon', className:'fx',
      defaults:{ cmd:'location:0,68,0,spawn;entity:SHEEP' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Spawns an entity. Use this format: 
          <code>location:&lt;x&gt;,&lt;y&gt;,&lt;z&gt;,&lt;world&gt;;entity:&lt;entity&gt;;&lt;property&gt;:&lt;value&gt;;&lt;propertyN&gt;:&lt;valueN&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'summon: ${escQ(block.data.cmd)}'`; }
    },
    call_event: {
      label:'Call Event', className:'flow',
      defaults:{ cmd:'example2;%example_variable%=Something' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Executes another event. Use this format: <code>&lt;event_name&gt;;%variable1%=&lt;value1&gt;;&lt;variableN&gt;=&lt;valueN&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        const info = renderNote(
          `You can pass multiple variables to be used in a "call" event, but they are optional.`,
          { tone: 'info', icon: 'badgeInfo', dismissible: false }
        );
        body.prepend(info);

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'call_event: ${escQ(block.data.cmd)}'`; }
    },
    execute_action_group: {
      label:'Execute Action Group', className:'flow',
      defaults:{ cmd:'firework1:70;firework2:30;firework3:30' },
      render(body, block, update, ctx){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
          Executes an action group randomly. Use this format: 
          <code>&lt;group1&gt;:&lt;prob1&gt;;&lt;groupN&gt;:&lt;probN&gt;</code>
        </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;

        const info = renderNote(
          `If you only want to execute a single action group, not randomly, you can do it by using: <code>execute_action_group: &lt;group1&gt;:100</code>`,
          { tone: 'info', icon: 'badgeInfo', dismissible: false }
        );
        body.prepend(info);

        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'execute_action_group: ${escQ(block.data.cmd)}'`; }
    },
  },

  actionTo: {
    __meta: { label: '"To" Actions', color: 'var(--msg)' },
    to_all: {
      label:'To All', className:'flow',
      defaults:{ child: null }, // child: { subtype, data, id? }
      render(body, block, update, ctx){
        body.innerHTML = `
          <small style="opacity:1;font-size:14px;display:block;margin-bottom:8px">
            Drag an action here. It will execute the action for all players on the server.
          </small>
        `;

        // Zona de reemplazo que cubre todo el contenido (permite drop para reemplazar)
        const replaceZone = createZone(ctx.event, {
          type: 'to-slot',
          groupId: ctx.groupId,
          parentBlockId: block.id,
          accept: ['action', 'actionEvent']
        });
        replaceZone.style.padding = '0';
        replaceZone.style.border = '2px dashed rgba(255,255,255,.08)';
        replaceZone.style.borderRadius = '12px';
        replaceZone.style.minHeight = '64px';
        replaceZone.style.transition = 'border-color .15s ease, background .15s ease';
        replaceZone.style.position = 'relative';
        replaceZone.style.zIndex = '5';

        if (block.data.child) {
          const inner = block.data.child;

          const innerKind = inner.kind || ACTION_KINDS().find(k => REGISTRY[k]?.[inner.subtype]) || 'action';
          const meta = REGISTRY[innerKind]?.[inner.subtype];

          // Bloque interno con el MISMO diseño
          const innerBlock = document.createElement('div');
          innerBlock.className = `block ${blockClass('action', inner.subtype)}`;
          innerBlock.style.margin = '0'; // sin márgenes dentro del slot

          innerBlock.innerHTML = `
            <div class="block-head">
              <div>${meta?.label || inner.subtype}</div>
              <div class="tools">
                <button class="icon-btn danger" title="Quitar acción interna">${ICONS.trash}</button>
              </div>
            </div>
          `;

          const innerBody = document.createElement('div');
          innerBody.className = 'block-body';
          innerBlock.appendChild(innerBody);

          // Render original del action, pero apuntando a inner.data
          // (así sus inputs funcionan normal)
          const updateProxy = () => { update(); /* solo refresca YAML */ };
          meta?.render?.(
            innerBody,
            { id: inner.id || (inner.id = uid()), kind:'action', subtype: inner.subtype, data: inner.data },
            updateProxy,
            ctx
          );

          innerBlock.querySelector('.icon-btn.danger').addEventListener('click', ()=>{
            block.data.child = null;
            render();
          });

          // Quita el look "dashed" cuando ya hay algo dentro
          replaceZone.style.borderStyle = 'solid';
          replaceZone.appendChild(innerBlock);
        } else {
          // Hint cuando no hay nada
          const hint = document.createElement('div');
          hint.style.opacity = '.7';
          hint.style.fontSize = '12px';
          hint.style.padding = '12px';
          hint.textContent = 'Drop an action here (message, title, playsound, give_item, ...)';
          replaceZone.appendChild(hint);
        }

        body.appendChild(replaceZone);
      },
      toYAML(block){
        if (!block.data.child) {
          return `'to_all: message: &7(No inner action)'`;
        }
        const inner = block.data.child;
        const innerKind = inner.kind || ACTION_KINDS().find(k => REGISTRY[k]?.[inner.subtype]) || 'action';
        const meta = REGISTRY[innerKind]?.[inner.subtype];
        if (!meta || typeof meta.toYAML !== 'function') {
          return `'to_all: message: &7(Unsupported inner action)'`;
        }
        // Reusa el toYAML del action hijo y quita comillas externas
        const innerLine = meta.toYAML({ kind:'action', subtype: inner.subtype, data: inner.data }) || "'message: TODO'";
        const unquoted  = innerLine.replace(/^'(.*)'$/, '$1');
        return `'to_all: ${unquoted}'`;
      }
    },
    to_target: {
      label:'To Target', className:'flow',
      defaults:{ child: null }, // child: { subtype, data, id? }
      render(body, block, update, ctx){
        body.innerHTML = `
          <small style="opacity:1;font-size:14px;display:block;margin-bottom:8px">
            Drag an action here. It will execute the action for the target of the event.
          </small>
        `;

        const note = renderNote(
          `This can target both players and living entities, so you can use certain actions on entities as well.`,
          { tone: 'success', icon: 'circleCheckBig', dismissible: false }
        );
        body.prepend(note);

        // Zona de reemplazo que cubre todo el contenido (permite drop para reemplazar)
        const replaceZone = createZone(ctx.event, {
          type: 'to-slot',
          groupId: ctx.groupId,
          parentBlockId: block.id,
          accept: ['action', 'actionEvent']
        });
        replaceZone.style.padding = '0';
        replaceZone.style.border = '2px dashed rgba(255,255,255,.08)';
        replaceZone.style.borderRadius = '12px';
        replaceZone.style.minHeight = '64px';
        replaceZone.style.transition = 'border-color .15s ease, background .15s ease';
        replaceZone.style.position = 'relative';
        replaceZone.style.zIndex = '5';

        if (block.data.child) {
          const inner = block.data.child;

          const innerKind = inner.kind || ACTION_KINDS().find(k => REGISTRY[k]?.[inner.subtype]) || 'action';
          const meta = REGISTRY[innerKind]?.[inner.subtype];

          // Bloque interno con el MISMO diseño
          const innerBlock = document.createElement('div');
          innerBlock.className = `block ${blockClass('action', inner.subtype)}`;
          innerBlock.style.margin = '0'; // sin márgenes dentro del slot

          innerBlock.innerHTML = `
            <div class="block-head">
              <div>${meta?.label || inner.subtype}</div>
              <div class="tools">
                <button class="icon-btn danger" title="Quitar acción interna">${ICONS.trash}</button>
              </div>
            </div>
          `;

          const innerBody = document.createElement('div');
          innerBody.className = 'block-body';
          innerBlock.appendChild(innerBody);

          // Render original del action, pero apuntando a inner.data
          // (así sus inputs funcionan normal)
          const updateProxy = () => { update(); /* solo refresca YAML */ };
          meta?.render?.(
            innerBody,
            { id: inner.id || (inner.id = uid()), kind:'action', subtype: inner.subtype, data: inner.data },
            updateProxy,
            ctx
          );

          innerBlock.querySelector('.icon-btn.danger').addEventListener('click', ()=>{
            block.data.child = null;
            render();
          });

          // Quita el look "dashed" cuando ya hay algo dentro
          replaceZone.style.borderStyle = 'solid';
          replaceZone.appendChild(innerBlock);
        } else {
          // Hint cuando no hay nada
          const hint = document.createElement('div');
          hint.style.opacity = '.7';
          hint.style.fontSize = '12px';
          hint.style.padding = '12px';
          hint.textContent = 'Drop an action here (message, title, playsound, give_item, ...)';
          replaceZone.appendChild(hint);
        }

        body.appendChild(replaceZone);
      },
      toYAML(block){
        if (!block.data.child) {
          return `'to_target: message: &7(No inner action)'`;
        }
        const inner = block.data.child;
        const innerKind = inner.kind || ACTION_KINDS().find(k => REGISTRY[k]?.[inner.subtype]) || 'action';
        const meta = REGISTRY[innerKind]?.[inner.subtype];
        if (!meta || typeof meta.toYAML !== 'function') {
          return `'to_target: message: &7(Unsupported inner action)'`;
        }
        // Reusa el toYAML del action hijo y quita comillas externas
        const innerLine = meta.toYAML({ kind:'action', subtype: inner.subtype, data: inner.data }) || "'message: TODO'";
        const unquoted  = innerLine.replace(/^'(.*)'$/, '$1');
        return `'to_target: ${unquoted}'`;
      }
    },
    to_range: {
      label: 'To Range',
      className: 'flow',
      defaults: { radius: 10, includePlayer: true, child: null }, // child: { subtype, data, id? }
      render(body, block, update, ctx) {
        body.innerHTML = `
          <small style="opacity:1;font-size:14px;display:block;margin-bottom:8px">
            Executes the inner action for all players within a radius (in blocks).
          </small>
          <div class="row two" style="margin-bottom:8px">
            <div>
              <label style="opacity:.8;font-size:12px;display:block;margin:0 0 6px">Radius (blocks)</label>
              <input type="number" min="1" step="1" value="${block.data.radius}" />
            </div>
            <div>
              <label style="opacity:.8;font-size:12px;display:block;margin:0 0 6px">Include triggering player?</label>
              <select>
                <option value="true"  ${block.data.includePlayer ? 'selected':''}>true</option>
                <option value="false" ${!block.data.includePlayer ? 'selected':''}>false</option>
              </select>
            </div>
          </div>
        `;

        const [radiusInput, includeSel] = body.querySelectorAll('input, select');
        radiusInput.addEventListener('input', e => {
          block.data.radius = parseInt(e.target.value || '0', 10);
          update();
        });
        includeSel.addEventListener('change', e => {
          block.data.includePlayer = (e.target.value === 'true');
          update();
        });

        // Zona de reemplazo (igual que en to_target), para una sola acción hija
        const replaceZone = createZone(ctx.event, {
          type: 'to-slot',
          groupId: ctx.groupId,
          parentBlockId: block.id,
          accept: ['action', 'actionEvent']
        });
        replaceZone.style.padding = '0';
        replaceZone.style.border = '2px dashed rgba(255,255,255,.08)';
        replaceZone.style.borderRadius = '12px';
        replaceZone.style.minHeight = '64px';
        replaceZone.style.transition = 'border-color .15s ease, background .15s ease';
        replaceZone.style.position = 'relative';
        replaceZone.style.zIndex = '5';

        if (block.data.child) {
          const inner = block.data.child;

          const innerKind = inner.kind || ACTION_KINDS().find(k => REGISTRY[k]?.[inner.subtype]) || 'action';
          const meta = REGISTRY[innerKind]?.[inner.subtype];

          const innerBlock = document.createElement('div');
          innerBlock.className = `block ${blockClass('action', inner.subtype)}`;
          innerBlock.style.margin = '0';

          innerBlock.innerHTML = `
            <div class="block-head">
              <div>${meta?.label || inner.subtype}</div>
              <div class="tools">
                <button class="icon-btn danger" title="Quitar acción interna">${ICONS.trash}</button>
              </div>
            </div>
          `;

          const innerBody = document.createElement('div');
          innerBody.className = 'block-body';
          innerBlock.appendChild(innerBody);

          const updateProxy = () => { update(); }; // refresca YAML
          meta?.render?.(
            innerBody,
            { id: inner.id || (inner.id = uid()), kind:'action', subtype: inner.subtype, data: inner.data },
            updateProxy,
            ctx
          );

          innerBlock.querySelector('.icon-btn.danger').addEventListener('click', () => {
            block.data.child = null;
            render();
          });

          replaceZone.style.borderStyle = 'solid';
          replaceZone.appendChild(innerBlock);
        } else {
          const hint = document.createElement('div');
          hint.style.opacity = '.7';
          hint.style.fontSize = '12px';
          hint.style.padding = '12px';
          hint.textContent = 'Drop an action here (message, title, playsound, give_item, …)';
          replaceZone.appendChild(hint);
        }

        body.appendChild(replaceZone);
      },
      toYAML(block) {
        const radius = Number.isFinite(block.data.radius) ? block.data.radius : 10;
        const inc = block.data.includePlayer ? 'true' : 'false';

        if (!block.data.child) {
          return `'to_range: ${radius};${inc}: message: &7(No inner action)'`;
        }
        const inner = block.data.child;
        const innerKind = inner.kind || ACTION_KINDS().find(k => REGISTRY[k]?.[inner.subtype]) || 'action';
        const meta = REGISTRY[innerKind]?.[inner.subtype];
        if (!meta || typeof meta.toYAML !== 'function') {
          return `'to_range: ${radius};${inc}: message: &7(Unsupported inner action)'`;
        }
        // Reusar toYAML del hijo y quitar comillas externas
        const innerLine = meta.toYAML({ kind:'action', subtype: inner.subtype, data: inner.data }) || "'message: TODO'";
        const unquoted  = innerLine.replace(/^'(.*)'$/, '$1');
        return `'to_range: ${radius};${inc}: ${unquoted}'`;
      }
    },
    to_player: {
      label: 'To Player',
      className: 'flow',
      defaults: { player: '%player%', child: null },
      render(body, block, update, ctx) {
        body.innerHTML = `
          <small style="opacity:1;font-size:14px;display:block;margin-bottom:8px">
            Executes the inner action for a <b>specific player</b>.
          </small>
          <div class="row single" style="margin-bottom:8px">
            <input type="text" value="${block.data.player || '%player%'}" placeholder="%arg_1% / %player% / Notch" />
          </div>
        `;

        // input del jugador
        const inp = body.querySelector('input');
        inp.addEventListener('input', e => { block.data.player = e.target.value; update(); });

        // slot interno (solo actions normales)
        const replaceZone = createZone(ctx.event, {
          type: 'to-slot',
          groupId: ctx.groupId,
          parentBlockId: block.id,
          accept: ['action', 'actionEvent']
        });
        replaceZone.style.padding = '0';
        replaceZone.style.border = '2px dashed rgba(255,255,255,.08)';
        replaceZone.style.borderRadius = '12px';
        replaceZone.style.minHeight = '64px';
        replaceZone.style.transition = 'border-color .15s ease, background .15s ease';
        replaceZone.style.position = 'relative';
        replaceZone.style.zIndex = '5';

        if (block.data.child) {
          const inner = block.data.child;
          const innerKind = inner.kind || 'action';
          const meta = REGISTRY[innerKind]?.[inner.subtype];

          const innerBlock = document.createElement('div');
          innerBlock.className = `block ${blockClass('action', inner.subtype)}`;
          innerBlock.style.margin = '0';
          innerBlock.innerHTML = `
            <div class="block-head">
              <div>${meta?.label || inner.subtype}</div>
              <div class="tools">
                <button class="icon-btn danger" title="Quitar acción interna">${ICONS.trash}</button>
              </div>
            </div>
          `;
          const innerBody = document.createElement('div');
          innerBody.className = 'block-body';
          innerBlock.appendChild(innerBody);

          const updateProxy = () => { update(); };
          meta?.render?.(
            innerBody,
            { id: inner.id || (inner.id = uid()), kind: 'action', subtype: inner.subtype, data: inner.data },
            updateProxy,
            ctx
          );

          innerBlock.querySelector('.icon-btn.danger').addEventListener('click', () => {
            block.data.child = null;
            render();
          });

          replaceZone.style.borderStyle = 'solid';
          replaceZone.appendChild(innerBlock);
        } else {
          const hint = document.createElement('div');
          hint.style.opacity = '.7';
          hint.style.fontSize = '12px';
          hint.style.padding = '12px';
          hint.textContent = 'Drop an action here (message, title, playsound, give_item, …)';
          replaceZone.appendChild(hint);
        }

        body.appendChild(replaceZone);
      },
      toYAML(block) {
        const who = (block.data.player || '%player%').trim();
        if (!block.data.child) {
          return `'to_player: ${escQ(who)}: message: &7(No inner action)'`;
        }
        const inner = block.data.child;
        const innerKind = inner.kind || 'action';
        const meta = REGISTRY[innerKind]?.[inner.subtype];
        if (!meta || typeof meta.toYAML !== 'function') {
          return `'to_player: ${escQ(who)}: message: &7(Unsupported inner action)'`;
        }
        const innerLine = meta.toYAML({ kind:'action', subtype: inner.subtype, data: inner.data }) || "'message: TODO'";
        const unquoted  = innerLine.replace(/^'(.*)'$/, '$1');
        return `'to_player: ${escQ(who)}: ${unquoted}'`;
      }
    },
    to_condition: {
      label: 'To Condition',
      className: 'flow',
      defaults: { group: 'group1', child: null }, // child: { subtype, data, id? }
      render(body, block, update, ctx) {
        body.innerHTML = `
          <small style="opacity:1;font-size:14px;display:block;margin-bottom:8px">
            Executes the inner action for players that match a condition group defined in
            <code>Config → to_condition_groups</code>.
          </small>
          <div class="row single" style="margin-bottom:8px">
            <input type="text" value="${block.data.group || 'group1'}" placeholder="group1" />
          </div>
        `;

        const info = renderNote(
          `You can create multiple <b>to condition groups</b> following the same format as the usual conditions, excluding the "execute" option.`,
          { tone: 'info', icon: 'badgeInfo', dismissible: false }
        );
        body.prepend(info);

        // input de grupo
        const inp = body.querySelector('input');
        inp.addEventListener('input', e => { block.data.group = e.target.value; update(); });

        // slot interno (solo actions normales)
        const replaceZone = createZone(ctx.event, {
          type: 'to-slot',
          groupId: ctx.groupId,
          parentBlockId: block.id,
          accept: ['action', 'actionEvent']
        });
        replaceZone.style.padding = '0';
        replaceZone.style.border = '2px dashed rgba(255,255,255,.08)';
        replaceZone.style.borderRadius = '12px';
        replaceZone.style.minHeight = '64px';
        replaceZone.style.transition = 'border-color .15s ease, background .15s ease';
        replaceZone.style.position = 'relative';
        replaceZone.style.zIndex = '5';

        if (block.data.child) {
          const inner = block.data.child;
          const innerKind = inner.kind || 'action';
          const meta = REGISTRY[innerKind]?.[inner.subtype];

          const innerBlock = document.createElement('div');
          innerBlock.className = `block ${blockClass('action', inner.subtype)}`;
          innerBlock.style.margin = '0';
          innerBlock.innerHTML = `
            <div class="block-head">
              <div>${meta?.label || inner.subtype}</div>
              <div class="tools">
                <button class="icon-btn danger" title="Quitar acción interna">${ICONS.trash}</button>
              </div>
            </div>
          `;
          const innerBody = document.createElement('div');
          innerBody.className = 'block-body';
          innerBlock.appendChild(innerBody);

          const updateProxy = () => { update(); };
          meta?.render?.(
            innerBody,
            { id: inner.id || (inner.id = uid()), kind: 'action', subtype: inner.subtype, data: inner.data },
            updateProxy,
            ctx
          );

          innerBlock.querySelector('.icon-btn.danger').addEventListener('click', () => {
            block.data.child = null;
            render();
          });

          replaceZone.style.borderStyle = 'solid';
          replaceZone.appendChild(innerBlock);
        } else {
          const hint = document.createElement('div');
          hint.style.opacity = '.7';
          hint.style.fontSize = '12px';
          hint.style.padding = '12px';
          hint.textContent = 'Drop an action here (message, title, playsound, give_item, …)';
          replaceZone.appendChild(hint);
        }

        body.appendChild(replaceZone);
      },
      toYAML(block) {
        const group = (block.data.group || 'group1').trim() || 'group1';

        if (!block.data.child) {
          return `'to_condition: ${escQ(group)}: message: &7(No inner action)'`;
        }
        const inner = block.data.child;
        const innerKind = inner.kind || 'action';
        const meta = REGISTRY[innerKind]?.[inner.subtype];
        if (!meta || typeof meta.toYAML !== 'function') {
          return `'to_condition: ${escQ(group)}: message: &7(Unsupported inner action)'`;
        }
        const innerLine = meta.toYAML({ kind: 'action', subtype: inner.subtype, data: inner.data }) || "'message: TODO'";
        const unquoted = innerLine.replace(/^'(.*)'$/, '$1');
        return `'to_condition: ${escQ(group)}: ${unquoted}'`;
      }
    },
  },

  actionEvent: {
    __meta: { label: 'Event Actions', color: 'var(--msg)' },
    keep_items: {
      label: 'Keep Items',
      className: 'heal',
      defaults: { mode: 'items' },
      render(body, block, update, ctx) {
        const allowed = new Set(['player_death']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Allows the player to keep their items or xp on death.
          </small>

          <div class="row two">
            <label style="opacity:.8; align-self:center;">Select what the player will keep</label>
            <select>
              ${['items', 'xp', 'all']
                .map(mode => `<option ${block.data.mode === mode ? 'selected' : ''}>${mode}</option>`)
                .join('')}
            </select>
          </div>`;

        body.prepend(notice);
        const sel = body.querySelector('select');
        sel.addEventListener('change', e => {
          block.data.mode = e.target.value;
          update();
        });
      },
      toYAML(block) {
        return `'keep_items: ${block.data.mode}'`;
      }
    },
    cancel_drop: {
      label:'Cancel Drop (1.13+)', className:'danger',
      defaults:{ value:true },
      render(body, block, update, ctx){
        const allowed = new Set(['block_break','player_kill']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              It will completely cancel item drops from the block/entity.
          </small>
          <div class="row two">
            <label style="opacity:.8; align-self:center;">Cancel this event</label>
            <select>
              <option ${block.data.value?'selected':''} value="true">true</option>
              <option ${!block.data.value?'selected':''} value="false">false</option>
            </select>
          </div>`;
        body.prepend(notice);
        body.querySelector('select').addEventListener('change', e=>{ block.data.value = (e.target.value==='true'); update(); });
      },
      toYAML(block){ return `'cancel_drop: ${block.data.value ? 'true':'false'}'`; }
    },
    set_damage: {
      label: 'Set Damage',
      className: 'danger',
      defaults: { value: 10, mode: 'points' }, // points | percent
      render(body, block, update, ctx){
        const allowed = new Set(['player_attack','player_damage']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Allows to modify the final damage of the attack/damage taken.
          </small>

          <div class="row two" style="margin-top:4px">
            <div>
              <label style="opacity:.8;font-size:12px;display:block;margin:0 0 6px">Value</label>
              <input type="number" step="0.1" value="${block.data.value}" />
            </div>
            <div>
              <label style="opacity:.8;font-size:12px;display:block;margin:0 0 6px">Mode</label>
              <select>
                <option value="points"  ${block.data.mode==='points' ? 'selected':''}>Points (1 point = 1 half-heart)</option>
                <option value="percent" ${block.data.mode==='percent'? 'selected':''}>%</option>
              </select>
            </div>
          </div>
        `;

        body.prepend(notice);
        const [valInput, modeSel] = body.querySelectorAll('input, select');
        valInput.addEventListener('input', e => {
          const v = parseFloat(e.target.value || '0');
          block.data.value = Number.isFinite(v) ? v : 0;
          update();
        });
        modeSel.addEventListener('change', e => {
          block.data.mode = e.target.value === 'percent' ? 'percent' : 'points';
          update();
        });
      },
      toYAML(block){
        const v = (typeof block.data.value === 'number' && Number.isFinite(block.data.value)) ? block.data.value : 0;
        return `'set_damage: ${v}${block.data.mode==='percent' ? '%' : ''}'`;
      }
    },
    hide_join_message: {
      label:'Hide Join Message', className:'msg',
      defaults:{ value:true },
      render(body, block, update, ctx){
        const allowed = new Set(['player_join']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Allows to completely hide the player join message.
          </small>
          <div class="row two">
            <label style="opacity:.8; align-self:center;">Hide the player's join message?</label>
            <select>
              <option ${block.data.value?'selected':''} value="true">true</option>
              <option ${!block.data.value?'selected':''} value="false">false</option>
            </select>
          </div>`;
        body.prepend(notice);
        body.querySelector('select').addEventListener('change', e=>{ block.data.value = (e.target.value==='true'); update(); });
      },
      toYAML(block){ return `'hide_join_message: ${block.data.value ? 'true':'false'}'`; }
    },
    hide_leave_message: {
      label:'Hide Leave Message', className:'msg',
      defaults:{ value:true },
      render(body, block, update, ctx){
        const allowed = new Set(['player_leave']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Allows to completely hide the player leave message.
          </small>
          <div class="row two">
            <label style="opacity:.8; align-self:center;">Hide the player's leave message?</label>
            <select>
              <option ${block.data.value?'selected':''} value="true">true</option>
              <option ${!block.data.value?'selected':''} value="false">false</option>
            </select>
          </div>`;
        body.prepend(notice);
        body.querySelector('select').addEventListener('change', e=>{ block.data.value = (e.target.value==='true'); update(); });
      },
      toYAML(block){ return `'hide_leave_message: ${block.data.value ? 'true':'false'}'`; }
    },
    set_death_message: {
      label:'Set Death Message', className:'msg',
      defaults:{ text:'Enter your message here...' },
      render(body, block, update, ctx){
        const allowed = new Set(['player_death']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Allows to replace the player death message with a custom one. You can set it to "no" to hide the death message.
          </small>
          <div class="row single"><input type="text" value="${block.data.text}" /></div>`;
        body.prepend(notice);
        body.querySelector('input').addEventListener('input', e=>{ block.data.text = e.target.value; update(); });
      },
      toYAML(block){ return `'set_death_message: ${escQ(block.data.text)}'`; }
    },
    prevent_join: {
      label:'Prevent Join', className:'danger',
      defaults:{ text:'Enter your message here...' },
      render(body, block, update, ctx){
        const allowed = new Set(['player_pre_join']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Prevents the player from joining the server, with a custom message.
          </small>
          <div class="row single"><input type="text" value="${block.data.text}" /></div>`;
        body.prepend(notice);
        body.querySelector('input').addEventListener('input', e=>{ block.data.text = e.target.value; update(); });
      },
      toYAML(block){ return `'prevent_join: ${escQ(block.data.text)}'`; }
    },
    set_item: {
      label:'Set Item', className:'heal',
      defaults:{ text:'id:DIAMOND;name:&bSuspicious Diamond' },
      render(body, block, update, ctx){
        const allowed = new Set(['player_fish']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Allows to modify the item caught by the player. Use this format: "id:&lt;id&gt;;&lt;property&gt;:&lt;value&gt;;&lt;propertyN&gt;:&lt;valueN&gt;"
          </small>
          <div class="row single"><input type="text" value="${block.data.text}" /></div>`;
        body.prepend(notice);
        body.querySelector('input').addEventListener('input', e=>{ block.data.text = e.target.value; update(); });
      },
      toYAML(block){ return `'set_item: ${escQ(block.data.text)}'`; }
    },
    set_event_xp: {
      label:'Set Event XP', className:'heal',
      defaults:{ points:0 },
      render(body, block, update, ctx){
        const allowed = new Set(['block_break','player_fish']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Allows to modify the xp dropped when breaking a block or fishing. Set to 0 to prevent xp from being dropped.
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.points}" />
        </div>`;
        body.prepend(notice);
        body.querySelector('input').addEventListener('input', e=>{ block.data.points = parseInt(e.target.value||'0',10); update(); });
      },
      toYAML(block){ return `'set_event_xp: ${block.data.points}'`; }
    },
    tab_complete: {
      label:'Tab Complete', className:'cmd',
      defaults:{ text:'set;<arg1>,<arg2>,<argN>' },
      render(body, block, update, ctx){
        const allowed = new Set(['player_tab_complete']);
        const notice = renderEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Allows to modify the commands arguments displayed for the player in chat.
          </small>
          <div class="row single"><input type="text" value="${block.data.text}" /></div>`;
        body.prepend(notice);
        body.querySelector('input').addEventListener('input', e=>{ block.data.text = e.target.value; update(); });
      },
      toYAML(block){ return `'tab_complete: ${escQ(block.data.text)}'`; }
    },
  },

  setting: {
    __meta: { label: 'Settings', color: 'var(--setting)' },
    ignore_with_permission: {
      label:'Ignore With Permission', className:'setting',
      defaults:{ perm:'conditionalevents.ignore.example' },
      settingKey:'ignore_with_permission',
      render(body, block, update, ctx){
        body.innerHTML = `
        <small style="opacity:1;font-size:14px;display:block;margin-bottom:8px">
            You can set a permission to completely ignore this event. If the player accomplishes the conditions having this permission, actions will not be executed for him.
          </small>
        <div class="row single">
          <input type="text" value="${block.data.perm}" placeholder="conditionalevents.ignore.<id>" />
        </div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.perm = e.target.value; update(); });
      }
    },
    ignore_if_cancelled: {
      label: 'Ignore If Cancelled',
      className: 'setting',
      defaults: { value: true },
      settingKey: 'ignore_if_cancelled',
      render(body, block, update, ctx) {
        body.innerHTML = `
          <small style="opacity:1;font-size:14px">
            When this option is enabled, it will prevent the execution if the event was already cancelled by another plugin.
          </small>
          <div class="row single" style="align-items:center">
            <select>
              <option value="true"  ${block.data.value ? 'selected' : ''}>true</option>
              <option value="false" ${!block.data.value ? 'selected' : ''}>false</option>
            </select>
          </div>
        `;

        body.querySelector('select').addEventListener('change', e => {
          block.data.value = (e.target.value === 'true');
          update();
        });
      }
    },
    allow_math_formulas_in_conditions: {
      label: 'Allow Math formulas in Conditions',
      className: 'setting',
      defaults: { value: true },
      settingKey: 'allow_math_formulas_in_conditions',
      render(body, block, update, ctx) {
        body.innerHTML = `
          <small style="opacity:1;font-size:14px">
            If you want to compare formulas in the conditions of an event, you must enable this option.
          </small>
          <div class="row single" style="align-items:center">
            <select>
              <option value="true"  ${block.data.value ? 'selected' : ''}>true</option>
              <option value="false" ${!block.data.value ? 'selected' : ''}>false</option>
            </select>
          </div>
        `;

        body.querySelector('select').addEventListener('change', e => {
          block.data.value = (e.target.value === 'true');
          update();
        });
      }
    },
    one_time: {
      label: 'One Time',
      className: 'setting',
      defaults: { value: true },
      settingKey: 'one_time',
      render(body, block, update, ctx) {
        body.innerHTML = `
          <small style="opacity:1;font-size:14px">
            If is set to true, players will execute the actions of this event just once. You can also set an action group that will execute when a player accomplishes the conditions again, but already had executed the default actions.
          </small>
          <div class="row single" style="align-items:center">
            <select>
              <option value="true"  ${block.data.value ? 'selected' : ''}>true</option>
              <option value="false" ${!block.data.value ? 'selected' : ''}>false</option>
            </select>
          </div>
        `;

        const note = renderNote(
          `The action group <strong>MUST</strong> be called "one_time".`,
          { tone: 'warn', icon: 'alert', dismissible: false }
        );
        body.prepend(note);

        body.querySelector('select').addEventListener('change', e => {
          block.data.value = (e.target.value === 'true');
          update();
        });
      }
    },
    cooldown: {
      label:'Cooldown', className:'setting',
      defaults:{ seconds:20 },
      settingKey:'cooldown',
      render(body, block, update, ctx){
        body.innerHTML = `
        <small style="opacity:1;font-size:14px;display:block;margin-bottom:8px">
            Here you can define a cooldown for this event. If the player accomplishes the conditions, the player will need to wait certain time before executing the actions again. Write the cooldown in seconds. You can also set an action group that will execute when a players accomplishes the conditions again but is in cooldown.
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.seconds}" />
        </div>`;

        const note = renderNote(
          `The action group <strong>MUST</strong> be called "cooldown".`,
          { tone: 'warn', icon: 'alert', dismissible: false }
        );
        body.prepend(note);

        const info = renderNote(
          `OP players will bypass the cooldown so make sure you are not OP when testing this feature.`,
          { tone: 'info', icon: 'badgeInfo', dismissible: false }
        );
        body.prepend(info);

        body.querySelector('input').addEventListener('input', e=>{ block.data.seconds = parseInt(e.target.value||'0',10); update(); });
      }
    },
    enabled: {
      label: 'Enabled',
      className: 'setting',
      defaults: { value: true },
      settingKey: 'enabled',
      render(body, block, update, ctx) {
        body.innerHTML = `
          <small style="opacity:1;font-size:14px">
            Set this option to false to disable the event without removing it from the config. If you want the event to be active just set it to true or remove this option.
          </small>
          <div class="row single" style="align-items:center">
            <select>
              <option value="true"  ${block.data.value ? 'selected' : ''}>true</option>
              <option value="false" ${!block.data.value ? 'selected' : ''}>false</option>
            </select>
          </div>
        `;

        body.querySelector('select').addEventListener('change', e => {
          block.data.value = (e.target.value === 'true');
          update();
        });
      }
    },
    repetitive_time: {
      label:'Repetitive Time', className:'setting',
      defaults:{ ticks:20 },
      settingKey:'repetitive_time',
      render(body, block, update, ctx){
        const allowed = new Set(['repetitive','repetitive_server']);
        const notice = renderSettingEventCompatibilityNotice(allowed, ctx);

        body.innerHTML = `
        <small style="opacity:1;font-size:14px;display:block;margin-bottom:8px">
            This setting defines the period of time in ticks when checking the conditions.
          </small>
        <div class="row single">
          <input type="number" min="1" step="1" value="${block.data.ticks}" />
        </div>
        <small style="opacity:.7;font-size:12px">
            20 ticks = 1 second. Example: 100 = 5 seconds.
        </small>`;
        
        body.prepend(notice);
        body.querySelector('input').addEventListener('input', e=>{ block.data.ticks = parseInt(e.target.value||'0',10); update(); });
      }
    },
    custom_event_data: {
      label: 'Custom Event Data',
      className: 'setting',
      defaults: {
        event: '',
        player_variable: '',
        variables: []
      },
      settingKey: 'custom_event_data',
      render(body, block, update){
        block.data = Object.assign({ event: '', player_variable: '', variables: [] }, block.data || {});
        if (!Array.isArray(block.data.variables)) {
          const fallback = Array.isArray(block.data.variables_to_capture) ? block.data.variables_to_capture : [];
          block.data.variables = fallback.filter(Boolean).map(v => String(v));
        }
        block.data.variables_to_capture = Array.isArray(block.data.variables)
          ? block.data.variables.slice()
          : [];
        const varsText = block.data.variables.join('\n');
        body.innerHTML = `
          <small style="opacity:1;font-size:14px;display:block;margin-bottom:12px">
            Configure the event class, optional player accessor, and any variables to capture for this custom event.
          </small>
          <div class="row single" style="gap:8px; align-items:center;">
            <label style="opacity:.8;font-size:12px;min-width:110px">Event class</label>
            <input type="text" value="${block.data.event || ''}" placeholder="com.example.plugin.MyEvent" />
          </div>
          <div class="row single" style="gap:8px; align-items:center; margin-top:8px;">
            <label style="opacity:.8;font-size:12px;min-width:110px">Player variable</label>
            <input type="text" value="${block.data.player_variable || ''}" placeholder="getPlayer()" />
          </div>
          <div class="row single" style="flex-direction:column; align-items:stretch; margin-top:12px; gap:6px;">
            <label style="opacity:.8;font-size:12px;">Variables to capture</label>
            <textarea rows="4" placeholder="%placeholder%;method()" style="min-height:96px">${varsText}</textarea>
            <small style="opacity:.7;font-size:11px;">Write one entry per line using the format <code>%variable%;method()</code>.</small>
          </div>
        `;

        const [eventInput, playerInput] = body.querySelectorAll('input');
        const textarea = body.querySelector('textarea');

        eventInput.addEventListener('input', e => {
          block.data.event = e.target.value;
          update();
        });

        playerInput.addEventListener('input', e => {
          block.data.player_variable = e.target.value;
          update();
        });

        textarea.addEventListener('input', e => {
          const entries = e.target.value
            .split(/\n+/)
            .map(v => v.trim())
            .filter(Boolean);
          block.data.variables = entries;
          block.data.variables_to_capture = entries.slice();
          update();
        });
      }
    },
  }
};

const ICONS = {
  alert: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-triangle-alert">
  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
  <path d="M12 9v4"/>
  <path d="M12 17h.01"/>
</svg>`,
  chevronDown: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-chevron-down">
  <path d="m6 9 6 6 6-6"/>
</svg>`,
  trash: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-trash">
  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
  <path d="M3 6h18"/>
  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
</svg>`,
  cloudUpload: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-cloud-upload">
  <path d="M12 13v8"/>
  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
  <path d="m8 17 4-4 4 4"/>
</svg>`,
  clipboardPaste: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-clipboard-paste">
  <path d="M11 14h10"/>
  <path d="M16 4h2a2 2 0 0 1 2 2v1.344"/>
  <path d="m17 18 4-4-4-4"/>
  <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/>
  <rect x="8" y="2" width="8" height="4" rx="1"/>
</svg>`,
  circleCheckBig: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-circle-check-big">
  <path d="M21.801 10A10 10 0 1 1 17 3.335"/>
  <path d="m9 11 3 3L22 4"/>
</svg>`,
  badgeInfo: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-badge-info">
  <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
  <line x1="12" x2="12" y1="16" y2="12"/>
  <line x1="12" x2="12.01" y1="8" y2="8"/>
</svg>`,
  octagonAlert: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-octagon-alert">
  <path d="M12 16h.01"/>
  <path d="M12 8v4"/>
  <path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/>
</svg>`,
  panelRightClose: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-panel-right-close">
  <rect width="18" height="18" x="3" y="3" rx="2"/>
  <path d="M15 3v18"/>
  <path d="m8 9 3 3-3 3"/>
</svg>`,
};

/* ---------- Helpers / UX ---------- */
window.addEventListener("beforeunload", (e) => {
  if (state.events.length > 0) {
    e.preventDefault();
    e.returnValue = "If you reload the page, you will lose all the data in the builder.";
    return e.returnValue;
  }
});

function resolveEventLabel(key){
  for (const [kind, items] of Object.entries(REGISTRY)){
    if (kind.startsWith('event') && items[key]?.label) return items[key].label;
  }
  return key.replace(/_/g,' ').toLowerCase();
}

// Devuelve HTML con la lista de eventos en el estilo deseado
function formatEventList(allowed, {style='code'} = {}){
  const arr = asArray(allowed).filter(Boolean).sort();
  return arr.map(k => {
    const label = resolveEventLabel(k);
    if (style === 'label') return `<strong>${label}</strong>`;
    if (style === 'both')  return `<code><strong>${k}</strong></code> <small style="opacity:.7">(${label})</small>`;
    // default: keys en monoespaciado
    return `<code><strong>${k}</strong></code>`;
  }).join(' / ');
}

// Banner genérico "solo surte efecto en X eventos"
function onlyOnEventsNotice(allowed, {tone='amber', style='code'} = {}){
  const wrap = document.createElement('div');
  wrap.className = `notice notice-${tone}`;
  wrap.innerHTML = `
    <div class="icon" aria-hidden="true">${ICONS.alert}</div>
    <div class="content">
      This action only takes effect on ${formatEventList(allowed, {style})} events.
    </div>`;
  return wrap;
}

// 🔧 Renderiza un aviso de compatibilidad con eventos
const NOTICE_TONES = {
  info:    '#60a5fa',
  success: '#22c55e',
  warn:    '#facc15',
  error:   '#f87171',
  violet:  '#a78bfa'
};

function renderNote(html, { tone='info', icon='info', compact=false, dismissible=false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'notice';
  wrap.style.setProperty('--ink', NOTICE_TONES[tone] || tone); // acepta hex custom
  wrap.innerHTML = `
    <div class="icon" aria-hidden="true">${ICONS[icon] || ICONS.alert}</div>
    <div class="content">${html}</div>
  `;
  if (compact) wrap.style.padding = '2px 2px';

  if (dismissible) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.style.marginLeft = 'auto';
    btn.innerHTML = '✕';
    btn.addEventListener('click', () => wrap.remove());
    wrap.appendChild(btn);
  }
  return wrap;
}

function renderEventCompatibilityNotice(allowed, ctx, {style='code'} = {}) {
  const allowedArr = Array.from(allowed || []);
  const currentType = ctx?.event?.type || '';
  const notApplies = !allowedArr.includes(currentType);

  const tone = notApplies ? 'error' : 'warn';
  const wrap = document.createElement('div');
  wrap.className = `notice ${tone === 'error' ? 'error' : 'warn'}`;

  // construimos lista de eventos aceptados
  const eventsHTML = allowedArr
    .map(k => `<code><strong>${k}</strong></code>`)
    .join(' / ');

  wrap.innerHTML = `
    <div class="icon" aria-hidden="true">${ICONS.alert}</div>
    <div class="content">
      This action only takes effect on ${eventsHTML} events.
      ${notApplies
        ? `<br><span style="opacity:.8">
             Current event: <code>${currentType || 'none'}</code>. It won’t take effect.
           </span>`
        : ''}
    </div>
  `;
  return wrap;
}

function renderSettingEventCompatibilityNotice(allowed, ctx, {style='code'} = {}) {
  const allowedArr = Array.from(allowed || []);
  const currentType = ctx?.event?.type || '';
  const notApplies = !allowedArr.includes(currentType);

  const tone = notApplies ? 'error' : 'warn';
  const wrap = document.createElement('div');
  wrap.className = `notice ${tone === 'error' ? 'error' : 'warn'}`;

  // construimos lista de eventos aceptados
  const eventsHTML = allowedArr
    .map(k => `<code><strong>${k}</strong></code>`)
    .join(' / ');

  wrap.innerHTML = `
    <div class="icon" aria-hidden="true">${ICONS.alert}</div>
    <div class="content">
      This setting only takes effect on ${eventsHTML} events.
      ${notApplies
        ? `<br><span style="opacity:.8">
             Current event: <code>${currentType || 'none'}</code>. It won’t take effect.
           </span>`
        : ''}
    </div>
  `;
  return wrap;
}

function renderMissingEventTypeNotice(){
  const wrap = document.createElement('div');
  wrap.className = 'notice error';
  wrap.style.margin = '12px';
  wrap.innerHTML = `
    <div class="icon" aria-hidden="true">${ICONS.alert}</div>
    <div class="content">
      This event has no trigger assigned yet. Drag an Event chip from the palette into the top area.
      Until then, its conditions and actions will never run.
    </div>
  `;
  return wrap;
}

let paletteObserver = null;

function buildPaletteNav(){
  const nav = document.getElementById('paletteNav');
  const palette = document.getElementById('palette');
  nav.innerHTML = '';

  Object.entries(REGISTRY).forEach(([kind, items])=>{
    const meta = items.__meta || { label: kind, color:'#888' };
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.target = `sec-${kind}`;
    btn.innerHTML = `
      <span class="dot" style="background:${meta.color}"></span>
      <span class="label">${meta.label}</span>
    `;
    btn.addEventListener('click', ()=>{
      const target = document.getElementById(btn.dataset.target);
      if(target) palette.scrollTo({ top: target.offsetTop-6, behavior:'smooth' });
    });
    nav.appendChild(btn);
  });

  // intersection observer igual que antes
}

function applyPaletteFilter(){
  const palette = document.getElementById('palette');
  const nav = document.getElementById('paletteNav');
  const query = paletteSearchQuery.trim().toLowerCase();

  if(!palette || !nav) return;

  const sections = palette.querySelectorAll('.palette-section');
  sections.forEach(section => {
    const chips = Array.from(section.querySelectorAll('.chip'));
    let matches = 0;
    chips.forEach(chip => {
      const label = chip.textContent.toLowerCase();
      const isMatch = !query || label.includes(query);
      chip.classList.toggle('is-hidden', !isMatch);
      if(isMatch) matches++;
    });

    const hasMatches = matches > 0;
    section.classList.toggle('is-hidden', !hasMatches);

    const navBtn = nav.querySelector(`button[data-target="${section.id}"]`);
    if(navBtn){
      navBtn.classList.toggle('is-hidden', !hasMatches);
    }
  });

  const visibleSections = Array.from(sections).some(section => !section.classList.contains('is-hidden'));
  const hideNav = query !== '' && !visibleSections;
  nav.classList.toggle('is-hidden', hideNav);

  const grid = nav.parentElement;
  if(grid && grid.classList.contains('palette-grid')){
    grid.classList.toggle('nav-hidden', hideNav);
  }
}

function buildPalette(){
  const palette = document.getElementById('palette');
  palette.innerHTML = '';

  Object.entries(REGISTRY).forEach(([kind, items])=>{
    const meta = items.__meta || { label: kind, color: '#888' };
    const sec = document.createElement('div');
    sec.className = 'palette-section';
    sec.id = `sec-${kind}`;
    sec.dataset.kind = kind;
    sec.innerHTML = `<div class="palette-title">${meta.label}</div>`;

    Object.entries(items).forEach(([subtype, block])=>{
      if(subtype === '__meta') return;
      const chip = document.createElement('div');
      chip.className = `chip ${block.className}`;
      chip.textContent = block.label;
      chip.dataset.kind = kind;
      chip.dataset.subtype = subtype;
      chip.setAttribute('draggable','true');
      sec.appendChild(chip);
    });

    palette.appendChild(sec);
  });

  setupDragAndTouch();
  buildPaletteNav();
  applyPaletteFilter();
}

/* ---------- Event CRUD (con Action Groups) ---------- */
function newEventSkeleton(name){
  return {
    id: uid(),
    name,
    type: null,
    collapsed: false,
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

  const isTouchDevice = (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );

  // Desktop native DnD
  if (!isTouchDevice) {
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
  } else {
    palette.querySelectorAll('.chip').forEach(chip => chip.removeAttribute('draggable'));
  }

  // Touch (mobile) — long-press to start drag sin romper el scroll
  let pressedChip = null;
  let pressTimer = null;
  let startX = 0, startY = 0;
  let draggingTouch = false;

  const clearPress = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  };

  palette.addEventListener('touchstart', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    // No prevenimos por defecto: dejamos que el scroll funcione
    pressedChip = chip;
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    draggingTouch = false;

    pressTimer = setTimeout(() => {
      // Long-press confirmado => empezamos drag
      draggingTouch = true;
      state.dragData = { kind: chip.dataset.kind, subtype: chip.dataset.subtype };
      chip.classList.add('dragging');
      document.body.classList.add('no-select');
      if (navigator.vibrate) navigator.vibrate(10);
    }, LONG_PRESS_MS);
  }, { passive: true });

  palette.addEventListener('touchmove', (e) => {
    if (!pressedChip) return;

    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const moved = Math.hypot(dx, dy);

    if (!draggingTouch) {
      // Aún no estamos en drag: si el usuario se movió (scroll), cancelamos
      if (moved > MOVE_TOLERANCE) {
        clearPress();
        pressedChip = null; // permitimos que siga el scroll normal
      }
      return; // importantísimo: NO prevenimos para no bloquear el scroll
    }

    // Ya estamos en drag: prevenimos para que no haga scroll
    e.preventDefault();
    const el = document.elementFromPoint(t.clientX, t.clientY);
    document.querySelectorAll('.zone').forEach(z => z.classList.remove('over'));
    el?.closest('.zone')?.classList.add('over');
  }, { passive: false });

  palette.addEventListener('touchend', (e) => {
    if (!pressedChip && !draggingTouch) return;

    clearPress();
    const chip = pressedChip;
    const wasDragging = draggingTouch;

    pressedChip = null;
    draggingTouch = false;
    chip?.classList.remove('dragging');
    document.body.classList.remove('no-select');

    if (!wasDragging) return;

    const t = e.changedTouches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const zone = el?.closest('.zone');

    if (zone && state.dragData) {
      const card = zone.closest('.event-card');
      const eventId = card?.dataset.eventId;
      const ztype = zone.dataset.zoneType;
      const groupId = zone.dataset.groupId || null;
      const parentBlockId = zone.dataset.parentBlockId || null;

      // === Lista de tipos permitidos por zona (mismo criterio que createZone) ===
      const ALLOWED = {
        'to-slot': ['action'], // SOLO acciones reales
        'action-group': ['action', 'actionTo', 'actionEvent'], // SOLO acciones reales
        'non-action': [
          'condition',
          'setting',
          'eventType',
          'eventPlayerType',
          'eventBlockType',
          'eventItemType',
          'eventOtherType',
          'eventPluginsType'
        ]
      };
      const allowedKinds = ALLOWED[ztype] || [];

      // Filtro duro: si el kind no es aceptado por la zona, se ignora
      if (!allowedKinds.includes(state.dragData.kind)) {
        // feedback opcional
        if (navigator.vibrate) navigator.vibrate(5);
        state.dragData = null;
        document.querySelectorAll('.zone').forEach(z => z.classList.remove('over'));
        return;
      }

      if (eventId) {
        if (ztype === 'to-slot' && parentBlockId) {
          const ev = state.events.find(x=>x.id===eventId);
          const g  = groupId ? ev.actionGroups.find(x=>x.id===groupId)
                            : (ev.actionGroups.find(x=>x.name==='default') || ev.actionGroups[0]);
          if (ev && g) {
            const toBlock = g.blocks.find(b=>b.id===parentBlockId);
            const meta = REGISTRY[state.dragData.kind]?.[state.dragData.subtype];
            if (toBlock && meta) {
              // Guard final por si llega un wrapper (no debería por ALLOWED)
              if (state.dragData.kind !== 'action') {
                if (navigator.vibrate) navigator.vibrate(5);
                state.dragData = null;
                document.querySelectorAll('.zone').forEach(z => z.classList.remove('over'));
                return;
              }
              toBlock.data.child = {
                id: uid(),
                kind: 'action', // ← forzamos a acción real
                subtype: state.dragData.subtype,
                data: deepClone(meta.defaults || {})
              };
              render();
            }
          }
        } else {
          // Zonas normales (validado arriba)
          addBlock(eventId, state.dragData.kind, state.dragData.subtype, { groupId, zoneType: ztype });
        }
      }
    }

    state.dragData = null;
    document.querySelectorAll('.zone').forEach(z => z.classList.remove('over'));
  }, { passive: true });

  palette.addEventListener('touchcancel', () => {
    clearPress();
    pressedChip?.classList.remove('dragging');
    pressedChip = null;
    draggingTouch = false;
    state.dragData = null;
    document.body.classList.remove('no-select');
    document.querySelectorAll('.zone').forEach(z => z.classList.remove('over'));
  });
}

function createZone(ev, { type, groupId=null, accept, parentBlockId=null }){
  const z = document.createElement('div');
  z.className = 'zone';
  z.dataset.zoneType = type;
  if (groupId) z.dataset.groupId = groupId;
  if (parentBlockId) z.dataset.parentBlockId = parentBlockId;

  const over = (e)=>{
    e.preventDefault();
    e.stopPropagation(); // <- evita que el zone de abajo también reciba el evento
    z.classList.add('over');
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };
  const leave = (e)=>{
    e.stopPropagation();
    z.classList.remove('over');
  };
  const drop = (e)=>{
    e.preventDefault();
    e.stopPropagation();
    z.classList.remove('over');
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!accept.includes(payload.kind)) return;

      // --- SLOT INTERNO (to-slot) ---
      if (type === 'to-slot' && parentBlockId) {
        const g = groupId
          ? ev.actionGroups.find(x=>x.id===groupId)
          : (ev.actionGroups.find(x=>x.name==='default') || ev.actionGroups[0]);
        if (!g) return;
        const toBlock = g.blocks.find(x=>x.id===parentBlockId);
        if (!toBlock) return;

        const meta = getActionMeta(payload.kind, payload.subtype);
        if (!meta) return;

        toBlock.data.child = {
          id: uid(),
          kind: payload.kind,
          subtype: payload.subtype,
          data: deepClone(meta.defaults || {})
        };
        render();
        return;
      }

      // --- NORMAL ---
      addBlock(ev.id, payload.kind, payload.subtype, {
        groupId,
        zoneType: type,
        parentBlockId
      });
    } catch (err) {
      console.warn(err);
    }
  };

  z.addEventListener('dragover', over);
  z.addEventListener('dragenter', over);
  z.addEventListener('dragleave', leave);
  z.addEventListener('drop', drop);

  return z;
}

/* ---------- Add/Remove/Move blocks ---------- */
function addBlock(eventId, kind, subtype, opts={}){
  const ev = state.events.find(x=>x.id===eventId);
  if(!ev) return;

  if (isEventKind(kind)) {
    ev.type = subtype;         // <- AQUÍ está la magia
    render();
    return;
  }

  if (isActionKind(kind)) {
    let group = null;
    if(opts.groupId) group = ev.actionGroups.find(g=>g.id===opts.groupId);
    if(!group) group = ev.actionGroups.find(g=>g.name==='default') || ev.actionGroups[0];

    const meta = getActionMeta(kind, subtype);
    if(!meta){ console.warn('Unknown action', kind, subtype); return; }

    group.blocks.push({ id: uid(), kind, subtype, data: deepClone(meta.defaults || {}) });
    render();
    return;
  }

  // --- SLOT INTERNO (to_target) ---
  if (isActionKind(kind) && opts.zoneType === 'to-slot' && opts.parentBlockId) {
    // busca el bloque contenedor dentro de sus grupos
    let parent = null;
    for (const g of ev.actionGroups) {
      const b = g.blocks.find(bb => bb.id === opts.parentBlockId);
      if (b) { parent = b; break; }
    }
    if (!parent) return;

    // evita recursión
    if (subtype === 'to_target') return;

    const meta = REGISTRY.action?.[subtype];
    if (!meta) return;

    // asigna/ reemplaza el hijo único
    parent.data = parent.data || {};
    parent.data.child = {
      subtype,
      data: deepClone(meta.defaults || {})
    };

    render(); // re-pintar para que se vea el preview y el botón de borrar
    return;
  }

  // --- Lógica NORMAL ya existente ---
  if (kind==='action') {
    let group = null;
    if(opts.groupId) group = ev.actionGroups.find(g=>g.id===opts.groupId);
    if(!group){
      group = ev.actionGroups.find(g=>g.name==='default') || ev.actionGroups[0];
    }
    const meta = REGISTRY.action?.[subtype];
    if(!meta){ console.warn('Unknown action', subtype); return; }
    group.blocks.push({ id: uid(), kind, subtype, data: deepClone(meta.defaults || {}) });
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
    card.classList.toggle('is-collapsed', Boolean(ev.collapsed));

    // header
    const head = document.createElement('div');
    head.className = 'event-top';
    const eventLabel = ev.type
      ? ('Event: '+ (Object.values(REGISTRY).find(cat => cat[ev.type])?.[ev.type]?.label || ev.type))
      : '<em>Drag an Event type here</em>';
    head.innerHTML = `
      <div class="event-title">
        <button class="icon-btn event-collapse" type="button" aria-expanded="${ev.collapsed ? 'false' : 'true'}" title="${ev.collapsed ? 'Expand event' : 'Collapse event'}" aria-label="${ev.collapsed ? 'Expand event' : 'Collapse event'}">${ICONS.chevronDown}</button>
        <input class="event-name" value="${ev.name}" title="Event name" />
      </div>
      <div class="event-type">
        ${eventLabel}
        <button class="icon-btn danger event-del" title="Delete event" aria-label="Delete event">${ICONS.trash}</button>
      </div>`;
    const collapseBtn = head.querySelector('.event-collapse');
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      ev.collapsed = !ev.collapsed;
      render();
    });
    head.querySelector('.event-del').addEventListener('click', ()=>{
      if (confirm(`Delete the event "${ev.name}"?`)) removeEventCompletely(ev.id);
    });
    head.querySelector('.event-name').addEventListener('input', (e)=>{ ev.name = e.target.value; updateYAML(); });
    card.appendChild(head);

    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'event-body';

    if (!ev.type) {
      bodyContainer.appendChild(renderMissingEventTypeNotice());
    }

    // sección no-actions (conditions + settings)
    const nonActionZone = createZone(ev, {
      type: 'non-action',
      accept: [
        'condition', 
        'setting', 
        'eventType', 
        'eventPlayerType', 
        'eventBlockType', 
        'eventItemType', 
        'eventOtherType', 
        'eventPluginsType'
      ]
    });
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
            <button class="icon-btn" title="Eliminar">${ICONS.trash}</button>
          </div>
        </div>`;
      const body = document.createElement('div');
      body.className = 'block-body';
      meta?.render?.(body, b, updateYAML, { event: ev });
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
    hintNA.textContent = 'Drag events, conditions, or settings here...';
    nonActionZone.appendChild(hintNA);
    nonActionWrap.appendChild(nonActionZone);
    bodyContainer.appendChild(nonActionWrap);

    // sección Action Groups
    const groupsHeader = document.createElement('div');
    groupsHeader.className = 'builder-header';
    groupsHeader.style.borderTop = '1px solid var(--border)';
    groupsHeader.innerHTML = `
      <div style="font-weight:700">Action Groups</div>
      <div class="builder-actions">
        <button class="btn" title="Add action group">+ Add Group</button>
      </div>`;
    groupsHeader.querySelector('.btn').addEventListener('click', ()=>addActionGroup(ev.id, 'group'));
    bodyContainer.appendChild(groupsHeader);

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
          <input class="group-name" value="${g.name}" title="Name of the action group"/>
        </div>
        <div class="tools">
          <button class="icon-btn" title="Move group up">▲</button>
          <button class="icon-btn" title="Move group down">▼</button>
          <button class="icon-btn danger" title="Delete group">${ICONS.trash}</button>
        </div>`;
      const [btnUp, btnDown, btnDel] = head.querySelectorAll('.icon-btn');
      head.querySelector('input').addEventListener('input', e=>renameActionGroup(ev.id, g.id, e.target.value));
      btnUp.addEventListener('click', ()=>moveActionGroup(ev.id, g.id, 'up'));
      btnDown.addEventListener('click', ()=>moveActionGroup(ev.id, g.id, 'down'));
      btnDel.addEventListener('click', ()=>{
        if(confirm(`Delete the group "${g.name}"?`)) removeActionGroup(ev.id, g.id);
      });
      groupCard.appendChild(head);

      const zone = createZone(ev, { type:'action-group', groupId:g.id, accept: ACTION_KINDS() });
      // acciones dentro del group
      g.blocks.forEach(b=>{
        const meta = REGISTRY[b.kind]?.[b.subtype];
        const block = document.createElement('div');
        block.className = `block ${blockClass(b.kind,b.subtype)}`;
        const title = meta?.label || b.subtype;
        block.innerHTML = `<div class="block-head">
            <div>${title}</div>
            <div class="tools">
              <button class="icon-btn" title="Move up">▲</button>
              <button class="icon-btn" title="Move down">▼</button>
              <button class="icon-btn" title="Delete">${ICONS.trash}</button>
            </div>
          </div>`;
        const body = document.createElement('div');
        body.className = 'block-body';
        meta?.render?.(body, b, updateYAML, { event: ev, groupId: g.id }); // ← ctx
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
      hint.textContent = 'Drag actions here...';
      zone.appendChild(hint);

      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'block-body';
      bodyWrap.appendChild(zone);
      groupCard.appendChild(bodyWrap);

      bodyContainer.appendChild(groupCard);
    });

    card.appendChild(bodyContainer);
    canvas.appendChild(card);
  });

  

  updateYAML();
}

/* ---------- YAML (con múltiples action groups) ---------- */
function buildYAML(){
  const lines = [];
  lines.push('Events:');
  state.events.forEach(ev => {
    const ename = (ev.name||'event').replace(/:/g,'').trim() || 'event';
    lines.push(`  ${ename}:`);
    lines.push(`    type: ${ev.type || 'null'}`);

    // settings desde blocks (kind=setting)
    const settings = {};
    let customEventSetting = null;
    ev.blocks.forEach(b=>{
      const meta = REGISTRY[b.kind]?.[b.subtype];
      if(meta?.settingKey){
        if (meta.settingKey === 'custom_event_data'){
          customEventSetting = b;
          return;
        }
        settings[meta.settingKey] =
          ('ticks' in b.data) ? b.data.ticks :
          ('perm'  in b.data) ? b.data.perm  :
          ('value' in b.data) ? b.data.value :
          b.data;
      }
    });
    Object.entries(settings).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        lines.push(`    ${k}: ${v}`); // true/false/numero/string salen bien en YAML
      }
    });

    if (customEventSetting){
      const data = customEventSetting.data || {};
      if (data && typeof data === 'object'){
        const eventClass = String(data.event || '').trim();
        const playerVar = String(data.player_variable || '').trim();
        const vars = Array.isArray(data.variables)
          ? data.variables
          : Array.isArray(data.variables_to_capture)
            ? data.variables_to_capture
            : [];

        if(eventClass || playerVar || vars.length){
          lines.push('    custom_event_data:');
          if(eventClass) lines.push(`      event: '${escQ(eventClass)}'`);
          if(playerVar) lines.push(`      player_variable: '${escQ(playerVar)}'`);
          if(vars.length){
            lines.push('      variables_to_capture:');
            vars.forEach(v => {
              const entry = String(v || '').trim();
              if(entry) lines.push(`      - '${escQ(entry)}'`);
            });
          }
        }
      } else if (data !== undefined && data !== null) {
        const rawValue = String(data);
        if (rawValue){
          lines.push(`    custom_event_data: '${escQ(rawValue)}'`);
        }
      }
    }

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
            const meta = REGISTRY[b.kind]?.[b.subtype];
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

const collapseBtn = document.getElementById('collapseBtn');
if (collapseBtn) {
  collapseBtn.innerHTML = `${ICONS.panelRightClose}`;
}

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

/* ---------- Importer ---------- */
const ACTION_IMPORT_MAP = {
  message: value => createActionBlock('send_message', { text: String(value ?? '') }),
  centered_message: value => createActionBlock('send_centered_message', { text: String(value ?? '') }),
  console_message: value => createActionBlock('send_console_message', { text: String(value ?? '') }),
  json_message: value => createActionBlock('send_json_message', { text: String(value ?? '') }),
  mini_message: value => createActionBlock('send_mini_message', { text: String(value ?? '') }),
  console_command: value => createActionBlock('console_command', { cmd: String(value ?? '') }),
  player_command: value => createActionBlock('player_command', { cmd: String(value ?? '') }),
  player_command_as_op: value => createActionBlock('player_command_as_op', { cmd: String(value ?? '') }),
  player_send_chat: value => createActionBlock('player_send_chat', { cmd: String(value ?? '') }),
  teleport: value => createActionBlock('teleport', { cmd: String(value ?? '') }),
  give_potion_effect: value => createActionBlock('give_potion_effect', { cmd: String(value ?? '') }),
  remove_potion_effect: value => createActionBlock('remove_potion_effect', { cmd: String(value ?? '') }),
  cancel_event: value => createActionBlock('cancel_event', { value: parseBoolean(value) }),
  kick: value => createActionBlock('kick', { reason: String(value ?? '') }),
  playsound: value => createActionBlock('playsound', { cmd: String(value ?? '') }),
  playsound_resource_pack: value => createActionBlock('playsound_resource_pack', { cmd: String(value ?? '') }),
  stopsound: value => createActionBlock('stopsound', { cmd: String(value ?? '') }),
  stopsound_resource_pack: value => createActionBlock('stopsound_resource_pack', { cmd: String(value ?? '') }),
  send_to_server: value => createActionBlock('send_to_server', { cmd: String(value ?? '') }),
  actionbar: value => createActionBlock('actionbar', { cmd: String(value ?? '') }),
  title: value => createActionBlock('title', { cmd: String(value ?? '') }),
  damage: value => createActionBlock('damage', { point: parseNumber(value) }),
  set_on_fire: value => createActionBlock('set_on_fire', { ticks: parseNumber(value) }),
  freeze: value => createActionBlock('freeze', { ticks: parseNumber(value) }),
  heal: value => createActionBlock('heal', { point: parseNumber(value) }),
  set_food_level: value => createActionBlock('set_food_level', { point: parseNumber(value) }),
  throw_directional: value => createActionBlock('throw_directional', { point: parseNumber(value) }),
  throw_coordinate: value => createActionBlock('throw_coordinate', { cmd: String(value ?? '') }),
  close_inventory: () => createActionBlock('close_inventory'),
  clear_inventory: () => createActionBlock('clear_inventory'),
  wait: value => createActionBlock('wait', { point: parseNumber(value) }),
  wait_ticks: value => createActionBlock('wait_ticks', { point: parseNumber(value) }),
  remove_item: value => createActionBlock('remove_item', { cmd: String(value ?? '') }),
  remove_item_slot: value => createActionBlock('remove_item_slot', { cmd: String(value ?? '') }),
  firework: value => createActionBlock('firework', { cmd: String(value ?? '') }),
  lightning_strike: value => createActionBlock('lightning_strike', { cmd: String(value ?? '') }),
  particle: value => createActionBlock('particle', { cmd: String(value ?? '') }),
  give_item: value => createActionBlock('give_item', { cmd: String(value ?? '') }),
  drop_item: value => createActionBlock('drop_item', { cmd: String(value ?? '') }),
  set_block: value => createActionBlock('set_block', { cmd: String(value ?? '') }),
  summon: value => createActionBlock('summon', { cmd: String(value ?? '') }),
  call_event: value => createActionBlock('call_event', { cmd: String(value ?? '') }),
  execute_action_group: value => createActionBlock('execute_action_group', { cmd: String(value ?? '') }),
  gamemode: value => createActionBlock('gamemode', { mode: parseGamemodeValue(value) }),
  keep_items: value => createActionBlock('keep_items', { mode: parseKeepItemsValue(value) }),
  cancel_drop: value => createActionBlock('cancel_drop', { value: parseBoolean(value) }),
  set_damage: value => {
    const parsed = parseDamageValue(value);
    return createActionBlock('set_damage', parsed);
  },
  hide_join_message: value => createActionBlock('hide_join_message', { value: parseBoolean(value) }),
  hide_leave_message: value => createActionBlock('hide_leave_message', { value: parseBoolean(value) }),
  set_death_message: value => createActionBlock('set_death_message', { text: String(value ?? '') }),
  prevent_join: value => createActionBlock('prevent_join', { text: String(value ?? '') }),
  set_item: value => createActionBlock('set_item', { text: String(value ?? '') }),
  set_event_xp: value => createActionBlock('set_event_xp', { points: parseNumber(value) }),
  tab_complete: value => createActionBlock('tab_complete', { text: String(value ?? '') })
};

const WRAPPER_ACTION_KEYS = new Set(['to_all', 'to_target', 'to_range', 'to_player', 'to_condition']);

function createActionToBlock(subtype){
  const meta = REGISTRY.actionTo?.[subtype];
  if (!meta) return null;
  return {
    id: uid(),
    kind: 'actionTo',
    subtype,
    data: deepClone(meta.defaults || {})
  };
}

function assignWrapperChild(block, childBlock){
  if (!block || !childBlock) return;
  block.data = block.data || {};
  block.data.child = {
    kind: childBlock.kind || 'action',
    subtype: childBlock.subtype,
    data: deepClone(childBlock.data || {})
  };
}

function parseWrappedAction(key, rawValue, warnings, ctx, originalLine){
  const block = createActionToBlock(key);
  if (!block){
    warnings.push(`Acción no soportada "${originalLine}" ${ctx}`);
    return null;
  }

  const ensureChild = (line) => {
    const childLine = String(line || '').trim();
    if (!childLine){
      warnings.push(`La acción "${originalLine}" no tiene acción interna ${ctx}`);
      return;
    }
    const child = parseActionLine(childLine, warnings, `${ctx} (acción interna de ${key})`);
    if (!child) return;
    assignWrapperChild(block, child);
  };

  const valueStr = String(rawValue ?? '').trim();

  if (key === 'to_all' || key === 'to_target'){
    ensureChild(valueStr);
    return block;
  }

  const colonIdx = valueStr.indexOf(':');
  if (colonIdx === -1){
    warnings.push(`Formato inválido para "${originalLine}" ${ctx}`);
    return block;
  }

  const head = valueStr.slice(0, colonIdx).trim();
  const tail = valueStr.slice(colonIdx + 1).trim();

  switch(key){
    case 'to_range': {
      const [radiusPartRaw = '', includePartRaw = ''] = head.split(';');
      const radiusPart = stripQuotes(radiusPartRaw);
      const includePart = stripQuotes(includePartRaw);
      const parsedRadius = parseInt(radiusPart, 10);
      if (!Number.isNaN(parsedRadius)){
        block.data.radius = parsedRadius;
      }
      if (includePart){
        block.data.includePlayer = parseBoolean(includePart);
      }
      ensureChild(tail);
      break;
    }
    case 'to_player': {
      const playerTarget = stripQuotes(head);
      if (playerTarget){
        block.data.player = playerTarget;
      }
      ensureChild(tail);
      break;
    }
    case 'to_condition': {
      const groupTarget = stripQuotes(head);
      if (groupTarget){
        block.data.group = groupTarget;
      }
      ensureChild(tail);
      break;
    }
    default:
      warnings.push(`Acción no soportada "${originalLine}" ${ctx}`);
      return null;
  }

  return block;
}

function parseBoolean(value){
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const str = String(value ?? '').trim().toLowerCase();
  if (!str) return false;
  return ['true','yes','1','on'].includes(str);
}

function parseNumber(value){
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const num = Number(String(value ?? '').trim());
  return Number.isFinite(num) ? num : 0;
}

function parseDamageValue(value){
  if (typeof value === 'object' && value) {
    const out = { value: parseNumber(value.value), mode: value.mode === 'percent' ? 'percent' : 'points' };
    return out;
  }
  const str = String(value ?? '').trim();
  if (!str) return { value: 0, mode: 'points' };
  if (str.endsWith('%')) {
    return { value: parseNumber(str.slice(0, -1)), mode: 'percent' };
  }
  return { value: parseNumber(str), mode: 'points' };
}

function parseKeepItemsValue(value){
  const allowed = ['items', 'xp', 'all'];
  const mode = String(value ?? '').trim().toLowerCase();
  return allowed.includes(mode) ? mode : 'items';
}

function parseGamemodeValue(value){
  if (typeof value === 'object' && value && typeof value.mode === 'string'){
    return parseGamemodeValue(value.mode);
  }
  const str = String(value ?? '').trim();
  if (!str) return 'SURVIVAL';
  const upper = str.toUpperCase();
  const normalized = {
    '0': 'SURVIVAL',
    '1': 'CREATIVE',
    '2': 'ADVENTURE',
    '3': 'SPECTATOR',
    S: 'SURVIVAL',
    SURVIVAL: 'SURVIVAL',
    C: 'CREATIVE',
    CREATIVE: 'CREATIVE',
    A: 'ADVENTURE',
    ADVENTURE: 'ADVENTURE',
    SP: 'SPECTATOR',
    SPEC: 'SPECTATOR',
    SPECTATOR: 'SPECTATOR'
  };
  return normalized[upper] || 'SURVIVAL';
}

function resolveActionKind(subtype){
  for (const kind of ACTION_KINDS()){
    if (REGISTRY[kind]?.[subtype]) return kind;
  }
  return 'action';
}

function createActionBlock(subtype, overrides = {}){
  const kind = resolveActionKind(subtype);
  const meta = REGISTRY[kind]?.[subtype];
  if (!meta) return null;
  const base = deepClone(meta.defaults || {});
  const data = Object.assign(base, overrides || {});
  return { id: uid(), kind, subtype, data };
}

function normalizeList(value){
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function stripQuotes(value){
  if (typeof value !== 'string') return value;
  let out = value.trim();
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))){
    out = out.slice(1, -1).trim();
  }
  return out;
}

const CONDITION_OPERATORS = [
  'equalsIgnoreCase', '!equalsIgnoreCase', 'startsWith', '!startsWith',
  'equals', '!equals', 'contains', '!contains', 'endsWith', '!endsWith',
  'matches', '!matches', '>=', '<=', '==', '!=', '>', '<'
];

function parseConditionEntry(entry){
  if (typeof entry !== 'string') return null;
  const clean = stripQuotes(entry);
  const str = String(clean ?? '').trim();
  if (!str) return null;
  for (const op of CONDITION_OPERATORS){
    const pattern = ` ${op} `;
    const idx = str.indexOf(pattern);
    if (idx >= 0){
      const left = str.slice(0, idx).trim();
      const right = str.slice(idx + pattern.length).trim();
      if (!left || !right) continue;
      return { left, op, right };
    }
  }
  return null;
}

function parseActionLine(entry, warnings, ctx){
  if (typeof entry !== 'string'){
    warnings.push(`Invalid action input ${ctx}`);
    return null;
  }
  const clean = stripQuotes(entry);
  const str = String(clean ?? '').trim();
  if (!str) return null;
  const colonIdx = str.indexOf(':');
  let key = '', value = '';
  if (colonIdx === -1){
    key = str.toLowerCase();
    value = '';
  } else {
    key = str.slice(0, colonIdx).trim().toLowerCase();
    value = str.slice(colonIdx + 1).trim();
  }
  if (WRAPPER_ACTION_KEYS.has(key)){
    return parseWrappedAction(key, value, warnings, ctx, str);
  }

  const importer = ACTION_IMPORT_MAP[key];
  if (!importer){
    warnings.push(`Action not supported "${str}" ${ctx}`);
    return null;
  }
  const block = importer(value);
  if (!block){
    warnings.push(`The action could not be imported "${str}" ${ctx}`);
    return null;
  }
  return block;
}

function parseSettingsForEvent(ev, raw, warnings){
  if (raw.ignore_with_permission){
    const meta = REGISTRY.setting?.ignore_with_permission;
    if (meta){
      ev.blocks.push({
        id: uid(),
        kind: 'setting',
        subtype: 'ignore_with_permission',
        data: { perm: String(raw.ignore_with_permission ?? '') }
      });
    }
  }
  if (raw.ignore_if_cancelled !== undefined){
    const meta = REGISTRY.setting?.ignore_if_cancelled;
    if (meta){
      ev.blocks.push({
        id: uid(),
        kind: 'setting',
        subtype: 'ignore_if_cancelled',
        data: { value: parseBoolean(raw.ignore_if_cancelled) }
      });
    }
  }
  if (raw.allow_math_formulas_in_conditions !== undefined){
    const meta = REGISTRY.setting?.allow_math_formulas_in_conditions;
    if (meta){
      ev.blocks.push({
        id: uid(),
        kind: 'setting',
        subtype: 'allow_math_formulas_in_conditions',
        data: { value: parseBoolean(raw.allow_math_formulas_in_conditions) }
      });
    }
  }
  if (raw.one_time !== undefined){
    const meta = REGISTRY.setting?.one_time;
    if (meta){
      ev.blocks.push({
        id: uid(),
        kind: 'setting',
        subtype: 'one_time',
        data: { value: parseBoolean(raw.one_time) }
      });
    }
  }
  if (raw.cooldown !== undefined){
    const meta = REGISTRY.setting?.cooldown;
    if (meta){
      ev.blocks.push({
        id: uid(),
        kind: 'setting',
        subtype: 'cooldown',
        data: { seconds: parseNumber(raw.cooldown) }
      });
    }
  }
  if (raw.enabled !== undefined){
    const meta = REGISTRY.setting?.enabled;
    if (meta){
      ev.blocks.push({
        id: uid(),
        kind: 'setting',
        subtype: 'enabled',
        data: { value: parseBoolean(raw.enabled) }
      });
    }
  }
  if (raw.repetitive_time !== undefined){
    const meta = REGISTRY.setting?.repetitive_time;
    if (meta){
      ev.blocks.push({
        id: uid(),
        kind: 'setting',
        subtype: 'repetitive_time',
        data: { ticks: parseNumber(raw.repetitive_time) }
      });
    }
  }
  if (raw.custom_event_data !== undefined){
    const meta = REGISTRY.setting?.custom_event_data;
    if (!meta){
      warnings.push(`The "custom_event_data" setting for the "${ev.name}" event is not yet supported.`);
    } else if (raw.custom_event_data && typeof raw.custom_event_data === 'object' && !Array.isArray(raw.custom_event_data)) {
      const defaults = deepClone(meta.defaults || {});
      const data = Object.assign({}, defaults);
      if (raw.custom_event_data.event !== undefined){
        data.event = String(raw.custom_event_data.event ?? '');
      }
      if (raw.custom_event_data.player_variable !== undefined){
        data.player_variable = String(raw.custom_event_data.player_variable ?? '');
      }
      const varsSource = raw.custom_event_data.variables !== undefined
        ? raw.custom_event_data.variables
        : raw.custom_event_data.variables_to_capture;
      const variables = normalizeList(varsSource)
        .map(v => String(v ?? '').trim())
        .filter(Boolean);
      data.variables = variables;
      data.variables_to_capture = variables.slice();
      ev.blocks.push({
        id: uid(),
        kind: 'setting',
        subtype: 'custom_event_data',
        data
      });
    } else {
      warnings.push(`The "custom_event_data" setting for the "${ev.name}" event has an invalid format.`);
    }
  }
}

function buildEventFromConfig(name, raw, warnings){
  const evt = newEventSkeleton(name);
  evt.name = name;
  evt.type = typeof raw.type === 'string' ? raw.type : null;
  evt.blocks = [];
  evt.actionGroups = [];

  if (!evt.type){
    warnings.push(`The "${name}" event doesn't have a valid type.`);
  }

  parseSettingsForEvent(evt, raw, warnings);

  let conditionList = [];
  if (Array.isArray(raw.conditions)) {
    conditionList = raw.conditions;
  } else if (raw.conditions && typeof raw.conditions === 'object') {
    conditionList = Object.values(raw.conditions).flatMap(val => normalizeList(val));
  } else {
    conditionList = normalizeList(raw.conditions);
  }
  conditionList.forEach((entry, idx) => {
    const parsed = parseConditionEntry(entry);
    if (!parsed){
      warnings.push(`The condition #${idx + 1} of the event "${name}" could not be interpreted.`);
      return;
    }
    evt.blocks.push({
      id: uid(),
      kind: 'condition',
      subtype: 'basic_condition',
      data: parsed
    });
  });

  const actionsNode = raw.actions;
  if (actionsNode && typeof actionsNode === 'object' && !Array.isArray(actionsNode)){
    Object.entries(actionsNode).forEach(([groupName, entries]) => {
      const group = { id: uid(), name: String(groupName || 'group'), blocks: [] };
      normalizeList(entries).forEach((line, idx) => {
        const block = parseActionLine(line, warnings, `in the "${groupName}" group of the "${name}" event"`);
        if (block) group.blocks.push(block);
      });
      evt.actionGroups.push(group);
    });
  } else if (Array.isArray(actionsNode)){
    const group = { id: uid(), name: 'default', blocks: [] };
    actionsNode.forEach((line, idx) => {
      const block = parseActionLine(line, warnings, `in the "${name}" event`);
      if (block) group.blocks.push(block);
    });
    evt.actionGroups.push(group);
  }

  if (!evt.actionGroups.length){
    evt.actionGroups.push({ id: uid(), name: 'default', blocks: [] });
  }

  return evt;
}

function convertConfigToState(payload){
  const root = payload?.Events || payload?.events;
  if (!root || typeof root !== 'object'){
    throw new Error('The "Events" section was not found.');
  }
  const warnings = [];
  const events = [];
  Object.entries(root).forEach(([name, raw]) => {
    if (!raw || typeof raw !== 'object'){
      warnings.push(`The "${name}" event was ignored because it had an invalid format.`);
      return;
    }
    events.push(buildEventFromConfig(String(name), raw, warnings));
  });
  if (!events.length){
    throw new Error('No valid events were found to import.');
  }
  return { events, warnings };
}

function parseConfigPayload(text){
  const trimmed = String(text ?? '').trim();
  if (!trimmed) throw new Error('The content is empty.');
  if (trimmed.startsWith('{') || trimmed.startsWith('[')){
    return JSON.parse(trimmed);
  }
  if (window.jsyaml && typeof window.jsyaml.load === 'function'){
    return window.jsyaml.load(trimmed);
  }
  throw new Error('Unrecognized format. Unable to load YAML.');
}

function anyModalVisible(){
  return document.querySelector('.modal-overlay.is-visible');
}

function toggleModalOverlay(el, show){
  if (!el) return;
  if (show) el.classList.add('is-visible');
  else el.classList.remove('is-visible');
  document.body.classList.toggle('modal-open', Boolean(anyModalVisible()));
}

function closeImportModals(){
  toggleModalOverlay(importOverlay, false);
  toggleModalOverlay(importPasteOverlay, false);
  if (importPasteTextarea) importPasteTextarea.value = '';
}

function handleImportText(text, sourceLabel){
  try {
    const payload = parseConfigPayload(text);
    const { events, warnings } = convertConfigToState(payload);
    if (state.events.length && !confirm('Importing will replace the current builder content. Continue?')){
      return;
    }
    state.events = events;
    render();
    applyResponsiveYAML();
    updateScreenGuard();
    closeImportModals();
    let message = `Imported ${events.length} event${events.length === 1 ? '' : 's'} successfully.`;
    if (warnings.length){
      message += `\nWarnings:\n- ${warnings.join('\n- ')}`;
    }
    alert(message);
  } catch (err){
    alert(`Unable to import${sourceLabel ? ` (${sourceLabel})` : ''}: ${err.message}`);
  }
}

if (importBtn){
  importBtn.addEventListener('click', () => {
    if (importPasteTextarea) importPasteTextarea.value = '';
    toggleModalOverlay(importPasteOverlay, false);
    toggleModalOverlay(importOverlay, true);
  });
}

importCloseButtons.forEach(btn => btn.addEventListener('click', () => closeImportModals()));
importPasteCloseButtons.forEach(btn => btn.addEventListener('click', () => {
  toggleModalOverlay(importPasteOverlay, false);
  toggleModalOverlay(importOverlay, true);
}));

if (importOverlay){
  importOverlay.addEventListener('click', (e) => {
    if (e.target === importOverlay) closeImportModals();
  });
}

if (importPasteOverlay){
  importPasteOverlay.addEventListener('click', (e) => {
    if (e.target === importPasteOverlay){
      toggleModalOverlay(importPasteOverlay, false);
      toggleModalOverlay(importOverlay, true);
    }
  });
}

if (importUploadOption){
  importUploadOption.addEventListener('click', () => {
    if (importFileInput) importFileInput.click();
  });
}

if (importFileInput){
  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleImportText(reader.result, file.name);
      importFileInput.value = '';
    };
    reader.onerror = () => {
      alert(`The file could not be read "${file.name}".`);
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });
}

if (importPasteOption){
  importPasteOption.addEventListener('click', () => {
    toggleModalOverlay(importOverlay, false);
    toggleModalOverlay(importPasteOverlay, true);
    if (importPasteTextarea){
      importPasteTextarea.value = '';
      setTimeout(() => importPasteTextarea.focus(), 50);
    }
  });
}

if (importPasteConfirm){
  importPasteConfirm.addEventListener('click', () => {
    const text = importPasteTextarea ? importPasteTextarea.value : '';
    handleImportText(text, 'pasted text');
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && anyModalVisible()){
    if (importPasteOverlay && importPasteOverlay.classList.contains('is-visible')){
      toggleModalOverlay(importPasteOverlay, false);
      if (importOverlay) toggleModalOverlay(importOverlay, true);
    } else {
      closeImportModals();
    }
  }
});

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
    alert('Copied YAML');
  }catch(e){ alert('Unable to copy'); }
});
document.getElementById('downloadBtn').addEventListener('click', ()=>{
  const out = getYAMLForExport();
  const blob = new Blob([out], {type:'text/yaml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'events.yml';
  document.body.appendChild(a); a.click(); a.remove();
});

document.addEventListener('DOMContentLoaded', () => {
  const uploadIcon = document.querySelector('#importUploadOption .icon');
  const pasteIcon = document.querySelector('#importPasteOption .icon');
  if (uploadIcon) uploadIcon.innerHTML = ICONS.cloudUpload;
  if (pasteIcon) pasteIcon.innerHTML = ICONS.clipboardPaste;
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