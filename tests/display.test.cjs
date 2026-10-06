const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({console, Date, Intl});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8').replace(/main\(\);\s*$/, ''), context);
const run = source => vm.runInContext(source, context);
test('new and complete water years retain equal dimensions', () => {
  const svg = week => run(`buildLevelHeatmapSvg({cells:[{week_index:${week}, weekday_index:3, max_level_m:0.1, percent_of_average:60}]})`);
  assert.equal(svg(0).match(/viewBox="([^"]+)"/)[1], svg(52).match(/viewBox="([^"]+)"/)[1]);
});
test('missing observations remain distinct from genuine zero', () => {
  assert.ok(Number.isNaN(run('heatmapNumber(null)')));
  assert.equal(run('heatmapNumber(0)'), 0);
  assert.match(run('buildLevelHeatmapSvg({cells:[{week_index:0, weekday_index:3, max_level_m:null, percent_of_average:null}]})'), /level-heatmap-cell--missing/);
});
test('depth and flow axes expand beyond their minimum upper bound', () => {
  const depth = run('chartOptions({start:0,end:100}, "Depth", 0.173)').scales.y;
  const flow = run('responseChartOptions({start:0,end:100}, "Rain", "Flow", true, 0.492)').scales.yFlow;
  for (const [axis, floor] of [[depth,0.173],[flow,0.492]]) {
    assert.equal(axis.beginAtZero, true);
    assert.equal(axis.suggestedMax, floor);
    assert.equal(axis.max, undefined); // Chart.js remains free to include high events.
  }
  assert.equal(run('responseChartOptions({start:0,end:100}, "Rain", "Flow", false)').scales.yFlow.suggestedMax, undefined);
  assert.equal(run('positiveAxisFloor(null)'), null);
});
