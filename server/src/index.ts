#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

import { devServer, runCommand } from "./exec.js";
import {
  assertInsideRoot,
  findComponentsDir,
  findRouterDir,
  getProjectInfo,
  listRoutes,
  listTree,
  pathExists,
  resolveProjectRoot,
} from "./project.js";
import {
  componentFileName,
  componentTemplate,
  screenFileName,
  screenTemplate,
} from "./generators.js";

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const text = (s: string): ToolResult => ({ content: [{ type: "text", text: s }] });
const fail = (s: string): ToolResult => ({
  content: [{ type: "text", text: s }],
  isError: true,
});

function formatRun(label: string, r: { code: number | null; stdout: string; stderr: string; timedOut: boolean }): ToolResult {
  const body = [
    `${label} (exit code: ${r.code ?? "n/a"}${r.timedOut ? ", TIMED OUT" : ""})`,
    "",
    "--- stdout ---",
    r.stdout.trim() || "(empty)",
    "",
    "--- stderr ---",
    r.stderr.trim() || "(empty)",
  ].join("\n");
  return r.code === 0 && !r.timedOut ? text(body) : fail(body);
}

const server = new McpServer({
  name: "react-native-mcp",
  version: "0.1.0",
});

const projectRootArg = {
  projectRoot: z
    .string()
    .optional()
    .describe(
      "Absolute or relative path to the React Native project. Defaults to RN_PROJECT_ROOT or the working directory."
    ),
};

/* ---------------------------------------------------------------- *
 * Context / inspection tools
 * ---------------------------------------------------------------- */

server.registerTool(
  "project_info",
  {
    title: "Project info",
    description:
      "Summarize the React Native / Expo project: name, framework, whether it uses Expo Router, scripts and dependencies. Start here to orient yourself.",
    inputSchema: { ...projectRootArg },
  },
  async ({ projectRoot }) => {
    const root = resolveProjectRoot(projectRoot);
    const info = await getProjectInfo(root);
    const lines = [
      `Project root: ${info.root}`,
      `Name: ${info.name ?? "(unknown)"}  Version: ${info.version ?? "(unknown)"}`,
      `React Native: ${info.isReactNative ? "yes" : "no"}`,
      `Expo: ${info.isExpo ? "yes" : "no"}  Expo Router: ${info.expoRouter ? "yes" : "no"}`,
      `Router directory: ${info.routerDir ? path.relative(root, info.routerDir) : "(none)"}`,
      "",
      "Scripts:",
      ...Object.entries(info.scripts).map(([k, v]) => `  ${k}: ${v}`),
      "",
      `Dependencies (${Object.keys(info.dependencies).length}):`,
      ...Object.entries(info.dependencies).map(([k, v]) => `  ${k}@${v}`),
    ];
    if (info.notes.length) {
      lines.push("", "Notes:", ...info.notes.map((n) => `  - ${n}`));
    }
    return text(lines.join("\n"));
  }
);

server.registerTool(
  "list_files",
  {
    title: "List project files",
    description:
      "Show the project file tree (build and vendor directories excluded). Useful for understanding layout before editing.",
    inputSchema: {
      ...projectRootArg,
      maxDepth: z.number().int().min(1).max(8).optional().describe("Directory depth to traverse (default 4)."),
    },
  },
  async ({ projectRoot, maxDepth }) => {
    const root = resolveProjectRoot(projectRoot);
    const tree = await listTree(root, maxDepth ?? 4);
    return text(tree.length ? tree.join("\n") : "(no files found)");
  }
);

server.registerTool(
  "list_routes",
  {
    title: "List app routes/screens",
    description:
      "List Expo Router routes (screens) discovered in the app/ or src/app/ directory, mapped to their files.",
    inputSchema: { ...projectRootArg },
  },
  async ({ projectRoot }) => {
    const root = resolveProjectRoot(projectRoot);
    const routes = await listRoutes(root);
    if (!routes.length) {
      return text("No Expo Router routes found (no app/ or src/app/ directory, or it is empty).");
    }
    return text(["Routes:", ...routes].join("\n"));
  }
);

