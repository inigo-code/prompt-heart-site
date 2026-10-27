// Prompt Heart site: the fill-in sheet, the screen switcher, the library tabs and the reveals.
// The page reads fine without this file; the sheet then shows its first prompt as plain text.

const PLACEHOLDER = /\{\{\s*([^{}|]+?)\s*(?:\|\s*([^{}]*?)\s*)?\}\}/g;
const MAX_QUERY = 1800;
const tokens = (text) => Math.ceil(text.trim().length / 4);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The blanks in a prompt, in order: name, default, and whether it sits on a line of its own. */
function blanksOf(body) {
  const seen = new Map();
  for (const m of body.matchAll(PLACEHOLDER)) {
    if (seen.has(m[1])) continue;
    const before = body.slice(0, m.index);
    seen.set(m[1], { name: m[1], fallback: m[2] ?? '', long: before.endsWith('\n') || before.endsWith(': ') && /\n/.test(before) });
  }
  return [...seen.values()];
}

const libraryReady = fetch('assets/library.json').then((r) => r.json()).catch(() => null);

// ---------- the fill-in sheet ----------
(async () => {
  const form = document.getElementById('filler');
  const lib = await libraryReady;
  if (!form || !lib) return;
  const picks = form.querySelectorAll('#filler-picks button');
  const fields = document.getElementById('filler-fields');
  const preview = document.getElementById('filler-preview');
  const copyBtn = document.getElementById('filler-copy');
  const chatgpt = document.getElementById('filler-chatgpt');
  const claude = document.getElementById('filler-claude');
  const byId = new Map(lib.prompts.map((p) => [p.id, p]));
  let current = byId.get('mkt-social-posts');

  const values = () => Object.fromEntries([...fields.querySelectorAll('input, textarea')].map((el) => [el.name, el.value.trim()]));
  const filledText = () => {
    const v = values();
    return current.b.replace(PLACEHOLDER, (match, name, fallback) => v[name] || fallback || match);
  };

  const render = () => {
    const v = values();
    let html = '';
    let last = 0;
    for (const m of current.b.matchAll(PLACEHOLDER)) {
      html += esc(current.b.slice(last, m.index));
      const value = v[m[1]] || m[2];
      html += value ? `<span class="filled">${esc(value)}</span>` : `<mark>${esc(m[0])}</mark>`;
      last = m.index + m[0].length;
    }
    preview.innerHTML = html + esc(current.b.slice(last));
    const text = filledText();
    const open = (base) => (text.length > MAX_QUERY ? base : `${base}?q=${encodeURIComponent(text)}`);
    chatgpt.href = open('https://chatgpt.com/');
    claude.href = open('https://claude.ai/new');
    const left = blanksOf(current.b).filter((b) => !v[b.name] && !b.fallback).length;
    copyBtn.textContent = left ? `Copy (${left} blank)` : 'Copy';
  };

  const build = () => {
    fields.innerHTML = blanksOf(current.b)
      .map((b) => {
        const label = sentence(b.name);
        const attrs = `name="${esc(b.name)}" value="${esc(b.fallback)}" placeholder="Enter ${esc(b.name)}"`;
        return b.long
          ? `<label class="wide"><span>${esc(label)}</span><textarea name="${esc(b.name)}" rows="2" placeholder="Enter ${esc(b.name)}">${esc(b.fallback)}</textarea></label>`
          : `<label><span>${esc(label)}</span><input ${attrs}></label>`;
      })
      .join('');
    render();
  };

  picks.forEach((btn) =>
    btn.addEventListener('click', () => {
      picks.forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      current = byId.get(btn.dataset.id) ?? current;
      build();
    }),
  );
  // Arrow keys move between the prompt choices, as in any radio group.
  form.querySelector('#filler-picks').addEventListener('keydown', (e) => {
    const list = [...picks];
    const i = list.indexOf(document.activeElement);
    if (i < 0 || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const next = list[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length];
    next.focus();
    next.click();
  });
  fields.addEventListener('input', render);

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(filledText());
      copyBtn.textContent = 'Copied';
    } catch {
      copyBtn.textContent = 'Select the text to copy';
    }
    setTimeout(render, 1600);
  });

  build();
})();

// ---------- inside the app: switch screens ----------
(() => {
  const tabs = document.querySelectorAll('#showcase-tabs [role="tab"]');
  const img = document.getElementById('showcase-img');
  const stage = document.getElementById('showcase-stage');
  const fact = document.getElementById('showcase-fact');
  if (!tabs.length || !img) return;
  // Fetch the other screens only when someone reaches for the list, so phones don't download them unasked.
  let warmed = false;
  const warm = () => { if (warmed) return; warmed = true; tabs.forEach((t) => { const i = new Image(); i.src = t.dataset.img; }); };
  const list = document.getElementById('showcase-tabs');
  ['pointerenter', 'focusin', 'touchstart'].forEach((ev) => list.addEventListener(ev, warm, { once: true, passive: true }));

  const select = (tab) => {
    tabs.forEach((t) => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
    stage.dataset.tone = tab.dataset.tone;
    fact.textContent = tab.dataset.fact;
    if (img.getAttribute('src') === tab.dataset.img) return;
    img.classList.add('is-swapping');
    setTimeout(() => {
      img.src = tab.dataset.img;
      img.alt = tab.dataset.alt;
      img.decode().catch(() => {}).finally(() => img.classList.remove('is-swapping'));
    }, 160);
  };
  tabs.forEach((t, i) => {
    t.tabIndex = i === 0 ? 0 : -1;
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const next = tabs[(i + d + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });
})();

// ---------- the library: categories and their prompts ----------
(async () => {
  const cats = document.querySelectorAll('#cats [role="tab"]');
  const bands = document.getElementById('bands');
  const lib = await libraryReady;
  if (!cats.length || !bands || !lib) return;

  const show = (key) => {
    const items = lib.prompts.filter((p) => p.c === key);
    bands.innerHTML = items
      .map((p) => {
        const blanks = blanksOf(p.b).map((b) => b.name);
        const chips = blanks.slice(0, 2).map((n) => `<i>${esc(n)}</i>`).join('') + (blanks.length > 2 ? `<i>+${blanks.length - 2}</i>` : '');
        const flat = p.b.replace(/\s+/g, ' ').trim();
        const note = flat.length > 96 ? flat.slice(0, flat.lastIndexOf(' ', 96)) + '…' : flat;
        return `<li><span class="tok nums">~${tokens(p.b)} tok</span><span class="what"><strong>${esc(p.t)}</strong><small>${esc(note)}</small></span><span class="blanks">${chips}</span></li>`;
      })
      .join('');
  };
  const select = (tab, focus) => {
    cats.forEach((t) => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
    if (focus) tab.focus();
    bands.classList.add('is-swapping');
    setTimeout(() => { show(tab.dataset.cat); bands.classList.remove('is-swapping'); }, 180);
  };
  cats.forEach((t, i) => {
    t.tabIndex = i === 0 ? 0 : -1;
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      select(cats[(i + d + cats.length) % cats.length], true);
    });
  });
  show('image');
})();

// ---------- reveal once on entering the screen; never leaves content hidden ----------
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  // A shutter starts fully clipped, so watch the frame it opens in rather than the picture itself.
  const watched = new Map([...targets].map((el) => [el.classList.contains('shutter') ? el.parentElement : el, el]));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { watched.get(e.target).classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  watched.forEach((_, el) => io.observe(el));
  addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
  }), 2500));
})();
