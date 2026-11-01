const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function setup(o={}){const calls=[],module={exports:{}};class File{constructor(...parts){this.uri=parts.join('');}get size(){if(o.unknownSize)throw Error('unknown');return o.large?21*1024*1024:4;}async base64(){calls.push(['read',this.uri]);if(o.failAll||o.failSource&&!this.uri.startsWith('file:///scoped/'))throw Error('java.io.IOException /private');return o.empty?'':o.largeData?'A'.repeat(28*1024*1024+4):'YWJjZA==';}copy(to){calls.push(['copy',to.uri]);if(o.copyFailure)throw Error('permission');}delete(){calls.push(['delete',this.uri]);if(o.cleanupFailure)throw Error('cleanup');}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../services/nativeFileReader.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:name=>{if(name==='expo-file-system/legacy')return o.legacy||{};assert.equal(name,'expo-file-system');return {File:o.FileClass||File,Paths:{cache:'file:///scoped/'}};},Date,Math});return{calls,read:u=>module.exports.readNativeUpload(u,20*1024*1024)};}
test('reads original content URI without legacy inspection',async()=>{const h=setup({unknownSize:true});assert.equal(await h.read('content://provider/doc'),'YWJjZA==');assert.equal(h.calls.length,1);});
test('normalizes screenshot file URI',async()=>{const h=setup();await h.read('file:////data/cache/photo.png');assert.equal(h.calls[0][1],'file:///data/cache/photo.png');});
test('normalizes absolute path',async()=>{const h=setup();await h.read('//data/photo.png');assert.equal(h.calls[0][1],'file:///data/photo.png');});
test('modern copy reads scoped cache and cleans it',async()=>{const h=setup({failSource:true});assert.equal(await h.read('content://provider/doc'),'YWJjZA==');assert.deepEqual(h.calls.map(c=>c[0]),['read','copy','read','delete']);});
test('unreadable files hide Java details and clean failed copy',async()=>{for(const o of [{failAll:true},{failSource:true,copyFailure:true}]){const h=setup(o);await assert.rejects(h.read('file:///doc'),e=>/Download it/.test(e.message)&&!e.message.includes('java.io'));assert.ok(h.calls.some(c=>c[0]==='delete'));}});
test('rejects oversized source before reading',async()=>{const h=setup({large:true});await assert.rejects(h.read('file:///doc'),/20 MB/);assert.equal(h.calls.length,0);});
test('validates data when provider size is unknown',async()=>{await assert.rejects(setup({unknownSize:true,largeData:true}).read('content://provider/doc'),/20 MB/);});
test('empty files rejected',async()=>{await assert.rejects(setup({empty:true}).read('file:///doc'),/empty/);});
test('cleanup failure preserves valid data',async()=>{assert.equal(await setup({failSource:true,cleanupFailure:true}).read('content://provider/doc'),'YWJjZA==');});
test('rejects remote URI',async()=>{await assert.rejects(setup().read('https://example.com/file'),/Could not open/);});
// Older app binaries lack the newer File methods ("base64 is not a function"): fall back to the legacy reader.
test('falls back to legacy reader when File methods are missing', async () => {
  class Bare { constructor(...p) { this.uri = p.join(''); } get size() { return 4; } }
  const legacyCalls = [];
  const h = setup({ FileClass: Bare, legacy: { readAsStringAsync: async (uri, opts) => { legacyCalls.push([uri, opts.encoding]); return 'YWJjZA=='; } } });
  assert.equal(await h.read('content://provider/doc'), 'YWJjZA==');
  assert.deepEqual(legacyCalls, [['content://provider/doc', 'base64']]);
});
test('reads bytes() when base64 is unavailable', async () => {
  class BytesOnly { constructor(...p) { this.uri = p.join(''); } get size() { return 4; } async bytes() { return new Uint8Array([97, 98, 99, 100]); } }
  assert.equal(await setup({ FileClass: BytesOnly }).read('file:///doc'), 'YWJjZA==');
});
test('waits for an asynchronous copy before reading it', async () => {
  const order = [];
  class AsyncCopy { constructor(...p) { this.uri = p.join(''); } get size() { return 4; }
    async base64() { order.push(`read ${this.uri.startsWith('file:///scoped/') ? 'copy' : 'source'}`); if (!this.uri.startsWith('file:///scoped/')) throw Error('denied'); if (!order.includes('copied')) throw Error('not copied yet'); return 'YWJjZA=='; }
    async copy() { await new Promise((r) => setTimeout(r, 5)); order.push('copied'); }
    delete() {} }
  assert.equal(await setup({ FileClass: AsyncCopy }).read('content://provider/doc'), 'YWJjZA==');
  assert.deepEqual(order, ['read source', 'copied', 'read copy']);
});
