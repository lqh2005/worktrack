import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Normalize Windows drive letter casing (c:\ -> C:\)
const realCwd = fs.realpathSync.native(process.cwd());
process.chdir(realCwd);

const args = process.argv.slice(2);

// Close old dev server processes on ports 3000-3002 before starting
if (args[0] === "dev" && process.platform === "win32") {
  try {
    const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      if (/:300[012]\s/.test(line)) {
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (pid && pid !== process.pid) {
          pids.add(pid);
        }
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      } catch {
        // Ignore if already exited
      }
    }
  } catch {
    // Ignore netstat errors
  }
}

const nextBin = path.join(realCwd, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: realCwd,
  stdio: "inherit",
  env: {
    ...process.env,
    PWD: realCwd,
    INIT_CWD: realCwd,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
