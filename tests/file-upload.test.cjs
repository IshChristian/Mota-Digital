const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
const bytes = Buffer.from([0, 255, 128, 42, 0, 255, 1]),
  encoded = bytes.toString("base64");
function load(file, dependencies, globals = {}) {
  const filename = path.join(__dirname, "..", file),
    module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (name) => dependencies[name],
      URLSearchParams,
      AbortController,
      setTimeout,
      clearTimeout,
      Uint8Array,
      process: {
        env: {},
      },
      FormData: class {
        constructor() {
          throw Error("Unsupported FormDataPart implementation");
        }
      },
      ...globals,
    },
  );
  return module.exports;
}
function uploader(options = {}) {
  const calls = [],
    native = {
      cacheDirectory: "file:///cache/",
      EncodingType: { Base64: "base64" },
      getInfoAsync: async (uri) => {
        calls.push(["info", uri]);
        return {
          exists: !options.missing,
          isDirectory: false,
          size: options.empty
            ? 0
            : options.large
              ? 21 * 1024 * 1024
              : bytes.length,
        };
      },
      copyAsync: async (value) => {
        calls.push(["copy", value]);
        if (options.copyError) throw Error("denied");
      },
      readAsStringAsync: async (uri) => {
        calls.push(["read", uri]);
        return encoded;
      },
      deleteAsync: async (uri) => calls.push(["delete", uri]),
    };
  const fetch = async (url, config) => {
    if (url === "source") return new Response(bytes);
    calls.push(["request", url, config]);
    return new Response(
      options.body ||
        '{"secure_url":"https://res.cloudinary.com/test/raw/upload/id.pdf","public_id":"id","resource_type":"raw"}',
      { status: options.status || 201 },
    );
  };
  return {
    calls,
    upload: load(
      "services/fileUpload.ts",
      {
        "react-native": { Platform: { OS: options.platform || "ios" } },
        "./nativeFileReader": {
          readNativeUpload: load("services/nativeFileReader.ts", {
            "expo-file-system/legacy": native,
            "expo-file-system": {
              File: class {
                constructor(uri) {
                  this.uri = uri;
                }
                get size() {
                  return bytes.length;
                }
                async base64() {
                  return native.readAsStringAsync(this.uri);
                }
              },
            },
          }).readNativeUpload,
        },
        "./uploadAuthorization": {
          getUploadAuthorization: async () => {
            if (options.authorizationError)
              throw Error(options.authorizationError);
            return {
              cloudName: "test",
              apiKey: "public-key",
              signature: "a".repeat(40),
              params: {
                timestamp: 123,
                folder: "mota_uploads/user",
                public_id: "file-id",
                overwrite: false,
              },
            };
          },
        },
      },
      { fetch },
    ).uploadFile,
  };
}
for (const platform of ["ios", "android", "web"])
  test(platform + " sends exact bytes without multipart/FormData", async () => {
    const { upload, calls } = uploader({ platform });
    const result = await upload(
      "ignored",
      "file",
      platform === "web" ? "source" : "file:///document.pdf",
      "document.pdf",
      "application/pdf",
    );
    assert.match(result.data.url, /^https:\/\/res.cloudinary.com/);
    const [, url, config] = calls.find((c) => c[0] === "request");
    assert.equal(url, "https://api.cloudinary.com/v1_1/test/auto/upload");
    assert.equal(
      config.headers["Content-Type"],
      "application/x-www-form-urlencoded",
    );
    const body = new URLSearchParams(config.body);
    assert.equal(body.get("upload_preset"), null);
    assert.equal(body.get("api_key"), "public-key");
    assert.equal(body.get("signature"), "a".repeat(40));
    assert.equal(body.get("timestamp"), "123");
    assert.equal(body.get("folder"), "mota_uploads/user");
    assert.equal(body.get("overwrite"), "false");
    assert.equal(body.get("file"), "data:application/pdf;base64," + encoded);
    assert.deepEqual(
      Buffer.from(body.get("file").split(",")[1], "base64"),
      bytes,
    );
    assert.equal(config.headers.Authorization, undefined);
  });
