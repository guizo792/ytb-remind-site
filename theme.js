// Runs before the page paints, so a saved theme never flashes the other one.
try {
  const saved = localStorage.getItem('rml-theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch {
  // storage unavailable: follow the system theme
}
