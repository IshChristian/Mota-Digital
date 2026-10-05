const fs = require("node:fs");
const path = require("node:path");
function patchRouter(directory) {
  const file = path.join(directory, "build/fork/NavigationContainer.js");
  const original = fs.readFileSync(file, "utf8");
  const imports = 'const useThenable_1 = require("./useThenable");';
  const addedImport =
    'const { useMountedLinkingCallback } = require("./useMountedLinkingCallback");';
  const call = "    }, setLastUnhandledLink);";
  let updated = original;
  if (!original.includes(addedImport)) {
    if (
      !original.includes(imports) ||
      !original.includes(call) ||
      !original.includes("    const { getInitialState } =")
    ) {
      throw new Error(
        "Expo Router linking implementation changed. Review the lifecycle patch before upgrading.",
      );
    }
    updated = original
      .replace(imports, imports + "\n" + addedImport)
      .replace(
        "    const { getInitialState } =",
        "    const onUnhandledLinking = useMountedLinkingCallback(setLastUnhandledLink);\n    const { getInitialState } =",
      )
      .replace(call, "    }, onUnhandledLinking);");
  } else if (!original.includes("    }, onUnhandledLinking);")) {
    throw new Error("Incomplete Expo Router linking lifecycle patch.");
  }
  const patch = fs.readFileSync(
    path.join(__dirname, "../patches/expo-router-mounted-linking.patch"),
    "utf8",
  );
  const section = patch.split(
    "+++ b/build/fork/useMountedLinkingCallback.js\n",
  )[1];
  const helper =
    section
      .split("\n")
      .filter((line) => line.startsWith("+"))
      .map((line) => line.slice(1))
      .join("\n") + "\n";
  fs.writeFileSync(
    path.join(directory, "build/fork/useMountedLinkingCallback.js"),
    helper,
  );
  if (updated !== original) fs.writeFileSync(file, updated);
}
if (require.main === module) {
  patchRouter(path.dirname(require.resolve("expo-router/package.json")));
  console.log("Expo Router initial linking lifecycle patch applied.");
}
module.exports = { patchRouter };
