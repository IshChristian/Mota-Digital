const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const load = (file) => { const module = { exports: {} }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: module.exports, module }); return module.exports.default; };
const flat = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));
const en = Object.fromEntries(flat(load('i18n/en.ts')));

for (const lang of ['rw', 'fr', 'sw']) {
  const dict = Object.fromEntries(flat(load(`i18n/${lang}.ts`)));
  test(`${lang}: every English key is translated`, () => {
    assert.deepEqual(Object.keys(en).filter((k) => !dict[k]), []);
  });
  test(`${lang}: no keys English doesn't have`, () => {
    assert.deepEqual(Object.keys(dict).filter((k) => !(k in en)), []);
  });
  test(`${lang}: {{placeholders}} match English`, () => {
    for (const key of Object.keys(en)) {
      const want = (String(en[key]).match(/{{\w+}}/g) || []).sort().join();
      const got = (String(dict[key] || '').match(/{{\w+}}/g) || []).sort().join();
      assert.equal(got, want, `${lang} ${key}`);
    }
  });
}