server.registerTool(
  "read_file",
  {
    title: "Read a project file",
    description: "Read a UTF-8 text file from within the project (path relative to the project root).",
    inputSchema: {
      ...projectRootArg,
      file: z.string().describe("Path to the file, relative to the project root."),
    },
  },
  async ({ projectRoot, file }) => {
    const root = resolveProjectRoot(projectRoot);
    try {
      const target = assertInsideRoot(root, file);
      const content = await fs.readFile(target, "utf8");
      return text(content);
    } catch (err) {
      return fail(`Could not read ${file}: ${String(err)}`);
    }
  }
);

/* ---------------------------------------------------------------- *
 * Code generation tools
 * ---------------------------------------------------------------- */

server.registerTool(
  "create_component",
  {
    title: "Create a component",
    description:
      "Generate a typed React Native function component (.tsx) in the project's components directory. Use this to turn an idea into a starting component you then refine.",
    inputSchema: {
      ...projectRootArg,
      name: z.string().describe("Component name, e.g. 'PrimaryButton' or 'profile card'."),
      description: z.string().optional().describe("One-line description of what the component does."),
      overwrite: z.boolean().optional().describe("Overwrite if the file already exists (default false)."),
    },
  },
  async ({ projectRoot, name, description, overwrite }) => {
    const root = resolveProjectRoot(projectRoot);
    const dir = await findComponentsDir(root);
    await fs.mkdir(dir, { recursive: true });
    const target = path.join(dir, componentFileName(name));
    if ((await pathExists(target)) && !overwrite) {
      return fail(`${path.relative(root, target)} already exists. Pass overwrite=true to replace it.`);
    }
    await fs.writeFile(target, componentTemplate(name, description), "utf8");
    return text(`Created component: ${path.relative(root, target)}`);
  }
);

server.registerTool(
  "create_screen",
  {
    title: "Create a screen (route)",
    description:
      "Generate a new Expo Router screen file under app/ or src/app/. The route name maps to the URL path, e.g. 'settings' -> /settings, 'profile/edit' -> /profile/edit.",
    inputSchema: {
      ...projectRootArg,
      name: z.string().describe("Route name / path, e.g. 'settings' or 'profile/edit'."),
      description: z.string().optional().describe("One-line description of the screen."),
      overwrite: z.boolean().optional().describe("Overwrite if the file already exists (default false)."),
    },
  },
  async ({ projectRoot, name, description, overwrite }) => {
    const root = resolveProjectRoot(projectRoot);
    const routerDir = (await findRouterDir(root)) ?? path.join(root, "app");
    const target = path.join(routerDir, screenFileName(name));
    await fs.mkdir(path.dirname(target), { recursive: true });
    if ((await pathExists(target)) && !overwrite) {
      return fail(`${path.relative(root, target)} already exists. Pass overwrite=true to replace it.`);
    }
    await fs.writeFile(target, screenTemplate(path.basename(name), description), "utf8");
    return text(`Created screen: ${path.relative(root, target)}`);
  }
);

/* ---------------------------------------------------------------- *
 * Dependency management
 * ---------------------------------------------------------------- */

server.registerTool(
  "install_dependencies",
  {
    title: "Install dependencies",
    description:
      "Install npm packages. For Expo projects this uses `npx expo install` so versions stay compatible with the Expo SDK. With no packages, installs all existing dependencies.",
    inputSchema: {
      ...projectRootArg,
      packages: z.array(z.string()).optional().describe("Package names to add. Omit to install existing deps."),
    },
  },
  async ({ projectRoot, packages }) => {
    const root = resolveProjectRoot(projectRoot);
    const info = await getProjectInfo(root);
    let args: string[];
    if (packages && packages.length) {
      args = info.isExpo ? ["expo", "install", ...packages] : ["install", ...packages];
    } else {
      args = ["install"];
    }
    const cmd = info.isExpo && packages && packages.length ? "npx" : "npm";
    const r = await runCommand(cmd, args, root, 300_000);
    return formatRun(`${cmd} ${args.join(" ")}`, r);
  }
);

/* ---------------------------------------------------------------- *
 * Dev server / live preview
 * ---------------------------------------------------------------- */

