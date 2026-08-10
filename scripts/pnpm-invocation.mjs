import { basename } from "node:path";

const isWindows = process.platform === "win32";
const SAFE_ARG_PATTERN = /^[A-Za-z0-9@._/:=+-]+$/u;

/**
 * Resolves how to invoke the pnpm CLI from a script.
 *
 * Under `pnpm run`, npm_execpath points at the pnpm entry that launched the
 * script. On POSIX that is usually a JS file we can execute with the current
 * Node executable. On Windows it can be a native launcher (pnpm.exe) that is
 * extracted into a per-process temp directory; re-spawning that launcher from
 * a child process can deadlock, so fall back to the `pnpm` shim on PATH via
 * cmd.exe instead (same approach as ensure-native-deps.mjs).
 */
export function resolvePnpmInvocation(env = process.env) {
  const pnpmCliPath = env.npm_execpath;
  const userAgent = env.npm_config_user_agent ?? "";
  const launchedByPnpm =
    Boolean(pnpmCliPath) && (userAgent.startsWith("pnpm/") || basename(pnpmCliPath ?? "").startsWith("pnpm"));

  if (launchedByPnpm && pnpmCliPath && /\.(c|m)?js$/i.test(pnpmCliPath)) {
    return { command: process.execPath, baseArgs: [pnpmCliPath], joinArgs: false };
  }
  if (isWindows) {
    return { command: env.ComSpec ?? "cmd.exe", baseArgs: ["/d", "/s", "/c"], joinArgs: true };
  }
  if (launchedByPnpm && pnpmCliPath) {
    return { command: pnpmCliPath, baseArgs: [], joinArgs: false };
  }
  return { command: "pnpm", baseArgs: [], joinArgs: false };
}

/**
 * Builds the argv for spawn/spawnSync for the given pnpm arguments.
 * In joinArgs mode (cmd.exe) the arguments are joined into a single command
 * line; characters outside a conservative allow-list are rejected.
 */
export function buildPnpmSpawnArgs(invocation, args) {
  if (!invocation.joinArgs) return [...invocation.baseArgs, ...args];
  const commandLine = ["pnpm", ...args]
    .map((part) => {
      if (!SAFE_ARG_PATTERN.test(part)) {
        throw new Error(`Unsupported character in pnpm command argument: ${part}`);
      }
      return part;
    })
    .join(" ");
  return [...invocation.baseArgs, commandLine];
}
