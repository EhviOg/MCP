import { promises as fs } from "node:fs";
import path from "node:path";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  ".expo-shared",
  "ios",
  "android",
  "dist",
  "build",
  ".next",
  "coverage",
]);

/**
 * Resolve the React Native project root. Priority:
 *   1. explicit override passed by a tool call
 *   2. RN_PROJECT_ROOT env var (set in .mcp.json)
 *   3. the process working directory
 */
export function resolveProjectRoot(override?: string): string {
  const root = override?.trim() || process.env.RN_PROJECT_ROOT?.trim() || process.cwd();
  return path.resolve(root);
}

export async function readJson(file: string): Promise<any | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Where do route/screen files live? Expo Router supports both `app/` and `src/app/`. */
export async function findRouterDir(root: string): Promise<string | null> {
  for (const candidate of [path.join(root, "src", "app"), path.join(root, "app")]) {
    if (await pathExists(candidate)) return candidate;
  }
  return null;
}

/** Where should generated components go? Prefer an existing components dir. */
export async function findComponentsDir(root: string): Promise<string> {
  for (const candidate of [
    path.join(root, "src", "components"),
    path.join(root, "components"),
  ]) {
    if (await pathExists(candidate)) return candidate;
  }
  // default
  return path.join(root, "components");
}

export interface ProjectInfo {
  root: string;
  isReactNative: boolean;
  isExpo: boolean;
  expoRouter: boolean;
  name?: string;
  version?: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  routerDir: string | null;
  notes: string[];
}

export async function getProjectInfo(root: string): Promise<ProjectInfo> {
  const pkg = await readJson(path.join(root, "package.json"));
  const notes: string[] = [];

  const deps: Record<string, string> = pkg?.dependencies ?? {};
  const devDeps: Record<string, string> = pkg?.devDependencies ?? {};

  const isReactNative = Boolean(deps["react-native"] || deps["expo"]);
  const isExpo = Boolean(deps["expo"]);
  const expoRouter = Boolean(deps["expo-router"]);

  if (!pkg) notes.push(`No package.json found at ${root}.`);
  if (!isReactNative) {
    notes.push(
      "This directory does not look like a React Native / Expo project (no react-native or expo dependency)."
    );
  }
  if (await pathExists(path.join(root, "app.config.js")) ||
      await pathExists(path.join(root, "app.config.ts"))) {
    notes.push("Project uses a dynamic app.config.(js|ts); app.json may be partial.");
  }

  return {
    root,
    isReactNative,
    isExpo,
    expoRouter,
    name: pkg?.name,
    version: pkg?.version,
    scripts: pkg?.scripts ?? {},
    dependencies: deps,
    devDependencies: devDeps,
    routerDir: await findRouterDir(root),
    notes,
  };
}

/** Recursively list project files (depth-limited, ignoring build/vendor dirs). */
export async function listTree(
  root: string,
  maxDepth = 4
): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string, depth: number, prefix: string) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".") continue;
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        out.push(`${prefix}${entry.name}/`);
        await walk(path.join(dir, entry.name), depth + 1, prefix + "  ");
      } else {
        out.push(`${prefix}${entry.name}`);
      }
    }
  }

  await walk(root, 0, "");
  return out;
}

/** List Expo Router routes by scanning the router directory for route files. */
export async function listRoutes(root: string): Promise<string[]> {
  const routerDir = await findRouterDir(root);
  if (!routerDir) return [];
  const routes: string[] = [];

  async function walk(dir: string, urlPrefix: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, `${urlPrefix}/${entry.name}`);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        const base = entry.name.replace(/\.(tsx?|jsx?)$/, "");
        if (base === "_layout") continue;
        const segment = base === "index" ? "" : `/${base}`;
        const route = `${urlPrefix}${segment}` || "/";
        routes.push(`${route}  ->  ${path.relative(root, full)}`);
      }
    }
  }

  await walk(routerDir, "");
  return routes.sort();
}

/** Safe-guard: ensure a target path stays inside the project root. */
export function assertInsideRoot(root: string, target: string): string {
  const resolved = path.resolve(root, target);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside the project root: ${target}`);
  }
  return resolved;
}
