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
      render(body, block, update){
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
      defaults:{ text:'Mensaje aquí…' },
      render(body, block, update){
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
      defaults:{ text:'Mensaje aquí…' },
      render(body, block, update){
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
      defaults:{ text:'Mensaje aquí…' },
      render(body, block, update){
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
      defaults: { text: 'Mensaje aquí…' },
      render(body, block, update) {
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
      defaults:{ text:'Mensaje aquí…' },
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Teleports the player/entity. Use this format: "world;x;y;z;yaw;pitch"
          </small>
          <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'teleport: ${escQ(block.data.cmd)}'`; }
    },
    give_potion_effect: {
      label:'Give Potion Effect', className:'heal',
      defaults:{ cmd:'POISON;120;1;false' },
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update) {
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Similar to Throw Directional. In this case, players will be throwed following the strength defined in each coordinate. Use this format: "<strength_x>;<strength_y>;<strength_z>"
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
      render(body, block, update){
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
      render(body, block, update){
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
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Removes X amount of items from the player inventory. Use this format: "<type>;<amount>;datavalue: <datavalue>;name: <name>;lorecontains: <lore_line>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'remove_item: ${escQ(block.data.cmd)}'`; }
    },
    remove_item_slot: {
      label:'Remove Item Slot', className:'cmd',
      defaults:{ cmd:'HAND;1' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Removes X amount of items from a certain slot of the player inventory. Use this format: "<slot>;<amount>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'remove_item_slot: ${escQ(block.data.cmd)}'`; }
    },
    firework: {
      label:'Firework', className:'fx',
      defaults:{ cmd:'colors:YELLOW,RED type:BALL fade:AQUA power:0' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Spawns a firework from the player/entity location. Use this format: "colors:<color1>,<color2> type:<type> fade:<color1>,<color2> <propertyN>:<valueN>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'firework: ${escQ(block.data.cmd)}'`; }
    },
    lightning_strike: {
      label:'Lightning Strike', className:'fx',
      defaults:{ cmd:'%victim_block_world%;%victim_block_x%;%victim_block_y%;%victim_block_z%' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Generates a lightning strike effect that does no damage, at certain location. Use this format: "<world>;<x>;<y>;<z>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'lightning_strike: ${escQ(block.data.cmd)}'`; }
    },
    particle: {
      label:'Particle (1.9+)', className:'fx',
      defaults:{ cmd:'effect:EXPLOSION_LARGE offset:0.1;0.1;0.1 speed:1 amount:5 for_player:true' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Spawns a particle on the player/entity location. Use this format: "effect:<effect_name> offset:<x>;<y>;<z> speed:<speed> amount:<amount> force:<true/false>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'particle: ${escQ(block.data.cmd)}'`; }
    },
    give_item: {
      label:'Give Item', className:'heal',
      defaults:{ cmd:'id:IRON_HELMET;amount:1;name:&6Basic Helmet' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Gives an item to the player. Use this format: "id:<id>;<property>:<value>;<propertyN>:<valueN>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'give_item: ${escQ(block.data.cmd)}'`; }
    },
    drop_item: {
      label:'Drop Item', className:'heal',
      defaults:{ cmd:'location:%block_x%,%block_y%,%block_z%,%block_world%;id:DIAMOND;name:&bUnique Diamond' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Drops an item in a certain location. Use this format: "location:<x>,<y>,<z>,<world>;id:<id>;<property>:<value>;<propertyN>:<valueN>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'drop_item: ${escQ(block.data.cmd)}'`; }
    },
    set_block: {
      label:'Set Block (1.13+)', className:'cmd',
      defaults:{ cmd:'location:50,50,-256,world;id:DIAMOND_BLOCK' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Places a block in a certain location. Use this format: "location:<x>,<y>,<z>,<world>;id:<id>;block_data:<block_data>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'set_block: ${escQ(block.data.cmd)}'`; }
    },
    summon: {
      label:'Summon', className:'fx',
      defaults:{ cmd:'location:0,68,0,spawn;entity:SHEEP' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Spawns an entity at a certain location. Use this format: "location:<x>,<y>,<z>,<world>;entity:<entity>;<property>:<value>;<propertyN>:<valueN>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'summon: ${escQ(block.data.cmd)}'`; }
    },
    call_event: {
      label:'Call Event', className:'flow',
      defaults:{ cmd:'example2;%example_variable%=Something' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Executes a "call" event. Use this format: "<event_name>;%variable1%=<value1>;%variableN%=<valueN>"
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'call_event: ${escQ(block.data.cmd)}'`; }
    },
    execute_action_group: {
      label:'Execute Action Group', className:'flow',
      defaults:{ cmd:'firework1:70;firework2:30;firework3:30' },
      render(body, block, update){
        body.innerHTML = `<small style="opacity:1;font-size:14px">
              Executes another action group from the event, randomly. Use this format: <group1>:<prob1>;<groupN>:<probN> where <group> is the name of a created action group of the event, and <probability> is the chance of selecting the event (The probabilities don't need to sum 100%).
          </small>
        <div class="row single"><input type="text" value="${block.data.cmd}" /></div>`;
        body.querySelector('input').addEventListener('input', e=>{ block.data.cmd = e.target.value; update(); });
      },
      toYAML(block){ return `'execute_action_group: ${escQ(block.data.cmd)}'`; }
    },

    to_target: {
      label:'To Target → (drop one action)', className:'msg',
      defaults:{ child: null }, // child: { subtype, data, id? }
      render(body, block, update, ctx){
        body.innerHTML = `
          <small style="opacity:1;font-size:14px;display:block;margin-bottom:8px">
            Arrastra <b>una</b> acción aquí. Se ejecutará contra el <code>target</code>.
            Puedes editar sus argumentos como si estuviera fuera.
          </small>
        `;

        // Zona de reemplazo que cubre todo el contenido (permite drop para reemplazar)
        const replaceZone = createZone(ctx.event, {
          type: 'to-slot',
          groupId: ctx.groupId,
          parentBlockId: block.id,
          accept: ['action']
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
          const meta  = REGISTRY.action?.[inner.subtype];

          // Bloque interno con el MISMO diseño
          const innerBlock = document.createElement('div');
          innerBlock.className = `block ${blockClass('action', inner.subtype)}`;
          innerBlock.style.margin = '0'; // sin márgenes dentro del slot

          innerBlock.innerHTML = `
            <div class="block-head">
              <div>${meta?.label || inner.subtype}</div>
              <div class="tools">
                <button class="icon-btn danger" title="Quitar acción interna">🗑</button>
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
          hint.textContent = 'Suelta aquí una acción (message, title, playsound, give_item, …)';
          replaceZone.appendChild(hint);
        }

        body.appendChild(replaceZone);
      },
      toYAML(block){
        if (!block.data.child) {
          return `'to_target: message: &7(No inner action)'`;
        }
        const inner = block.data.child;
        const meta  = REGISTRY.action?.[inner.subtype];
        if (!meta || typeof meta.toYAML !== 'function') {
          return `'to_target: message: &7(Unsupported inner action)'`;
        }
        // Reusa el toYAML del action hijo y quita comillas externas
        const innerLine = meta.toYAML({ kind:'action', subtype: inner.subtype, data: inner.data }) || "'message: TODO'";
        const unquoted  = innerLine.replace(/^'(.*)'$/, '$1');
        return `'to_target: ${unquoted}'`;
      }
    },
  },

  setting: {
    __meta: { label: 'Settings', color: 'var(--setting)' },
    repetitive_time: {
      label:'Repetitive Time', className:'setting',
      defaults:{ ticks:20 },
      settingKey:'repetitive_time',
      render(body, block, update){
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
    if (!touchedChip || !state.dragData) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const zone = el?.closest('.zone');
    if (zone) {
      const card = zone.closest('.event-card');
      const eventId = card?.dataset.eventId;
      const ztype = zone.dataset.zoneType;
      const groupId = zone.dataset.groupId || null;
      const parentBlockId = zone.dataset.parentBlockId || null;

      if (eventId) {
        if (ztype === 'to-slot' && parentBlockId) {
          const ev = state.events.find(x=>x.id===eventId);
          const g  = groupId ? ev.actionGroups.find(x=>x.id===groupId)
                            : (ev.actionGroups.find(x=>x.name==='default') || ev.actionGroups[0]);
          if (ev && g) {
            const toBlock = g.blocks.find(b=>b.id===parentBlockId);
            const meta = REGISTRY.action?.[state.dragData.subtype];
            if (toBlock && meta) {
              toBlock.data.child = {
                id: uid(),
                subtype: state.dragData.subtype,
                data: deepClone(meta.defaults || {})
              };
              render();
            }
          }
        } else {
          // flujo normal
          addBlock(eventId, state.dragData.kind, state.dragData.subtype, { groupId, zoneType: ztype });
        }
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
    e.stopPropagation(); // <- CLAVE
    z.classList.remove('over');
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!accept.includes(payload.kind)) return;

      // Manejo especial: to_target slot
      if (type === 'to-slot' && parentBlockId) {
        const g = groupId ? ev.actionGroups.find(x=>x.id===groupId)
                          : (ev.actionGroups.find(x=>x.name==='default') || ev.actionGroups[0]);
        if (!g) return;
        const toBlock = g.blocks.find(b=>b.id===parentBlockId);
        if (!toBlock) return;

        const meta = REGISTRY.action?.[payload.subtype];
        if (!meta) return;

        toBlock.data.child = {
          id: uid(),
          subtype: payload.subtype,
          data: deepClone(meta.defaults || {})
        };
        render(); // repinta para ver el bloque anidado
        return;   // <- NO seguir con addBlock
      }

      // Flujo normal (no es to-slot)
      addBlock(ev.id, payload.kind, payload.subtype, { groupId, zoneType: type });
    } catch(err){ console.warn(err); }
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

  // --- SLOT INTERNO (to_target) ---
  if (kind === 'action' && opts.zoneType === 'to-slot' && opts.parentBlockId) {
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
  if(kind==='eventType'){
    ev.type = subtype;
  } else if (kind==='action') {
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
      <input class="event-name" value="${ev.name}" title="Nombre del evento" />
      <div class="event-type">
        ${ev.type ? ('Event: '+ (Object.values(REGISTRY).find(cat => cat[ev.type])?.[ev.type]?.label || ev.type)) : '<em>Arrastra un tipo de Event aquí</em>'}
        <button class="icon-btn danger event-del" title="Eliminar evento" aria-label="Eliminar evento">🗑</button>
      </div>`;
    head.querySelector('.event-del').addEventListener('click', ()=>{
      if (confirm(`¿Eliminar el evento "${ev.name}"?`)) removeEventCompletely(ev.id);
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
