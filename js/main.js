import { init } from './ui.js';

init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // offline support is a bonus, not required for the game to run
    });
  });
}