test("content URI is copied and cleaned", async () => {
  const { upload, calls } = uploader();
  await upload(
    "ignored",
    "file",
    "content://document",
    "document.pdf",
    "application/pdf",
  );
  assert.equal(
    calls.find((c) => c[0] === "copy")[1].from,
    "content://document",
  );
  assert.match(calls.find((c) => c[0] === "read")[1], /^file:\/\/\/cache\//);
  assert.ok(calls.some((c) => c[0] === "delete"));
});
test("picker base64 recovers unreadable image URI", async () => {
  const { upload, calls } = uploader({ missing: true });
  await upload(
    "ignored",
    "file",
    "file:///missing",
    "photo.heic",
    "image/heic",
    Buffer.from([255, 216, 255, 0]).toString("base64"),
  );
  assert.equal(
    calls.some((c) => c[0] === "read" || c[0] === "info"),
    false,
  );
  assert.match(
    new URLSearchParams(calls.find((c) => c[0] === "request")[2].body).get(
      "file",
    ),
    /^data:image\/jpeg;base64,/,
  );
});
test("non-image base64 preserves document MIME", async () => {
  const { upload, calls } = uploader();
  await upload(
    "ignored",
    "file",
    "file:///doc",
    "doc.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    encoded,
  );
  assert.match(
    new URLSearchParams(calls.find((c) => c[0] === "request")[2].body).get(
      "file",
    ),
    /^data:application\/vnd.openxmlformats/,
  );
});
test("copy failure cleans cache and never sends upload", async () => {
  const { upload, calls } = uploader({ copyError: true });
  await assert.rejects(
    upload("ignored", "file", "content://bad"),
    /Could not read/,
  );
  assert.equal(
    calls.some((c) => c[0] === "request"),
    false,
  );
  assert.equal(calls.at(-1)[0], "delete");
});
for (const [option, expected] of [
  ["empty", /empty/],
  ["missing", /unavailable/],
  ["large", /20 MB/],
])
  test("rejects " + option + " native file", async () => {
    await assert.rejects(
      uploader({ [option]: true }).upload("ignored", "file", "file:///doc"),
      expected,
    );
  });
for (const [status, body, expected] of [
  [401, "{}", /signed upload/],
  [413, "{}", /20 MB/],
  [400, '{"error":{"message":"Upload preset not found"}}', /preset not found/],
  [502, '{"message":"Cloudinary upload failed"}', /Cloudinary/],
  [201, "html", /invalid response/],
  [201, '{"secure_url":"http://bad","public_id":"id"}', /secure file link/],
  [
    201,
    '{"secure_url":"https://res.cloudinary.com/test/file"}',
    /secure file link/,
  ],
])
  test("handles provider response " + status + " " + body, async () => {
    await assert.rejects(
      uploader({ status, body }).upload("ignored", "file", "file:///doc"),
      expected,
    );
  });
test("signature authorization errors stop the Cloudinary request", async () => {
  const { upload, calls } = uploader({
    authorizationError: "Upload storage is not configured on the MOTA server",
  });
  await assert.rejects(upload("ignored", "file", "file:///doc"), /MOTA server/);
  assert.equal(
    calls.some((call) => call[0] === "request"),
    false,
  );
});
test("invalid base64 rejected", async () => {
  await assert.rejects(
    uploader().upload(
      "ignored",
      "file",
      "file:///doc",
      "doc.pdf",
      "application/pdf",
      "bad!",
    ),
    /invalid/,
  );
});
test("Cloudinary wrapper requires a secure URL", async () => {
  const api = load("services/cloudinary.ts", {
    "./api": { API_BASE_URL: "url" },
    "./fileUpload": {
      uploadFile: async () => ({ data: { url: "http://bad" } }),
    },
  });
  await assert.rejects(api.uploadToCloudinary("uri"), /secure file link/);
});

test("PNG base64 remains PNG rather than being labelled JPEG", async () => {
  const { upload, calls } = uploader();
  await upload(
    "ignored",
    "file",
    "file:///photo",
    "photo.png",
    "image/png",
    "iVBORw0KGgo=",
  );
  assert.match(
    new URLSearchParams(calls.find((c) => c[0] === "request")[2].body).get(
      "file",
    ),
    /^data:image\/png;base64,/,
  );
});
test("unknown picker MIME uses the document extension, unknown formats use binary MIME", async () => {
  for (const [name, mime] of [
    [
      "report.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ["archive.zip", "application/zip"],
    ["custom.xyz", "application/octet-stream"],
  ]) {
    const { upload, calls } = uploader();
    await upload(
      "ignored",
      "file",
      "file:///document",
      name,
      "application/octet-stream",
    );
    assert.equal(
      new URLSearchParams(calls.find((c) => c[0] === "request")[2].body).get(
        "file",
      ),
      "data:" + mime + ";base64," + encoded,
    );
  }
});