server.registerTool(
  "start_dev_server",
  {
    title: "Start dev server (live preview)",
    description:
      "Start the Expo dev server so you can preview the app live. Scan the QR code shown in the logs with the Expo Go app on your phone for instant hot-reload preview. Use dev_server_logs to read the QR/URL and any errors.",
    inputSchema: {
      ...projectRootArg,
      mode: z
        .enum(["lan", "tunnel", "web"])
        .optional()
        .describe(
          "lan (default): preview on a phone on the same Wi-Fi. tunnel: preview from anywhere (needs internet). web: open in a browser."
        ),
      clear: z.boolean().optional().describe("Clear the Metro bundler cache on start."),
    },
  },
  async ({ projectRoot, mode, clear }) => {
    const root = resolveProjectRoot(projectRoot);
    if (!(await pathExists(path.join(root, "node_modules")))) {
      return fail(
        "node_modules not found. Run install_dependencies first (or `npm install` in the project) before starting the dev server."
      );
    }
    const args = ["expo", "start"];
    if (mode === "tunnel") args.push("--tunnel");
    if (mode === "web") args.push("--web");
    if (clear) args.push("--clear");
    const msg = devServer.start("npx", args, root);
    return text(
      `${msg}\n\nGive it ~10-20s to boot, then call dev_server_logs to read the QR code / URL and watch for errors.`
    );
  }
);

server.registerTool(
  "dev_server_logs",
  {
    title: "Read dev server logs",
    description:
      "Read recent output from the running dev server (Metro/Expo). This is your main debugging window: the QR code, bundling progress, and runtime errors all show up here.",
    inputSchema: {
      lines: z.number().int().min(1).max(2000).optional().describe("How many recent log lines to return (default 80)."),
    },
  },
  async ({ lines }) => text(devServer.getLogs(lines ?? 80))
);

server.registerTool(
  "dev_server_status",
  {
    title: "Dev server status",
    description: "Check whether the dev server is running, its pid, uptime, and command.",
    inputSchema: {},
  },
  async () => text(JSON.stringify(devServer.status(), null, 2))
);

server.registerTool(
  "stop_dev_server",
  {
    title: "Stop dev server",
    description: "Stop the running Expo/Metro dev server.",
    inputSchema: {},
  },
  async () => text(devServer.stop())
);

/* ---------------------------------------------------------------- *
 * Quality / debugging
 * ---------------------------------------------------------------- */

server.registerTool(
  "typecheck",
  {
    title: "TypeScript typecheck",
    description: "Run the TypeScript compiler in no-emit mode to surface type errors across the project.",
    inputSchema: { ...projectRootArg },
  },
  async ({ projectRoot }) => {
    const root = resolveProjectRoot(projectRoot);
    const r = await runCommand("npx", ["tsc", "--noEmit", "--pretty", "false"], root, 240_000);
    return formatRun("tsc --noEmit", r);
  }
);

server.registerTool(
  "lint",
  {
    title: "Lint",
    description: "Run the project's lint script (e.g. `expo lint`) to catch style and correctness issues.",
    inputSchema: { ...projectRootArg },
  },
  async ({ projectRoot }) => {
    const root = resolveProjectRoot(projectRoot);
    const info = await getProjectInfo(root);
    if (!info.scripts.lint) {
      return fail("No 'lint' script found in package.json.");
    }
    const r = await runCommand("npm", ["run", "lint"], root, 240_000);
    return formatRun("npm run lint", r);
  }
);

server.registerTool(
  "run_tests",
  {
    title: "Run tests",
    description: "Run the project's test script if one is defined.",
    inputSchema: { ...projectRootArg },
  },
  async ({ projectRoot }) => {
    const root = resolveProjectRoot(projectRoot);
    const info = await getProjectInfo(root);
    if (!info.scripts.test) {
      return fail("No 'test' script found in package.json.");
    }
    const r = await runCommand("npm", ["test", "--", "--watchAll=false"], root, 300_000);
    return formatRun("npm test", r);
  }
);

