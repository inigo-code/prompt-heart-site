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

  // A soft light follows the pointer across the big cards.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.app, .win-app, .get, .row-media, .more > div, .way, .stage').forEach((el) => {
      el.setAttribute('data-spot', '');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }
})();
