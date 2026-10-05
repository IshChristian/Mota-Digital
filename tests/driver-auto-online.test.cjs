const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
const moduleStub = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../services/driverAutoOnline.ts"),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { module: moduleStub, exports: moduleStub.exports },
);
const factory = moduleStub.exports.createDriverAutoOnline;
const driver = {
  role: "driver",
  kycLevel: "full",
  isActive: true,
  isVerified: true,
  registrationPaid: true,
};
test("full KYC driver goes online once; refresh preserves manual offline", async () => {
  let calls = 0;
  const service = factory(),
    go = async () => {
      calls++;
      return { data: { isOnline: true } };
    };
  assert.equal(
    await service.run(driver, "token", async () => "token", go),
    true,
  );
  assert.equal(
    await service.run(
      { ...driver, availabilityManuallyOffline: true },
      "token",
      async () => "token",
      go,
    ),
    undefined,
  );
  assert.equal(calls, 1);
  service.reset();
  assert.equal(
    await service.run(driver, "token", async () => "token", go),
    true,
  );
  assert.equal(calls, 2);
});
test("concurrent account refresh coalesces the online request", async () => {
  let resolve,
    calls = 0;
  const service = factory(),
    go = () => {
      calls++;
      return new Promise((r) => (resolve = r));
    },
    a = service.run(driver, "token", async () => "token", go),
    b = service.run(driver, "token", async () => "token", go);
  await new Promise(setImmediate);
  resolve({ data: { isOnline: true } });
  assert.deepEqual(await Promise.all([a, b]), [true, true]);
  assert.equal(calls, 1);
});
for (const account of [
  { ...driver, role: "passenger" },
  { ...driver, kycLevel: "basic" },
  { ...driver, isActive: false },
  { ...driver, isVerified: false },
  { ...driver, registrationPaid: false },
])
  test(
    "ineligible account is not sent online " + JSON.stringify(account),
    async () => {
      let calls = 0;
      assert.equal(
        await factory().run(
          account,
          "token",
          async () => "token",
          async () => {
            calls++;
            return { data: { isOnline: true } };
          },
        ),
        undefined,
      );
      assert.equal(calls, 0);
    },
  );
test("completion of KYC later in the same session triggers online", async () => {
  let calls = 0;
  const service = factory(),
    go = async () => {
      calls++;
      return { data: { isOnline: true } };
    };
  await service.run(
    { ...driver, kycLevel: "basic" },
    "token",
    async () => "token",
    go,
  );
  await service.run(driver, "token", async () => "token", go);
  assert.equal(calls, 1);
});
test("stale session cannot send availability", async () => {
  let calls = 0;
  await factory().run(
    driver,
    "old",
    async () => "new",
    async () => {
      calls++;
      return { data: { isOnline: true } };
    },
  );
  assert.equal(calls, 0);
});
test("late result for an old session is ignored", async () => {
  let reads = 0;
  assert.equal(
    await factory().run(
      driver,
      "old",
      async () => (++reads === 1 ? "old" : "new"),
      async () => ({ data: { isOnline: true } }),
    ),
    undefined,
  );
});
test("failed online request can retry on the next account refresh", async () => {
  const service = factory();
  let calls = 0;
  const go = async () => {
    calls++;
    throw Error("Document expired");
  };
  await assert.rejects(
    service.run(driver, "token", async () => "token", go),
    /Document expired/,
  );
  await assert.rejects(
    service.run(driver, "token", async () => "token", go),
    /Document expired/,
  );
  assert.equal(calls, 2);
});
test("success is accepted only when backend confirms online", async () => {
  await assert.rejects(
    factory().run(
      driver,
      "token",
      async () => "token",
      async () => ({ data: { isOnline: false } }),
    ),
    /did not confirm/,
  );
});
test("restored manually-offline session stays offline", async () => {
  let calls = 0;
  await factory().run(
    { ...driver, availabilityManuallyOffline: true },
    "token",
    async () => "token",
    async () => {
      calls++;
      return { data: { isOnline: true } };
    },
  );
  assert.equal(calls, 0);
});
test("already-online account does not send another availability request", async () => {
  let calls = 0;
  await factory().run(
    { ...driver, isOnline: true },
    "token",
    async () => "token",
    async () => {
      calls++;
      return { data: { isOnline: true } };
    },
  );
  assert.equal(calls, 0);
});