server.registerTool(
  "run_script",
  {
    title: "Run an npm script",
    description: "Run any script defined in the project's package.json by name.",
    inputSchema: {
      ...projectRootArg,
      script: z.string().describe("The npm script name to run."),
    },
  },
  async ({ projectRoot, script }) => {
    const root = resolveProjectRoot(projectRoot);
    const info = await getProjectInfo(root);
    if (!info.scripts[script]) {
      return fail(`No '${script}' script found. Available: ${Object.keys(info.scripts).join(", ") || "(none)"}`);
    }
    const r = await runCommand("npm", ["run", script], root, 300_000);
    return formatRun(`npm run ${script}`, r);
  }
);

server.registerTool(
  "doctor",
  {
    title: "Expo doctor",
    description: "Run `npx expo-doctor` to diagnose dependency and configuration problems in an Expo project.",
    inputSchema: { ...projectRootArg },
  },
  async ({ projectRoot }) => {
    const root = resolveProjectRoot(projectRoot);
    const r = await runCommand("npx", ["expo-doctor"], root, 240_000);
    return formatRun("npx expo-doctor", r);
  }
);

/* ---------------------------------------------------------------- *
 * Resources
 * ---------------------------------------------------------------- */

server.registerResource(
  "project-info",
  "rn://project/info",
  {
    title: "Project info",
    description: "JSON summary of the current React Native / Expo project.",
    mimeType: "application/json",
  },
  async (uri) => {
    const info = await getProjectInfo(resolveProjectRoot());
    return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(info, null, 2) }] };
  }
);

server.registerResource(
  "project-structure",
  "rn://project/structure",
  {
    title: "Project structure",
    description: "File tree of the current project.",
    mimeType: "text/plain",
  },
  async (uri) => {
    const tree = await listTree(resolveProjectRoot());
    return { contents: [{ uri: uri.href, mimeType: "text/plain", text: tree.join("\n") }] };
  }
);

server.registerResource(
  "project-routes",
  "rn://project/routes",
  {
    title: "App routes",
    description: "Expo Router routes/screens in the current project.",
    mimeType: "text/plain",
  },
  async (uri) => {
    const routes = await listRoutes(resolveProjectRoot());
    return { contents: [{ uri: uri.href, mimeType: "text/plain", text: routes.join("\n") || "(none)" }] };
  }
);

/* ---------------------------------------------------------------- *
 * Prompts
 * ---------------------------------------------------------------- */

server.registerPrompt(
  "build_feature",
  {
    title: "Build a feature",
    description: "Guide the assistant to turn an idea into working React Native code, end to end.",
    argsSchema: { idea: z.string().describe("Describe the feature or screen you want to build.") },
  },
  ({ idea }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `I want to build this in my React Native (Expo) app:\n\n"${idea}"\n\nPlease:\n1. Call project_info and list_routes to understand the project.\n2. Propose a short plan (screens/components needed).\n3. Use create_screen and create_component to scaffold the files, then fill them in with real code by editing the files.\n4. Run typecheck and fix any errors.\n5. Make sure the dev server is running (start_dev_server) and read dev_server_logs to confirm it bundles without errors so I can preview on my phone.`,
        },
      },
    ],
  })
);

server.registerPrompt(
  "debug",
  {
    title: "Debug an error",
    description: "Help diagnose a React Native error using the dev server logs.",
    argsSchema: { problem: z.string().describe("Describe what's going wrong (error message or behavior).") },
  },
  ({ problem }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Something is wrong in my React Native app:\n\n"${problem}"\n\nPlease:\n1. Call dev_server_logs to read the latest output and find the error/stack trace.\n2. Identify the file and root cause.\n3. Apply a fix by editing the file(s).\n4. Run typecheck and re-check dev_server_logs to confirm it's resolved.`,
        },
      },
    ],
  })
);

server.registerPrompt(
  "review_changes",
  {
    title: "Review changes",
    description: "Review recent code changes for correctness and React Native best practices.",
    argsSchema: {},
  },
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please review my recent changes: run typecheck and lint, scan the changed files for React Native pitfalls (missing keys, inline styles that should be memoized, unhandled async, accessibility), and summarize findings with concrete fixes.`,
        },
      },
    ],
  })
);

/* ---------------------------------------------------------------- *
 * Boot
 * ---------------------------------------------------------------- */

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for logging; stdout is reserved for the MCP protocol.
  console.error("react-native-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting react-native-mcp:", err);
  process.exit(1);
});
