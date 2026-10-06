const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {collectNarration, renderNarrationDocument} = require('../scripts/collect-narration.cjs');
const payload = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/site_payload.json'), 'utf8'));
const settle = async () => { for (let i=0;i<20;i++) await new Promise(resolve=>setTimeout(resolve,5)); };

test('all chart windows, years and colour explanations receive audio', async () => {
  const requests = await collectNarration(payload);
  assert.ok(requests.some(item=>item.text.includes('last 24 hours')));
  assert.ok(requests.some(item=>item.text.includes('last 5 days')));
  for (const year of payload.analysis_panels.level_heatmap.hydrological_years) {
    assert.ok(requests.some(item=>item.text.includes(year.period_label)));
  }
  assert.ok(requests.some(item=>item.text.includes('purple square')));
  assert.ok(requests.some(item=>item.text.includes('grey square with a diagonal line')));
  assert.equal(new Set(requests.map(item=>item.hash)).size, requests.length);
});

test('recordings change when displayed observations change', async () => {
  const updated = structuredClone(payload);
  updated.summary_metrics[0].value = 0.999;
  const before = await collectNarration(payload);
  const after = await collectNarration(updated);
  assert.ok(after.some(item=>!before.some(old=>old.hash===item.hash) && item.text.includes('0.999')));
  assert.ok(before.some(item=>after.some(newItem=>newItem.hash===item.hash)));
});

test('playback needs no installed voice and uses the exact build filename', async () => {
  const requests = await collectNarration(payload);
  const dom = await renderNarrationDocument(payload);
  try {
    const {window} = dom;
    assert.equal(window.speechSynthesis, undefined);
    const button = window.document.querySelector('#depthPanel .read-aloud-button');
    button.click(); await settle();
    assert.match(dom.audio.getAttribute('src'), /^assets\/audio\/[a-f0-9]{64}\.mp3$/);
    assert.ok(requests.some(item=>dom.audio.src.includes(item.hash)));
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    button.click();
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    button.click(); await settle();
    window.document.querySelector('.window-button').click();
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    assert.equal(dom.audio.src, '');
  } finally { dom.window.close(); }
});

test('load failures reset the button and offer a useful message', async () => {
  const dom = await renderNarrationDocument(payload);
  try {
    const button = dom.window.document.querySelector('.read-aloud-button');
    dom.audio.play = async () => { throw new Error('Unavailable'); };
    button.click(); await settle();
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    assert.match(dom.window.document.getElementById('readAloudStatus').textContent, /could not be loaded/);
  } finally { dom.window.close(); }
});
