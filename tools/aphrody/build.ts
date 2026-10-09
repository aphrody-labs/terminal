// bun run build [Debug|Release] [x64|ARM64] : paquet Terminal (CascadiaPackage) via msbuild,
// même chemin qu'Invoke-OpenConsoleBuild (tools/OpenConsole.psm1) dans un environnement VsDevCmd.
import { join } from "node:path";
import { OUT, ensureDir, log, runLogged, vsDevEnv, vsInstance } from "./lib.ts";

const configuration = process.argv.find(a => /^(debug|release)$/i.test(a)) ?? "Release";
const platform = process.argv.find(a => /^(x64|arm64)$/i.test(a)) ?? "x64";
const branding = process.env.WT_BRANDING ?? "Dev";

const vs = await vsInstance();
if (!vs) throw new Error("Visual Studio introuvable : lancer `bun run setup`");
const env = await vsDevEnv(vs);
ensureDir(OUT);

const logFile = join(OUT, `build-${platform}-${configuration}.log`);
const args = [
  "msbuild.exe",
  "OpenConsole.slnx",
  `/p:Configuration=${configuration}`,
  `/p:Platform=${platform}`,
  `/p:WindowsTerminalBranding=${branding}`,
  "/p:AppxSymbolPackageEnabled=false",
  "/p:AppxBundle=Never",
  "/t:Terminal\\CascadiaPackage",
  "/m",
  "/nr:false",
  "/nologo",
  "/v:minimal",
  `/bl:${join(OUT, `build-${platform}-${configuration}.binlog`)}`,
];

log("build", `${configuration}|${platform} branding=${branding}, journal ${logFile}`);
const started = performance.now();
const code = await runLogged(args, { env, logFile });
const minutes = ((performance.now() - started) / 60000).toFixed(1);
await Bun.write(
  join(OUT, "last-build.json"),
  JSON.stringify(
    { configuration, platform, branding, code, minutes: Number(minutes), at: new Date().toISOString() },
    null,
    2,
  ),
);
if (code !== 0) {
  log("build", `échec (code ${code}) après ${minutes} min, voir ${logFile}`);
  process.exit(code);
}
log("build", `OK en ${minutes} min`);
