// Prompt Heart site: the working fill-in sheet.
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
