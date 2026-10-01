const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies, globals = {}) {
  const filename = path.join(__dirname, '..', file);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { module, exports: module.exports, require: name => dependencies[name], AbortController, setTimeout, clearTimeout, fetch, FormData, ...globals }, { filename });
  return module.exports;
}
function uploader(options = {}) {
  const calls = [];
  const api = load('services/fileUpload.ts', {
    'react-native': { Platform: { OS: options.platform || 'ios' } },
    'expo-file-system/legacy': {
      cacheDirectory:'file:///cache/', FileSystemUploadType:{MULTIPART:1},
      copyAsync:async args=>{calls.push(['copy',args]);if(options.readError)throw Error('denied');},
      getInfoAsync:async()=>({exists:true,isDirectory:false,size:options.size ?? 12}),
      deleteAsync:async(uri)=>{calls.push(['delete',uri]);},
      createUploadTask:(url,uri,config)=>{calls.push(['upload',url,uri,config]);return {uploadAsync:async()=>options.result ?? {status:201,body:JSON.stringify({data:{url:'https://res.cloudinary.com/test/image/upload/id.png'}})},cancelAsync:async()=>{}};},
    },
    './secureStorage':{getStoredToken:async()=>options.noToken?null:'test-token'},
  });return {upload:api.uploadFile,calls};
}
for(const platform of ['ios','android'])test(platform+' uses the native multipart task with cached filename, MIME and auth',async()=>{
  const {upload,calls}=uploader({platform});const result=await upload('https://test/uploads','file','content://picked','National ID.png','image/png');
  assert.match(result.data.url,/^https:/);const [,url,uri,config]=calls.find(c=>c[0]==='upload');
  assert.equal(url,'https://test/uploads');assert.match(uri,/National_ID.png$/);assert.equal(config.fieldName,'file');assert.equal(config.mimeType,'image/png');assert.equal(config.uploadType,1);assert.equal(config.headers.Authorization,'Bearer test-token');assert.equal(config.headers['Content-Type'],undefined);assert.equal(calls.at(-1)[0],'delete');
});
test('avatar uses its own field and HEIC type',async()=>{const {upload,calls}=uploader();await upload('url','avatar','file:///photo.heic');assert.equal(calls[1][3].fieldName,'avatar');assert.equal(calls[1][3].mimeType,'image/heic');});
test('requires authentication before reading a file',async()=>{const {upload,calls}=uploader({noToken:true});await assert.rejects(upload('url','file','uri'),/Sign in/);assert.equal(calls.length,0);});
test('read failure is actionable and cleans temporary file',async()=>{const {upload,calls}=uploader({readError:true});await assert.rejects(upload('url','file','uri'),/Could not read/);assert.equal(calls.at(-1)[0],'delete');});
for(const size of [0,21*1024*1024])test('rejects invalid size '+size+' before native upload',async()=>{const {upload,calls}=uploader({size});await assert.rejects(upload('url','file','uri'),/empty|20 MB/);assert.ok(!calls.some(c=>c[0]==='upload'));});
for(const [status,body,expected] of [[401,'{}',/expired/],[502,'{"message":"Cloudinary upload failed"}',/Cloudinary/],[201,'html',/invalid response/]])test('handles response status '+status+' with '+body,async()=>{const {upload,calls}=uploader({result:{status,body}});await assert.rejects(upload('url','file','uri'),expected);assert.equal(calls.at(-1)[0],'delete');});
test('document upload requires secure URL',async()=>{const api=load('services/cloudinary.ts',{'./api':{API_BASE_URL:'url'},'./fileUpload':{uploadFile:async()=>({data:{url:'http://bad'}})}});await assert.rejects(api.uploadToCloudinary('uri'),/secure file link/);});
