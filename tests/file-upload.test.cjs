const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const fixture = Uint8Array.from([137,80,78,71,13,10,26,10,0,255,128,1]);
function load(file, dependencies, globals = {}) {
  const filename = path.join(__dirname, '..', file);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { module, exports: module.exports, require: name => { if (name in dependencies) return dependencies[name]; throw Error('Unexpected import: ' + name); }, TextEncoder, Uint8Array, AbortController, setTimeout, clearTimeout, fetch, ...globals }, { filename });
  return module.exports;
}
const multipart = load('utils/multipart.ts', {});
function uploader(options = {}) {
  return load('services/fileUpload.ts', {
    'react-native': { Platform: { OS: options.platform || 'ios' } },
    'expo-file-system': { File: class { async bytes() { if (options.readError) throw Error('Access denied'); return options.bytes || fixture; } } },
    'expo/fetch': { fetch: options.fetch || fetch },
    './secureStorage': { getStoredToken: async () => options.noToken ? null : 'test-token' },
    '../utils/multipart': multipart,
  }).uploadFile;
}
test('native uploads round-trip file bytes, metadata and authorization through an HTTP multipart parser', async () => {
  const received = [];
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': req.headers['content-type'] } }).formData();
      const field = req.url === '/avatar' ? 'avatar' : 'file';
      const file = form.get(field);
      received.push({ field, name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()), auth: req.headers.authorization });
      res.writeHead(201, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ data: { url: 'https://res.cloudinary.com/test/image/upload/document.png' } }));
    } catch(e) { res.writeHead(400);res.end(e.message); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    for (const platform of ['ios', 'android']) {
      const output = await uploader({ platform })(base + '/documents', 'file', 'file:///cache/no-extension', 'National ID.png', 'image/png');
      assert.match(output.data.url, /^https:/);
    }
    await uploader()(base + '/avatar', 'avatar', 'file:///cache/photo.heic', 'photo.heic', 'image/heic');
    await uploader()(base + '/documents', 'file', 'file:///cache/document.pdf', 'permit.pdf', 'application/pdf');
    assert.equal(received.length, 4);
    assert.equal(received[0].name, 'National ID.png'); assert.equal(received[0].type, 'image/png');
    assert.equal(received[2].field, 'avatar'); assert.equal(received[2].type, 'image/heic');
    assert.equal(received[3].type, 'application/pdf');
    for(const item of received) { assert.deepEqual(Array.from(item.bytes), Array.from(fixture)); assert.equal(item.auth, 'Bearer test-token'); }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('missing authentication fails before upload', async () => { await assert.rejects(uploader({ noToken: true })('unused','file','uri'), /Sign in/); });
test('unreadable file reports a selection error', async () => { await assert.rejects(uploader({ readError: true })('unused','file','uri'), /Could not read/); });
test('empty file is rejected', async () => { await assert.rejects(uploader({ bytes: new Uint8Array() })('unused','file','uri'), /empty/); });
test('backend error message reaches the caller', async () => { await assert.rejects(uploader({ fetch: async () => new Response(JSON.stringify({message:'Upload storage unavailable'}), {status:503}) })('unused','file','uri'), /storage unavailable/); });
test('an HTML error response is not reported as upload success', async () => { await assert.rejects(uploader({ fetch: async () => new Response('<html>error</html>', {status:502}) })('unused','file','uri'), /502/); });
test('malformed successful server response is rejected', async () => { await assert.rejects(uploader({ fetch: async () => new Response('not json', {status:201}) })('unused','file','uri'), /invalid response/); });
test('secure Cloudinary URL is required after successful upload', async () => {
  const module = load('services/cloudinary.ts', { './api': { API_BASE_URL:'http://test/api' }, './fileUpload': { uploadFile: async () => ({ data:{url:'http://insecure/photo.png'} }) } });
  await assert.rejects(module.uploadToCloudinary('uri'), /secure file link/);
});
