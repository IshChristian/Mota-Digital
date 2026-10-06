const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path"),
  ts = require("typescript");
function setup(options = {}) {
  const calls = [],
    module = { exports: {} };
  const legacy = {
    cacheDirectory: "file:///cache/",
    EncodingType: { Base64: "base64" },
    getInfoAsync: async (uri) => ({
      exists: !options.missing,
      isDirectory: false,
      size: options.large ? 21 * 1024 * 1024 : 4,
    }),
    copyAsync: async (value) => {
      calls.push(["copy", value]);
      if (options.copyFailure) throw Error("permission denied");
    },
    readAsStringAsync: async (uri) => {
      calls.push(["legacy", uri]);
      if (options.legacyFailure)
        throw Error("java.io.IOException: Location /private/path");
      return "YWJjZA==";
    },
    deleteAsync: async (uri) => calls.push(["cleanup", uri]),
  };
  class File {
    constructor(uri) {
      this.uri = uri;
    }
    get size() {
      return 4;
    }
    async base64() {
      calls.push(["modern", this.uri]);
      if (
        options.allModernFail ||
        (options.originalModernFail && !this.uri.startsWith("file:///cache/"))
      )
        throw Error("cannot open location");
      return "YWJjZA==";
    }
  }
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../services/nativeFileReader.ts"),
        "utf8",
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    {
      module,
      exports: module.exports,
      require: (name) => (name === "expo-file-system" ? { File } : legacy),
      Date,
      Math,
    },
  );
  return {
    calls,
    read: (uri) => module.exports.readNativeUpload(uri, 20 * 1024 * 1024),
  };
}
test("modern reader avoids legacy readAsStringAsync failure", async () => {
  const h = setup({ legacyFailure: true });
  assert.equal(await h.read("file:///document.pdf"), "YWJjZA==");
  assert.equal(
    h.calls.some((c) => c[0] === "legacy"),
    false,
  );
});
test("failed original read retries a new app-owned copy", async () => {
  const h = setup({ originalModernFail: true, legacyFailure: true });
  assert.equal(await h.read("file:///external/document.pdf"), "YWJjZA==");
  assert.equal(h.calls.filter((c) => c[0] === "modern").length, 2);
  assert.ok(h.calls.some((c) => c[0] === "cleanup"));
  assert.equal(
    h.calls.some((c) => c[0] === "legacy"),
    false,
  );
});
test("content URI is cached before modern read and cleaned after success", async () => {
  const h = setup();
  await h.read("content://provider/document");
  assert.equal(h.calls[0][0], "copy");
  assert.match(
    h.calls.find((c) => c[0] === "modern")[1],
    /^file:\/\/\/cache\//,
  );
  assert.ok(h.calls.some((c) => c[0] === "cleanup"));
});
test("raw absolute paths are normalized to a file URI", async () => {
  const h = setup();
  await h.read("/data/cache/photo.jpg");
  assert.equal(h.calls[0][1], "file:///data/cache/photo.jpg");
});
test("legacy fallback still supports older native reader implementations", async () => {
  const h = setup({ allModernFail: true });
  assert.equal(await h.read("file:///doc"), "YWJjZA==");
  assert.ok(h.calls.some((c) => c[0] === "legacy"));
});
test("all readers failing returns actionable text without Java path leakage", async () => {
  const h = setup({ allModernFail: true, legacyFailure: true });
  await assert.rejects(
    h.read("file:///doc"),
    (error) =>
      /Download a local copy/.test(error.message) &&
      !error.message.includes("java.io"),
  );
  assert.ok(h.calls.some((c) => c[0] === "cleanup"));
});
test("copy failure is clear and temporary files are cleaned", async () => {
  const h = setup({ copyFailure: true });
  await assert.rejects(
    h.read("content://denied"),
    /Download it to your device/,
  );
  assert.ok(h.calls.some((c) => c[0] === "cleanup"));
});
for (const [options, expected] of [
  [{ missing: true }, /unavailable/],
  [{ large: true }, /20 MB/],
])
  test(
    "invalid source is rejected before reading " + JSON.stringify(options),
    async () => {
      const h = setup(options);
      await assert.rejects(h.read("file:///doc"), expected);
      assert.equal(
        h.calls.some((c) => c[0] === "modern" || c[0] === "legacy"),
        false,
      );
    },
  );

test("screenshot four-slash DocumentPicker URI is normalized before reading", async () => {
  const h = setup();
  await h.read(
    "file:////data/user/0/host.exp.exponent/cache/DocumentPicker/selected.jpg",
  );
  assert.equal(
    h.calls.find((c) => c[0] === "modern")[1],
    "file:///data/user/0/host.exp.exponent/cache/DocumentPicker/selected.jpg",
  );
});
test("repeated leading slashes in absolute paths are normalized", async () => {
  const h = setup();
  await h.read("//data/cache/photo.jpg");
  assert.equal(h.calls[0][1], "file:///data/cache/photo.jpg");
});
