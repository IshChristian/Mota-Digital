const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
// Load only normalizeEstimate from services/api.ts (the rest needs the app runtime).
const src = fs.readFileSync('services/api.ts', 'utf8');
const start = src.indexOf('export function normalizeEstimate'), end = src.indexOf('export type FareOption');
const moduleExports = {};
vm.runInNewContext(ts.transpileModule(src.slice(start, end), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: moduleExports, Number, Array });
const { normalizeEstimate } = moduleExports;
const plain = (v) => JSON.parse(JSON.stringify(v));

test('older server: single estimate (production shape) becomes one moto option', () => {
  const out = plain(normalizeEstimate({ distanceSource: 'road', distanceKm: 3.6, durationMinutes: 9, minimumFare: 1267, maximumFare: 1901, suggestedFare: 1584 }));
  assert.equal(out.length, 1);
  assert.equal(out[0].vehicleType, 'motor');
  assert.equal(out[0].suggestedFare, 1584);
  assert.equal(out[0].routeSource, 'google');
});
test('newer server: options list is used as-is (top level or under data)', () => {
  const options = [{ vehicleType: 'motor', suggestedFare: 1000 }, { vehicleType: 'car', suggestedFare: 2500 }];
  assert.equal(normalizeEstimate({ options }).length, 2);
  assert.equal(normalizeEstimate({ data: { options } }).length, 2);
});
test('unusable responses give an empty list instead of crashing', () => {
  for (const body of [undefined, null, {}, { message: 'error' }, { data: {} }]) assert.equal(normalizeEstimate(body).length, 0);
});
