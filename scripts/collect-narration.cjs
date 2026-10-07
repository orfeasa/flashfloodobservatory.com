// Render our trusted page in a DOM emulator, not a browser. The same renderer and
// readAloudText function serve the build and visitors, so audio matches the page.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');

async function renderNarrationDocument(payload, variant = '') {
  const [html, css, app] = await Promise.all(['index.html', 'styles.css', 'app.js']
    .map(file => fs.readFile(path.join(root, 'public', variant, file), 'utf8')));
  const dom = new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''), {
    url: `https://flashfloodobservatory.com/${variant ? variant + '/' : ''}`, runScripts: 'outside-only',
  });
  const {window} = dom;
  const style = window.document.createElement('style');
  style.textContent = css;
  window.document.head.append(style);
  // Only our checked-in renderer runs. No external resources or networks load.
  window.matchMedia = () => ({matches:false, addEventListener() {}, removeEventListener() {}});
  window.requestAnimationFrame = callback => callback();
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
  window.Chart = class { destroy() {} };
  window.Audio = function () {
    const audio = window.document.createElement('audio');
    audio.pause = () => {};
    audio.load = () => {};
    audio.play = () => Promise.resolve();
    dom.audio = audio;
    return audio;
  };
  window.TextEncoder = TextEncoder;
  Object.defineProperty(window.crypto, 'subtle', {value: crypto.webcrypto.subtle});
  window.fetch = async () => ({ok: true, json: async () => payload});
  window.eval(app.replace(/main\(\);\s*$/, ''));
  await window.main();
  if (!window.document.querySelector('.read-aloud-button')) {
    dom.window.close();
    throw new Error('Dashboard did not render; refusing to build incomplete narration.');
  }
  return dom;
}

async function collectNarration(payload, variant = '') {
  const dom = await renderNarrationDocument(payload, variant);
  const {window} = dom;
  const requests = new Map();
  try {
    const windows = [...window.document.querySelectorAll('.window-button')];
    for (const button of windows.length ? windows : [null]) {
      button?.click();
      const select = window.document.getElementById('heatmapPeriodSelect');
      const years = [...select.options].map(option => option.value);
      for (const year of years.length ? years : [null]) {
        if (year !== null) {
          select.value = year;
          select.dispatchEvent(new window.Event('change'));
        }
        for (const section of window.document.querySelectorAll('.read-aloud-section')) {
          const text = window.readAloudText(section);
          if (!text) continue;
          const hash = crypto.createHash('sha256')
            .update(window.readAloudAudioVersion + '\n' + text).digest('hex');
          if (requests.has(hash) && requests.get(hash).text !== text) {
            throw new Error('Narration hash collision');
          }
          requests.set(hash, {hash, text, version: window.readAloudAudioVersion});
        }
      }
    }
    return [...requests.values()];
  } finally { window.close(); }
}

if (require.main === module) {
  (async () => {
    const payload = JSON.parse(await fs.readFile(path.join(root, 'public/data/site_payload.json'), 'utf8'));
    const all = await collectNarration(payload);
    const requests = [...new Map(all.map(item => [item.hash, item])).values()];
    await fs.mkdir(path.join(root, '.cache'), {recursive:true});
    await fs.writeFile(path.join(root, '.cache/narration.json'), JSON.stringify(requests, null, 2));
    console.log(`Collected ${requests.length} distinct narration clips, including every window and water year.`);
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = {collectNarration, renderNarrationDocument};
