const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path"),
  ts = require("typescript");
const data = {
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
function setup(options = {}) {
  const calls = [],
    module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../services/uploadAuthorization.ts"),
        "utf8",
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    {
      module,
      exports: module.exports,
      require: () => ({
        getStoredToken: async () =>
          options.signedOut ? null : "session-token",
      }),
      process: { env: { EXPO_PUBLIC_API_BASE_URL: "https://mota.test/api/" } },
      fetch: async (url, config) => {
        calls.push({ url, config });
        return new Response(options.body ?? JSON.stringify({ data }), {
          status: options.status || 200,
        });
      },
    },
  );
  return { calls, authorize: module.exports.getUploadAuthorization };
}
test("authenticated signature request works without mobile Cloudinary settings", async () => {
  const h = setup();
  const result = await h.authorize(new AbortController().signal);
  assert.equal(result.cloudName, "test");
  assert.equal(h.calls[0].url, "https://mota.test/api/uploads/signature");
  assert.equal(h.calls[0].config.headers.Authorization, "Bearer session-token");
  assert.equal(h.calls[0].config.method, "POST");
  assert.equal(result.api_secret, undefined);
});
test("signed-out users cannot request upload credentials", async () => {
  const h = setup({ signedOut: true });
  await assert.rejects(h.authorize(new AbortController().signal), /Sign in/);
  assert.equal(h.calls.length, 0);
});
for (const [status, body, expected] of [
  [503, '{"message":"Configure backend Cloudinary"}', /Configure backend/],
  [404, "{}", /Deploy the backend/],
  [401, '{"message":"Token expired"}', /Token expired/],
  [200, "html", /incomplete/],
  [
    200,
    JSON.stringify({ data: { ...data, signature: "invalid" } }),
    /incomplete/,
  ],
  [
    200,
    JSON.stringify({ data: { ...data, cloudName: "evil/path" } }),
    /incomplete/,
  ],
  [
    200,
    JSON.stringify({
      data: { ...data, params: { ...data.params, overwrite: true } },
    }),
    /incomplete/,
  ],
])
  test("rejects unusable authorization " + status + body, async () => {
    await assert.rejects(
      setup({ status, body }).authorize(new AbortController().signal),
      expected,
    );
  });
