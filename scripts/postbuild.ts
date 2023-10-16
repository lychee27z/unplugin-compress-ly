import { basename, resolve } from "path";
import { promises as fs } from "fs";
import fg from "fast-glob";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const files = await fg("*.cjs", {
    ignore: ["index.cjs", "chunk-*"],
    absolute: true,
    cwd: resolve(__dirname, "../dist"),
  });
  for (const file of files) {
    console.log("[postbuild]", basename(file));
    let code = await fs.readFile(file, "utf8");
    code = code.replace("exports.default =", "module.exports =");
    // code += "exports.default = module.exports;";
    await fs.writeFile(file, code);
  }
}

run();
