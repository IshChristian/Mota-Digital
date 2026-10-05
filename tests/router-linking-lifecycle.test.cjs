const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
function lifecycle() {
  const patch = fs.readFileSync(
    path.join(__dirname, "../patches/expo-router-mounted-linking.patch"),
    "utf8",
  );
  const source = patch
    .split("+++ b/build/fork/useMountedLinkingCallback.js\n")[1]
    .split("\n")
    .filter((l) => l.startsWith("+"))
    .map((l) => l.slice(1))
    .join("\n");
  const effects = [],
    updates = [];
  const React = {
    useRef: (current) => ({ current }),
    useCallback: (fn) => fn,
    useEffect: (fn) => effects.push(fn),
  };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    require: () => React,
    module,
    exports: module.exports,
  });
  const callback = module.exports.useMountedLinkingCallback((value) =>
    updates.push(value),
  );
  let cleanups = [];
  return {
    callback,
    updates,
    mount() {
      cleanups = effects.map((fn) => fn());
    },
    unmount() {
      cleanups.forEach((fn) => fn?.());
    },
  };
}
test("async initial URL waits for mount", async () => {
  const h = lifecycle();
  await Promise.resolve("/driver").then(h.callback);
  assert.deepEqual(h.updates, []);
  h.mount();
  assert.deepEqual(h.updates, ["/driver"]);
});
test("synchronous URL waits for mount", () => {
  const h = lifecycle();
  h.callback("/welcome");
  assert.deepEqual(h.updates, []);
  h.mount();
  assert.deepEqual(h.updates, ["/welcome"]);
});
test("live links dispatch while mounted", () => {
  const h = lifecycle();
  h.mount();
  h.callback("/ride/1");
  assert.deepEqual(h.updates, ["/ride/1"]);
});
test("abandoned render never dispatches", async () => {
  const h = lifecycle();
  await Promise.resolve("/welcome").then(h.callback);
  assert.deepEqual(h.updates, []);
});
test("late result after unmount does not update state", async () => {
  const h = lifecycle();
  h.mount();
  h.unmount();
  await Promise.resolve("/ride/1").then(h.callback);
  assert.deepEqual(h.updates, []);
});
test("Strict Mode replay flushes a pending link only once", () => {
  const h = lifecycle();
  h.callback("/welcome");
  h.mount();
  h.unmount();
  h.mount();
  assert.deepEqual(h.updates, ["/welcome"]);
});
test("undefined path is preserved", () => {
  const h = lifecycle();
  h.callback(undefined);
  h.mount();
  assert.deepEqual(h.updates, [undefined]);
});
const { patchRouter } = require("../scripts/patch-router-linking.cjs");
test("install patch is idempotent and rejects an incompatible router layout", () => {
  const directory = fs.mkdtempSync(path.join(__dirname, "mota-router-"));
  try {
    const folder = path.join(directory, "build/fork");
    fs.mkdirSync(folder, { recursive: true });
    const file = path.join(folder, "NavigationContainer.js");
    fs.writeFileSync(
      file,
      'const useThenable_1 = require("./useThenable");\n    const { getInitialState } = useLinking(ref, {\n    }, setLastUnhandledLink);\n',
    );
    patchRouter(directory);
    const once = fs.readFileSync(file, "utf8");
    patchRouter(directory);
    assert.equal(fs.readFileSync(file, "utf8"), once);
    assert.match(once, /onUnhandledLinking = useMountedLinkingCallback/);
    assert.ok(fs.existsSync(path.join(folder, "useMountedLinkingCallback.js")));
    fs.writeFileSync(file, "changed upstream layout");
    assert.throws(() => patchRouter(directory), /implementation changed/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
