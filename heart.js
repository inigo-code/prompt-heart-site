// Heart: each part rises once as it reaches the screen. Without this file everything is simply shown.
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  const show = (el) => el.classList.add('is-in');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { targets.forEach(show); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  targets.forEach((el) => io.observe(el));
  // Anything still waiting once the page has settled is shown, so nothing stays hidden.
  addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) show(el);
  }), 2500));
})();
