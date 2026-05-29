import { spawn } from "node:child_process";

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Run a one-shot command and capture its output. Used for short tasks like
 * typecheck, lint, dependency installs, etc.
 */
export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = 180_000
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: stderr + String(err), timedOut });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

/**
 * Manages a single long-running dev server (Metro / Expo) as a background
 * child process, keeping a rolling buffer of its log output so the agent can
 * read it back later for debugging.
 */
class DevServer {
  private child: ReturnType<typeof spawn> | null = null;
  private logs: string[] = [];
  private readonly maxLines = 2000;
  private startedAt: number | null = null;
  private commandLine = "";

  get running(): boolean {
    return this.child !== null && this.child.exitCode === null;
  }

  status() {
    return {
      running: this.running,
      pid: this.child?.pid ?? null,
      command: this.commandLine,
      startedAt: this.startedAt,
      uptimeSeconds: this.startedAt
        ? Math.round((Date.now() - this.startedAt) / 1000)
        : null,
      logLines: this.logs.length,
    };
  }

  private append(chunk: string) {
    for (const line of chunk.split(/\r?\n/)) {
      if (line.length === 0) continue;
      this.logs.push(`[${new Date().toISOString()}] ${line}`);
    }
    if (this.logs.length > this.maxLines) {
      this.logs.splice(0, this.logs.length - this.maxLines);
    }
  }

  start(command: string, args: string[], cwd: string): string {
    if (this.running) {
      return "A dev server is already running. Stop it first if you want to restart.";
    }
    this.logs = [];
    this.commandLine = [command, ...args].join(" ");
    this.startedAt = Date.now();

    this.child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      env: { ...process.env, FORCE_COLOR: "0", CI: "0" },
    });

    this.child.stdout?.on("data", (d) => this.append(d.toString()));
    this.child.stderr?.on("data", (d) => this.append(d.toString()));
    this.child.on("close", (code) => {
      this.append(`*** dev server exited with code ${code} ***`);
      this.child = null;
      this.startedAt = null;
    });

    return `Started dev server (pid ${this.child.pid}): ${this.commandLine}`;
  }

  stop(): string {
    if (!this.running || !this.child) {
      return "No dev server is currently running.";
    }
    const pid = this.child.pid;
    this.child.kill("SIGTERM");
    this.child = null;
    this.startedAt = null;
    return `Sent stop signal to dev server (pid ${pid}).`;
  }

  getLogs(lines: number): string {
    if (this.logs.length === 0) {
      return this.running
        ? "Dev server is running but has produced no log output yet."
        : "No dev server has been started in this session.";
    }
    return this.logs.slice(-lines).join("\n");
  }
}

export const devServer = new DevServer();
