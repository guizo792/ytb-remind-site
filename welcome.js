// A plain script on purpose: browsers block module scripts when a page is opened from disk, which
// used to leave the demo and the theme button dead. The links live in welcome.html itself.

// --- Theme: follows the system until you choose; theme.js applies a saved choice before paint ---
const root = document.documentElement;
const themeButton = document.getElementById('theme');
const systemQuery = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => root.dataset.theme ?? (systemQuery.matches ? 'dark' : 'light');

function syncThemeButton() {
  const dark = currentTheme() === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
themeButton.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('rml-theme', next);
  } catch {
    // not saved: it still applies for this visit
  }
  syncThemeButton();
});
systemQuery.addEventListener('change', syncThemeButton);
syncThemeButton();

// --- Pin step: shows how to pin it until the browser says it is pinned. Pinning can only be done by
// the user, so this only reads the state (Chrome 91+). Without that, the instructions simply stay. ---
const pinStep = document.getElementById('pin');
const actionApi = typeof chrome !== 'undefined' ? chrome.action : undefined;
function showPinState(pinned) {
  pinStep.dataset.state = pinned ? 'pinned' : 'unpinned';
}
function checkPinned() {
  actionApi.getUserSettings().then((settings) => showPinState(!!settings.isOnToolbar), () => {});
}
if (actionApi && typeof actionApi.getUserSettings === 'function') {
  checkPinned();
  if (actionApi.onUserSettingsChanged) {
    actionApi.onUserSettingsChanged.addListener((change) => {
      if ('isOnToolbar' in change) showPinState(!!change.isOnToolbar);
    });
  }
  // Older browsers have no change event: look again whenever you come back to this tab.
  window.addEventListener('focus', checkPinned);
}

// --- The demo: the real flow, played out on a pretend video. It never touches your reminders. ---
const TOAST_MS = 5000; // like the real toast
const NOTICE_DELAY_MS = 2600; // "20 minutes later"
const UNDO_NOTE_MS = 2000;

const demo = document.getElementById('demo');
const bell = document.getElementById('demo-bell');
const dialog = document.getElementById('demo-dialog');
const options = document.getElementById('demo-options');
const toast = document.getElementById('demo-toast');
const notice = document.getElementById('demo-notice');
const result = document.getElementById('demo-result');
const hint = document.getElementById('demo-hint');

// An invitation to click the bell, until you do
function showHint() {
  hint.hidden = false;
  bell.classList.add('nudge');
}
function hideHint() {
  hint.hidden = true;
  bell.classList.remove('nudge');
}

const clock = (ms) => new Date(Date.now() + ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const CHOICES = [
  { label: 'In 20 minutes', hint: () => `Today · ${clock(20 * 60_000)}` },
  { label: 'In 1 hour', hint: () => `Today · ${clock(3_600_000)}` },
  { label: 'Tomorrow', hint: () => 'Tomorrow · 9:00 AM' },
];

let noticeTimer;
let toastTimer;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fillOptions() {
  options.replaceChildren(
    ...CHOICES.map((choice) => {
      const button = el('button', 'option');
      button.type = 'button';
      button.append(el('span', '', choice.label), el('span', 'hint', choice.hint()));
      button.addEventListener('click', () => choose(choice));
      return button;
    }),
  );
}

function setBell(active) {
  bell.classList.toggle('active', active);
  bell.title = active ? 'Reminder set' : 'Remind me';
}

function openDialog() {
  hideHint();
  fillOptions();
  dialog.hidden = false;
  options.querySelector('button').focus();
}

function closeDialog({ restoreFocus = false } = {}) {
  dialog.hidden = true;
  if (restoreFocus) bell.focus();
}

function showToast(text, { undo = false } = {}) {
  clearTimeout(toastTimer);
  const message = el('span', '', text);
  toast.replaceChildren(message);
  if (undo) {
    const button = el('button', '', 'Undo');
    button.type = 'button';
    button.addEventListener('click', () => {
      clearTimeout(noticeTimer); // an undone reminder never fires
      setBell(false);
      showToast('Reminder removed');
      toastTimer = setTimeout(() => {
        toast.hidden = true;
        showHint(); // an undone reminder puts the demo back at the start
      }, UNDO_NOTE_MS);
    });
    toast.append(button);
  }
  toast.hidden = false;
  toastTimer = setTimeout(() => (toast.hidden = true), TOAST_MS);
}

function choose(choice) {
  closeDialog();
  setBell(true);
  showToast(`Reminder set · ${choice.hint()}`, { undo: true });
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.hidden = false), NOTICE_DELAY_MS);
}

function finish(message) {
  notice.hidden = true;
  setBell(false);
  result.querySelector('p').textContent = message;
  result.hidden = false;
  result.querySelector('button').focus();
}

function reset() {
  clearTimeout(noticeTimer);
  clearTimeout(toastTimer);
  closeDialog();
  toast.hidden = true;
  notice.hidden = true;
  result.hidden = true;
  setBell(false);
  showHint();
  bell.focus();
}

bell.addEventListener('click', () => (dialog.hidden ? openDialog() : closeDialog({ restoreFocus: true })));
dialog.querySelector('[data-close]').addEventListener('click', () => closeDialog({ restoreFocus: true }));
dialog.addEventListener('click', (event) => event.target === dialog && closeDialog({ restoreFocus: true }));
demo.addEventListener('keydown', (event) => event.key === 'Escape' && !dialog.hidden && closeDialog({ restoreFocus: true }));
notice.querySelector('[data-action="open"]').addEventListener('click', () => finish("That's the idea: the video opens right where you left it. Now try it on YouTube."));
notice.querySelector('[data-action="snooze"]').addEventListener('click', () => finish("Snoozed for an hour. It will ping you again then. Now try it on YouTube."));
result.querySelector('[data-replay]').addEventListener('click', reset);
