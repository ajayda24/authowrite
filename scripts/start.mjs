// Starts the standalone production server (output: "standalone"), copying the
// static assets it needs next to it first. Used by `pnpm start` locally; the
// Docker image copies these files at build time instead.
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

const standalone = ".next/standalone";
if (!existsSync(`${standalone}/server.js`)) {
  console.error("No production build found. Run `pnpm build` first.");
  process.exit(1);
}
cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${standalone}/public`, { recursive: true });

const child = spawn(process.execPath, ["--env-file-if-exists=.env", "server.js"], {
  cwd: standalone,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT ?? "3000",
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
    STORAGE_LOCAL_DIR:
      process.env.STORAGE_LOCAL_DIR ?? new URL("../storage", import.meta.url).pathname,
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
