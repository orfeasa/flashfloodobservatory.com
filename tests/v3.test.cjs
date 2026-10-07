const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {renderNarrationDocument, collectNarration} = require('../scripts/collect-narration.cjs');
const payload = JSON.parse(fs.readFileSync('public/data/site_payload.json', 'utf8'));
test('v3 whole water years distinguish missing, zero and future days', async () => {
 const dom = await renderNarrationDocument(payload, 'v3');
 try {
  const w=dom.window;
  const y=w.completeWaterYear({start_date:'2025-10-01',end_date:'2026-09-30',cells:[{date:'2025-11-06',max_level_m:0,percent_of_average:0}]});
  assert.equal(y.cells.length,365); assert.equal(y.month_ticks.length,12);
  assert.equal(y.cells[0].date,'2025-10-01'); assert.equal(y.cells[0].max_level_m,null); assert.equal(y.cells[0].future,false);
  assert.equal(y.cells.find(c=>c.date==='2025-11-06').max_level_m,0); assert.equal(y.cells.at(-1).future,true);
  const select=w.document.getElementById('heatmapPeriodSelect'); select.value='2025-26'; select.dispatchEvent(new w.Event('change'));
  const cell=w.document.querySelector('[data-date="2025-10-01"].level-heatmap-cell--missing'); assert.ok(cell); cell.dispatchEvent(new w.Event('click'));
  assert.match(w.document.getElementById('levelHeatmapDayDetail').textContent,/No/);
  assert.equal(w.document.getElementById('heatmapWeekOutline').getAttribute('x'),'95');
  assert.equal(w.document.querySelector('.level-heatmap-svg').getAttribute('viewBox'),'0 0 1180 210');
 } finally {dom.window.close();}
});
test('v3 axes retain expandable floors and tooltips distinguish measurements', async()=>{
 const dom=await renderNarrationDocument(payload,'v3');
 try {
  const w=dom.window;
  const depth=w.standardChartOptions({start:0,end:100},'Depth',.173).scales.y;
  const flow=w.responseChartOptions({start:0,end:100},'Rain','Flow',true,.492).scales.yFlow;
  assert.equal(depth.suggestedMax,.173); assert.equal(flow.suggestedMax,.492); assert.equal(depth.max,undefined); assert.equal(flow.max,undefined);
  const label=w.chartPlugins().tooltip.callbacks.label;
  assert.equal(label({dataset:{yAxisID:'yFlow'},parsed:{y:.125}}),'Flow rate: 0.125 m³/s');
  assert.equal(label({dataset:{yAxisID:'yRain'},parsed:{y:.5}}),'Rainfall: 0.50 mm');
  assert.equal(label({dataset:{},parsed:{y:.12}}),'Water depth: 0.120 m');
 } finally {dom.window.close();}
});
test('v3 eight grouped speakers expand units, remove repeated colours and have generated clip requests',async()=>{
 const dom=await renderNarrationDocument(payload,'v3');
 try {
  const w=dom.window;
  assert.equal(w.document.querySelectorAll('.read-aloud-button').length,8);
  const stats=w.readAloudText(w.document.getElementById('readings'));
  assert.ok(stats.includes('24 hours')); assert.ok(stats.includes('metres')); assert.doesNotMatch(stats,/\b24h\b/);
  const heat=w.readAloudText(w.document.getElementById('levelHeatmapPanel'));
  assert.doesNotMatch(heat,/brown\s*\(?brown|purple\s*\(?purple/); assert.ok(heat.includes('brown square'));
  const context=w.readAloudText(w.document.getElementById('context'));
  assert.ok(context.includes('Why Boscastle')); assert.ok(context.includes('How it is observed')); assert.ok(context.includes('Impact'));
  const requests=await collectNarration(payload,'v3');
  assert.ok(requests.some(r=>r.text.includes('last 5 days'))); assert.ok(requests.some(r=>r.text.includes('1 Oct 2025')));
  w.document.querySelector('#depthPanel .read-aloud-button').click(); await new Promise(r=>setTimeout(r,30));
  assert.match(dom.audio.getAttribute('src'),/^\.\.\/assets\/audio\/[a-f0-9]{64}\.mp3$/);
  assert.ok(requests.some(r=>dom.audio.src.includes(r.hash)));
 } finally {dom.window.close();}
});
test('v3 day selector follows week/year changes without changing narration', async()=>{
 const dom=await renderNarrationDocument(payload,'v3');
 try {
  const w=dom.window, d=w.document;
  w.matchMedia = () => ({matches:true, addEventListener(){}, removeEventListener(){}});
  w.layoutHeatmap(d.getElementById('levelHeatmapMount'));
  assert.equal(d.querySelectorAll('.level-heatmap-axis').length,28);
  assert.equal(w.compactWeekLabel('2025-12-29','2026-01-04'),'29 Dec–4 Jan 2026');
  const year=d.getElementById('heatmapPeriodSelect');
  year.value='2025-26'; year.dispatchEvent(new w.Event('change'));
  const week=d.getElementById('heatmapWeekSelect'); week.value='0'; week.dispatchEvent(new w.Event('change'));
  const day=d.getElementById('heatmapDaySelect');
  const spoken=w.readAloudText(d.getElementById('levelHeatmapPanel'));
  assert.equal(day.options.length,5);
  day.value='2025-10-03'; day.dispatchEvent(new w.Event('change'));
  assert.match(d.getElementById('levelHeatmapDayDetail').textContent,/03\/10\/2025/);
  assert.equal(w.readAloudText(d.getElementById('levelHeatmapPanel')),spoken);
  year.value='2026-27'; year.dispatchEvent(new w.Event('change'));
  assert.ok([...day.options].every(o=>o.value.startsWith('2026-')));
 } finally {dom.window.close();}
});
