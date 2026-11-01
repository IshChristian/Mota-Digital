const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const load = (file) => { const exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports }); return exports; };
// Objects created inside the VM have a different prototype; compare plain copies.
const plain = (v) => JSON.parse(JSON.stringify(v));
const { haversineKm, decodePolyline } = load('utils/geo.ts');
const { kigaliParts } = load('utils/kigaliTime.ts');

test('decodes Google encoded polylines', () => {
  // Example from Google's polyline algorithm documentation.
  const points = plain(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'));
  assert.deepEqual(points, [{ latitude: 38.5, longitude: -120.2 }, { latitude: 40.7, longitude: -120.95 }, { latitude: 43.252, longitude: -126.453 }]);
  assert.deepEqual(plain(decodePolyline('')), []);
});

test('haversine distance across Kigali is plausible', () => {
  const km = haversineKm({ latitude: -1.9536, longitude: 30.0927 }, { latitude: -1.9577, longitude: 30.1127 });
  assert.ok(km > 2 && km < 3, String(km));
  assert.equal(haversineKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }), 0);
});

test('scheduled times are sent in Kigali time regardless of phone timezone', () => {
  assert.deepEqual(plain(kigaliParts(new Date('2026-11-01T21:30:00Z'))), { scheduledDate: '2026-11-01', scheduledTime: '23:30' });
  assert.deepEqual(plain(kigaliParts(new Date('2026-11-01T22:15:00Z'))), { scheduledDate: '2026-11-02', scheduledTime: '00:15' }, 'crosses midnight');
});
