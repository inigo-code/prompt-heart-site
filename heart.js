// Heart: the bar, the phone menu and the light on the cards. Without this file every part is still shown.
(() => {
  const bar = document.querySelector('.bar');
  if (bar) {
    // The bar frosts over once the page moves under it.
    const stick = () => bar.classList.toggle('is-stuck', scrollY > 8);
    stick();
    addEventListener('scroll', stick, { passive: true });

    // On a phone the section links sit behind a menu button.
    const nav = bar.querySelector('nav');
    if (nav) {
      if (!nav.id) nav.id = 'site-menu';
      const btn = document.createElement('button');
      btn.className = 'menu-button';
      btn.type = 'button';
      btn.setAttribute('aria-controls', nav.id);
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Menu');
      btn.innerHTML = '<span aria-hidden="true"></span>';
      nav.after(btn);
      const set = (open) => {
        bar.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        document.documentElement.style.overflow = open ? 'hidden' : '';
      };
      btn.addEventListener('click', () => set(!bar.classList.contains('is-open')));
      nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
      addEventListener('keydown', (e) => { if (e.key === 'Escape' && bar.classList.contains('is-open')) { set(false); btn.focus(); } });
      matchMedia('(min-width: 681px)').addEventListener('change', (m) => { if (m.matches) set(false); });
    }
  }

  // A soft light follows the pointer across the big cards (heart.css, "light that follows the pointer").
  // The light eases after the pointer instead of sticking to it, starts where the pointer comes in,
  // and lights the rims of the cards near the pointer too. One frame loop, running only while needed.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const REACH = 220; // how far, in px, the rim light reaches cards beside the pointer
    const cards = [...document.querySelectorAll('.app, .win-app, .get, .row-media, .way, .stage')].map((el) => {
      el.setAttribute('data-spot', '');
      // The download rows are see-through, so a pool on them shows as a pale blob: they take the rim only.
      if (!el.matches('.way')) {
        const pool = document.createElement('span');
        pool.className = 'spot';
        pool.setAttribute('aria-hidden', 'true');
        el.prepend(pool);
      }
      return { el, x: 0, y: 0, near: 0, on: false };
    });
    let px = -1e4, py = -1e4, frame = 0;
    const tick = () => {
      frame = 0;
      let moving = false;
      for (const c of cards) {
        const r = c.el.getBoundingClientRect();
        const dx = Math.max(r.left - px, 0, px - r.right), dy = Math.max(r.top - py, 0, py - r.bottom);
        const near = Math.max(0, 1 - Math.hypot(dx, dy) / REACH);
        const inside = dx === 0 && dy === 0;
        const tx = px - r.left, ty = py - r.top;
        if (near > 0 || c.near > 0) {
          // Coming in from the dark: start the light where the pointer is, not where it last was.
          if (c.near === 0) { c.x = tx; c.y = ty; }
          c.x += (tx - c.x) * 0.2; c.y += (ty - c.y) * 0.2;
          if (Math.abs(tx - c.x) > 0.5 || Math.abs(ty - c.y) > 0.5) moving = true;
          c.el.style.setProperty('--mx', `${c.x.toFixed(1)}px`);
          c.el.style.setProperty('--my', `${c.y.toFixed(1)}px`);
          c.el.style.setProperty('--near', (inside ? 1 : near * 0.55).toFixed(3));
        }
        c.near = near;
        if (inside !== c.on) { c.on = inside; c.el.classList.toggle('is-lit', inside); }
      }
      if (moving) frame = requestAnimationFrame(tick);
    };
    const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };
    addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') { px = e.clientX; py = e.clientY; wake(); } }, { passive: true });
    addEventListener('scroll', wake, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { px = py = -1e4; wake(); });
  }
})();
