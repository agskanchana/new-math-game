/* Three small plan-page demos. No dependencies; pure helpers also load in Node. */
(function () {
  'use strict';
  const paints = {y: '#FFD23F', r: '#E8382F', b: '#2F7DE1', w: '#FFFFFF'};
  const names = {y: 'yellow', r: 'red', b: 'blue', w: 'white', e: 'empty'};
  const wrap = (n, size) => ((n % size) + size) % size;

  function timeWords(h, m) {
    const hour = wrap(h - 1, 12) + 1, next = hour % 12 + 1;
    if (m === 0) return `${hour} o'clock`;
    if (m === 15) return `quarter past ${hour}`;
    if (m === 30) return `half past ${hour}`;
    if (m === 45) return `quarter to ${next}`;
    return m < 30 ? `${m} past ${hour}` : `${60 - m} to ${next}`;
  }
  function handAngles(h, m) {
    return {hour: (wrap(h, 12) + m / 60) * 30, minute: m * 6};
  }
  // Keep denominators as poured. Empty parts are included in the recipe, not the mix.
  function recipe(parts) {
    return ['y', 'r', 'b', 'w', 'e'].map(code => ({
      colour: names[code], numerator: parts.filter(p => (p || 'e') === code).length,
      denominator: parts.length
    })).filter(item => item.numerator);
  }
  function sameAs(parts) {
    const targets = [
      ['Sunset', {yellow: 3, red: 1}, 4], ['Grape', {red: 1, blue: 1}, 2],
      ['Sky', {blue: 2, white: 1}, 3], ['Leaf', {yellow: 1, blue: 1}, 2]
    ];
    const current = recipe(parts);
    const found = targets.find(([, counts, denominator]) => current.length === Object.keys(counts).length &&
      current.every(item => item.numerator * denominator === (counts[item.colour] || 0) * item.denominator));
    return found ? found[0] : null;
  }
  const ccHex = hex => {
    const v = hex.replace('#','');
    if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(v)) throw new TypeError('Expected an RGB hex colour');
    return (v.length === 3 ? [...v].map(c=>c+c).join('') : v).match(/../g).map(c=>parseInt(c,16)/255);
  };
  const ccToHex = rgb => '#'+rgb.map(c=>Math.round(Math.max(0,Math.min(1,c))*255).toString(16).padStart(2,'0')).join('').toUpperCase();
  // Copied from mock/comic.js mixColours, with only its function name changed.
  function tryMix(list) {
    if(!list.length) throw new RangeError('A paint mix needs at least one colour');
    const sorted=list.map(([hex,weight])=>[hex.toUpperCase(),Number(weight)]).sort((a,b)=>a[0].localeCompare(b[0]) || a[1]-b[1]);
    if(sorted.some(([,w])=>!Number.isFinite(w)||w<0)) throw new RangeError('Paint weights must be finite and nonnegative');
    const total=sorted.reduce((s,[,w])=>s+w,0);
    if(!total) throw new RangeError('A paint mix needs positive weight');
    const rgb=[0,1,2].map(ch=>Math.exp(sorted.reduce((s,[hex,w])=>s+(w/total)*Math.log(Math.max(.02,ccHex(hex)[ch])),0)));
    // Saturation lift in HSL: preserve hue and lightness, stretch channels around the HSL lightness.
    const max=Math.max(...rgb),min=Math.min(...rgb),light=(max+min)/2,delta=max-min;
    if(delta===0) return ccToHex(rgb);
    const saturation=delta/(1-Math.abs(2*light-1)), lifted=Math.min(1,saturation*1.1), factor=lifted/saturation;
    return ccToHex(rgb.map(v=>light+(v-light)*factor));
  }
  function dayPicture(minutes) {
    const h = Math.floor(wrap(minutes, 1440) / 60);
    return h >= 6 && h < 8 ? 'day-1' : h === 8 ? 'day-2' : h >= 9 && h < 12 ? 'day-3' :
      h >= 12 && h < 15 ? 'day-4' : h >= 15 && h < 18 ? 'day-5' : 'day-6';
  }

  if (typeof document !== 'undefined') {
    let id = 0;
    const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
    const digits = s => String(s).split(/(\d+)/).map(part => /^\d+$/.test(part) ? `<span class="try-number">${part}</span>` : esc(part)).join('');
    const button = (label, action, extra = '') => `<button type="button" class="try-button" data-action="${action}" ${extra}>${label}</button>`;
    function shell(root, caption, content) {
      root.innerHTML = `<div class="try-caption">${caption}</div>${content}<p class="try-live" aria-live="polite" aria-atomic="true"></p>`;
      root.setAttribute('role', 'group');
      root.setAttribute('aria-label', caption);
      return root.querySelector('.try-live');
    }
    function copies(root) {
      let balloons = 3, panels = 1;
      const found = [];
      const live = shell(root, 'Try it: copy a panel', `
        <p class="try-hint">Echo’s Copies · How many balloons can you make?</p>
        <div class="try-controls"><span>Balloons in one panel</span>
          ${button('−', 'less', 'aria-label="Fewer balloons"')}<b class="try-number try-count">3</b>
          ${button('+', 'more', 'aria-label="More balloons"')}
          ${button('COPY', 'copy')}${button('UNDO', 'undo')}</div>
        <div class="try-panels" aria-label="Copied balloon panels"></div>
        <div class="try-total-row"><p class="try-total try-number"></p><span class="try-party" hidden><b class="try-number">12!</b> Party ready</span></div>
        <p class="try-found">Ways to make <span class="try-number">12</span> you found: <span class="try-ways try-number">—</span></p>`);
      const row = root.querySelector('.try-panels');
      function panel(pop) {
        const colours = ['#E8382F', '#FFD23F', '#2F7DE1', '#3DBE5A', '#8B4FD8'];
        return `<div class="try-copy-panel${pop ? ' try-pop' : ''}"><svg viewBox="0 0 110 130" role="img" aria-label="${balloons} balloons">${Array.from({length: balloons}, (_, i) => {
          const x = balloons === 1 ? 55 : 22 + (i % 3) * 33, y = 27 + Math.floor(i / 3) * 59;
          return `<path d="M${x} ${y + 16} q-6 9 0 20" fill="none" stroke="var(--ink)" stroke-width="2"/><circle cx="${x}" cy="${y}" r="15" fill="${colours[i % 5]}" stroke="var(--ink)" stroke-width="3"/><path d="M${x - 5} ${y - 7} l3 -2" stroke="white" stroke-width="3" stroke-linecap="round"/>`;
        }).join('')}</svg></div>`;
      }
      function update(action) {
        if (action === 'copy') row.insertAdjacentHTML('beforeend', panel(true));
        else if (action === 'undo') row.lastElementChild.remove();
        else row.innerHTML = Array.from({length: panels}, () => panel(false)).join('');
        const total = panels * balloons, way = `${panels} × ${balloons}`;
        if (total === 12 && !found.includes(way)) found.push(way);
        root.querySelector('.try-count').textContent = balloons;
        root.querySelector('.try-total').textContent = `${panels} ${panels === 1 ? 'panel' : 'panels'} × ${balloons} = ${total}`;
        root.querySelector('.try-party').hidden = total !== 12;
        root.querySelector('.try-ways').textContent = found.join(', ') || '—';
        for (const [actionName, disabled] of [['less', balloons === 1], ['more', balloons === 6], ['copy', panels === 10], ['undo', panels === 1]]) {
          root.querySelector(`[data-action="${actionName}"]`).disabled = disabled;
        }
        live.textContent = `${panels} ${panels === 1 ? 'panel' : 'panels'} with ${balloons} balloons in each makes ${total} balloons.${total === 12 ? ' Twelve! Party ready.' : ''}`;
      }
      root.addEventListener('click', event => {
        const control = event.target.closest('button');
        if (!control || control.disabled) return;
        const action = control.dataset.action;
        if (action === 'less') balloons = Math.max(1, balloons - 1);
        if (action === 'more') balloons = Math.min(6, balloons + 1);
        if (action === 'copy') panels = Math.min(10, panels + 1);
        if (action === 'undo') panels = Math.max(1, panels - 1);
        update(action);
      });
      update();
    }
    function mix(root) {
      let parts = Array(4).fill('e');
      const clipId = `try-tube-${++id}`;
      const tubePath = 'M15 10 H105 V265 A45 45 0 0 1 15 265 Z';
      const live = shell(root, 'Try it: mix a suit colour', `
        <p class="try-hint">Colour Lab · Tap a part to change its paint.</p>
        <div class="try-controls"><span>Equal parts</span>${[2, 3, 4, 6, 8].map(n => button(`<span class="try-number">${n}</span>`, String(n), `aria-label="${n} equal parts" aria-pressed="${n === 4}"`)).join('')}</div>
        <div class="try-lab"><div class="try-tube-wrap"><svg class="try-tube" viewBox="0 0 120 330" role="group" aria-label="Paint tube">
          <defs><clipPath id="${clipId}"><path d="${tubePath}"/></clipPath></defs>
          <g class="try-parts" clip-path="url(#${clipId})"></g>
          <path d="${tubePath}" fill="none" stroke="var(--ink)" stroke-width="4" pointer-events="none"/></svg>
          <p class="try-cycle">empty → yellow → red<br>→ blue → white → empty</p></div>
        <div class="try-suit-wrap"><svg class="try-suit" viewBox="0 0 220 245" role="img" aria-label="Hero suit, ready for paint">
          <path d="M62 35 Q25 112 25 217 Q110 190 195 217 Q195 112 158 35 Z" fill="var(--purple)" stroke="var(--ink)" stroke-width="4"/>
          <path class="try-suit-fill" d="M83 20 Q60 22 43 42 L15 95 L49 113 L68 81 L68 213 Q110 233 152 213 L152 81 L171 113 L205 95 L177 42 Q160 22 137 20 Q110 44 83 20 Z" fill="#E9E9EE" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>
          <path d="M68 179 H152 V195 H68 Z" fill="var(--yellow)" stroke="var(--ink)" stroke-width="3"/>
          <path d="M110 65 L118 85 L141 85 L123 100 L130 123 L110 109 L90 123 L97 100 L79 85 L102 85 Z" fill="white" stroke="var(--ink)" stroke-width="3"/>
        </svg><div class="try-recipe"></div><p class="try-same">SAME COLOUR? <span class="try-target" hidden></span></p></div></div>`);
      // Horizontal boundaries enclose equal AREAS, including the semicircular bottom.
      function stops(n) {
        const area = y => y <= 255 ? 90 * y : 90 * 255 + (y - 255) * Math.sqrt(Math.max(0, 45 ** 2 - (y - 255) ** 2)) + 45 ** 2 * Math.asin(Math.min(1, (y - 255) / 45));
        return Array.from({length: n + 1}, (_, i) => {
          if (!i) return 10;
          if (i === n) return 310;
          let low = 0, high = 300;
          for (let j = 0; j < 40; j++) { const mid = (low + high) / 2; if (area(mid) < area(300) * i / n) low = mid; else high = mid; }
          return 10 + (low + high) / 2;
        });
      }
      function drawTube() {
        const boundaries = stops(parts.length);
        root.querySelector('.try-parts').innerHTML = parts.map((_, i) => `<g class="try-tube-part" data-part="${i}" role="button" tabindex="0"><rect x="15" y="${boundaries[i]}" width="90" height="${boundaries[i + 1] - boundaries[i]}"/><path d="M15 ${boundaries[i]} H105" stroke="var(--ink)" stroke-width="1.5" pointer-events="none"/></g>`).join('');
      }
      function update() {
        root.querySelectorAll('.try-tube-part').forEach((part, i) => {
          part.querySelector('rect').setAttribute('fill', paints[parts[i]] || '#E8F5FF');
          part.setAttribute('aria-label', `Part ${i + 1} of ${parts.length}: ${names[parts[i]]}. Change paint`);
        });
        const items = recipe(parts), filled = items.filter(item => item.colour !== 'empty');
        const list = ['y', 'r', 'b', 'w'].map(code => [paints[code], parts.filter(p => p === code).length]).filter(([, n]) => n);
        const colour = filled.length ? tryMix(list) : '#E9E9EE';
        root.querySelector('.try-suit-fill').setAttribute('fill', colour);
        root.querySelector('.try-suit').setAttribute('aria-label', `Hero suit: ${filled.length ? items.map(item => `${item.numerator} of ${item.denominator} ${item.colour}`).join(', ') : 'no paint yet'}`);
        root.querySelector('.try-recipe').innerHTML = filled.length ? items.map(item => `<span class="try-ingredient"><span class="try-fraction try-number" aria-label="${item.numerator} over ${item.denominator}"><span>${item.numerator}</span><span>${item.denominator}</span></span> ${item.colour}</span>`).join('<span class="try-plus">+</span>') : 'Tap the tube to pour paint';
        const target = sameAs(parts), tag = root.querySelector('.try-target');
        tag.hidden = !target; tag.textContent = target || '';
        root.querySelectorAll('.try-controls button').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.action) === parts.length));
        live.textContent = filled.length ? `${items.map(item => `${item.numerator} out of ${item.denominator} parts ${item.colour}`).join(', ')}.${target ? ` Same colour as ${target}.` : ''}` : `${parts.length} equal parts, all empty. Tap the tube to pour paint.`;
      }
      function cycle(part) {
        const i = Number(part.dataset.part), cycle = ['e', 'y', 'r', 'b', 'w'];
        parts[i] = cycle[(cycle.indexOf(parts[i]) + 1) % cycle.length]; update();
      }
      root.addEventListener('click', event => {
        const part = event.target.closest('.try-tube-part');
        if (part) cycle(part);
        const control = event.target.closest('button');
        if (control) { parts = Array(Number(control.dataset.action)).fill('e'); drawTube(); update(); }
      });
      root.addEventListener('keydown', event => {
        if (event.target.matches('.try-tube-part') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); cycle(event.target); }
      });
      drawTube(); update();
    }
    function clock(root) {
      let minutes = 16 * 60, drag = null;
      const base = root.dataset.base === undefined ? 'comic-city/' : root.dataset.base;
      const ticks = Array.from({length: 60}, (_, i) => `<path transform="rotate(${i * 6})" d="M0 -${i % 5 ? 115 : 110} V-121" stroke="var(--ink)" stroke-width="${i % 5 ? 1 : 3}"/>`).join('');
      const numbers = Array.from({length: 12}, (_, i) => { const n = i + 1, a = n * Math.PI / 6; return `<text x="${Math.sin(a) * 94}" y="${-Math.cos(a) * 94}" class="try-number" text-anchor="middle" dominant-baseline="central">${n}</text>`; }).join('');
      const live = shell(root, 'Try it: turn the clock', `
        <p class="try-hint">Clock Tower · Drag the long blue hand around.</p>
        <div class="try-clock-layout"><div class="try-clock-wrap"><svg class="try-clock" viewBox="-135 -135 270 270" role="img" aria-label="Clock showing 4 o’clock">
          <circle r="127" fill="white" stroke="var(--ink)" stroke-width="5"/>${ticks}${numbers}
          <path class="try-hour-hand" d="M0 9 V-55" stroke="var(--ink)" stroke-width="10" stroke-linecap="round"/>
          <g class="try-minute-hand"><path d="M0 13 V-79" stroke="var(--blue)" stroke-width="6" stroke-linecap="round"/><path class="try-minute-grip" d="M0 -14 V-82" stroke="transparent" stroke-width="30" stroke-linecap="round"/><circle cy="-79" r="8" fill="var(--blue)" stroke="var(--ink)" stroke-width="2"/></g>
          <circle r="7" fill="var(--ink)"/></svg>
          <div class="try-controls try-clock-controls">${button('−<span class="try-number">5</span> min', 'back', 'aria-label="−5 min"')}${button('+<span class="try-number">5</span> min', 'forward', 'aria-label="+5 min"')}</div>
          <p class="try-time try-number">4:00</p><p class="try-time-words"></p></div>
        <div class="try-day-panel"><div class="try-day-picture"><img alt=""></div><p class="try-day-name"></p></div></div>`);
      const face = root.querySelector('.try-clock');
      function update() {
        const h = Math.floor(minutes / 60), m = minutes % 60, angles = handAngles(h, m), words = timeWords(h, m);
        root.querySelector('.try-hour-hand').setAttribute('transform', `rotate(${angles.hour})`);
        root.querySelector('.try-minute-hand').setAttribute('transform', `rotate(${angles.minute})`);
        root.querySelector('.try-time').textContent = `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
        root.querySelector('.try-time-words').innerHTML = digits(words);
        const period = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
        const picture = dayPicture(minutes), img = root.querySelector('img');
        const source = `${base}cut/${picture}.png`;
        if (img.getAttribute('src') !== source) img.setAttribute('src', source);
        img.alt = {'day-1': 'Sunrise', 'day-2': 'Breakfast', 'day-3': 'The school bus', 'day-4': 'Lunch', 'day-5': 'The ice-cream van', 'day-6': 'Bedtime'}[picture];
        root.querySelector('.try-day-name').textContent = period;
        face.setAttribute('aria-label', `Clock showing ${words}, ${period}`);
        live.textContent = `${words} in the ${period}. ${img.alt}.`;
      }
      function move(delta) { minutes = wrap(minutes + delta, 1440); update(); }
      root.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { drag = null; move(b.dataset.action === 'forward' ? 5 : -5); }));
      function angle(event) {
        const point = face.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
        const local = point.matrixTransform(face.getScreenCTM().inverse());
        return wrap(Math.atan2(local.x, -local.y) * 180 / Math.PI, 360);
      }
      face.addEventListener('pointerdown', event => {
        if (!event.target.closest('.try-minute-hand') || drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault(); face.setPointerCapture(event.pointerId);
        drag = {pointer: event.pointerId, angle: angle(event), total: minutes};
      });
      face.addEventListener('pointermove', event => {
        if (!drag || drag.pointer !== event.pointerId) return;
        const current = angle(event), delta = wrap(current - drag.angle + 180, 360) - 180;
        drag.total += delta / 6; drag.angle = current;
        const snapped = wrap(Math.round(drag.total / 5) * 5, 1440);
        if (snapped !== minutes) { minutes = snapped; update(); }
      });
      function release(event) { if (drag && event.pointerId === drag.pointer) drag = null; }
      face.addEventListener('pointerup', release); face.addEventListener('pointercancel', release); face.addEventListener('lostpointercapture', release);
      update();
    }
    function init() {
      document.querySelectorAll('.try[data-try]').forEach(root => {
        if (root.dataset.tryReady) return;
        const build = {copies, mix, clock}[root.dataset.try];
        if (build) { root.dataset.tryReady = 'true'; build(root); }
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
    else init();
  }
  if (typeof module !== 'undefined') module.exports = {timeWords, handAngles, recipe, sameAs, tryMix, dayPicture};
}());
