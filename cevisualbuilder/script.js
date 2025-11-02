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

const LONG_PRESS_MS = 200;
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
            <label style="opacity:.8; align-self:center;">Selecciona el modo de juego</label>
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
    repetitive_time: {
      label:'Repetitive Time', className:'setting',
      defaults:{ ticks:20 },
      settingKey:'repetitive_time',
      render(body, block, update, ctx){
        body.innerHTML = `<div class="row single">
          <input type="number" min="1" step="1" value="${block.data.ticks}" />
        </div>
        <small style="opacity:.7;font-size:12px">
            20 ticks = 1 second. Example: 100 = 5 seconds.
        </small>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.ticks = parseInt(e.target.value||'0',10); update(); });
      }
    },
    ignore_with_permission: {
      label:'Ignore With Permission', className:'setting',
      defaults:{ perm:'conditionalevents.ignore.example' },
      settingKey:'ignore_with_permission',
      render(body, block, update, ctx){
        body.innerHTML = `<div class="row single"><input type="text" value="${block.data.perm}" placeholder="conditionalevents.ignore.<id>" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.perm = e.target.value; update(); });
      }
    }
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
  trash: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-trash">
  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
  <path d="M3 6h18"/>
  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
</svg>`
};

/* ---------- Helpers / UX ---------- */
window.addEventListener("beforeunload", (e) => {
  if (state.events.length > 0) {
    e.preventDefault();
    e.returnValue = "Si recargas la página, perderás todos los datos del builder.";
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

    // header
    const head = document.createElement('div');
    head.className = 'event-top';
    head.innerHTML = `
      <input class="event-name" value="${ev.name}" title="Event name" />
      <div class="event-type">
        ${ev.type ? ('Event: '+ (Object.values(REGISTRY).find(cat => cat[ev.type])?.[ev.type]?.label || ev.type)) : '<em>Drag an Event type here</em>'}
        <button class="icon-btn danger event-del" title="Delete event" aria-label="Delete event">${ICONS.trash}</button>
      </div>`;
    head.querySelector('.event-del').addEventListener('click', ()=>{
      if (confirm(`Delete the event "${ev.name}"?`)) removeEventCompletely(ev.id);
    });
    head.querySelector('.event-name').addEventListener('input', (e)=>{ ev.name = e.target.value; updateYAML(); });
    card.appendChild(head);

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
    hintNA.textContent = 'Drag events, conditions, or settings here...';
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
        <button class="btn" title="Add action group">+ Add Group</button>
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
          <button class="icon-btn danger" title="Eliminar grupo">${ICONS.trash}</button>
        </div>`;
      const [btnUp, btnDown, btnDel] = head.querySelectorAll('.icon-btn');
      head.querySelector('input').addEventListener('input', e=>renameActionGroup(ev.id, g.id, e.target.value));
      btnUp.addEventListener('click', ()=>moveActionGroup(ev.id, g.id, 'up'));
      btnDown.addEventListener('click', ()=>moveActionGroup(ev.id, g.id, 'down'));
      btnDel.addEventListener('click', ()=>{
        if(confirm(`¿Eliminar el grupo "${g.name}"?`)) removeActionGroup(ev.id, g.id);
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
              <button class="icon-btn" title="Subir">▲</button>
              <button class="icon-btn" title="Bajar">▼</button>
              <button class="icon-btn" title="Eliminar">${ICONS.trash}</button>
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

      card.appendChild(groupCard);
    });

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
