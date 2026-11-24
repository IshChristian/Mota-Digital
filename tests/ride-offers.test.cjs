const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const module_ = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/rideOffers.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: module_.exports, module: module_, Map, Set });
const { addOffer, removeOffer, syncOffers, offerId, FRESH_MS } = module_.exports;
const ids = (list) => Array.from(list, offerId);

test('a second request queues behind the first instead of replacing it', () => {
  assert.deepEqual(ids(addOffer(addOffer([], { id: 'a' }, 1), { id: 'b' }, 2)), ['a', 'b']);
});
test('a raised offer updates in place', () => {
  const list = addOffer(addOffer(addOffer([], { id: 'a', offeredFare: 1 }, 1), { id: 'b' }, 2), { id: 'a', offeredFare: 9 }, 3);
  assert.deepEqual(ids(list), ['a', 'b']); assert.equal(list[0].offeredFare, 9);
});
test('a request the server no longer lists disappears, even if its closed event was missed', () => {
  assert.deepEqual(ids(syncOffers(addOffer([], { id: 'a' }, 0), [], new Map(), FRESH_MS + 1)), []);
});
test('a request that just arrived survives an older list', () => {
  assert.deepEqual(ids(syncOffers(addOffer([], { id: 'a' }, 100), [], new Map(), 200)), ['a']);
});
test('a missed request is picked up from the list', () => {
  assert.deepEqual(ids(syncOffers([], [{ _id: 'a' }, { _id: 'b' }], new Map(), 5)), ['a', 'b']);
});
test('a request just declined does not come back from an older list, but can be re-offered later', () => {
  const closed = new Map([['a', 100]]);
  assert.deepEqual(ids(syncOffers([], [{ _id: 'a' }], closed, 200)), []);
  assert.deepEqual(ids(syncOffers([], [{ _id: 'a' }], closed, 100 + FRESH_MS)), ['a']);
});
test('remove', () => assert.deepEqual(ids(removeOffer(addOffer([], { id: 'a' }, 1), 'a')), []));
