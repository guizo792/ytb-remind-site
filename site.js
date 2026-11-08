// The theme switch for the help and privacy pages. theme.js applies a saved choice before paint; the
// home page and these pages share it ('rml-theme'). A plain script, so it works when opened from disk.
const root = document.documentElement;
const button = document.getElementById('theme');
const systemQuery = matchMedia('(prefers-color-scheme: dark)');
const current = () => root.dataset.theme ?? (systemQuery.matches ? 'dark' : 'light');
function sync() {
  const dark = current() === 'dark';
  button.setAttribute('aria-pressed', String(dark));
  button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
button.addEventListener('click', () => {
  const next = current() === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('rml-theme', next);
  } catch {
    // not saved: it still applies for this visit
  }
  sync();
});
systemQuery.addEventListener('change', sync);
sync();
