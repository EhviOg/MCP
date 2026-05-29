# React Native MCP — build a mobile app from prompts, with live preview

This repo gives you everything to **describe your app idea in Claude Code and watch it
appear on your phone in real time**:

- **`app/`** — a starter **Expo** (React Native) app. Expo is React Native made easy:
  one command runs a dev server, you scan a QR code with the free **Expo Go** app, and
  your app shows up on your phone and **hot-reloads every time a file is saved**.
- **`server/`** — a custom **MCP server** (`react-native-mcp`) that gives Claude Code
  React-Native-specific superpowers: scaffold screens/components, start the dev server,
  **read the logs to debug**, typecheck, lint and test.
- **`.mcp.json`** — wiring so Claude Code automatically loads the MCP server and points
  it at the `app/` project.

> **Why Expo and not "bare" React Native?** Live preview is the whole point here, and
> Expo is built for it — no Mac or Xcode required to start. If you ever need full native
> control you can later "eject" to bare React Native. Nothing is lost by starting with Expo.

---

## What you need

1. **Node.js 18+** (already used to build this).
2. **VS Code** with **Claude Code**.
3. The **Expo Go** app on your phone (free, from the App Store / Google Play). This is what
   shows your app live.
4. Your phone and computer on the **same Wi‑Fi** (for the default preview mode). If that's
   not possible, the server supports a `tunnel` mode that works over the internet.

---

## One-time setup

From the repo root:

```bash
# 1. Build the MCP server
cd server
npm install
npm run build
cd ..

# 2. Install the app's dependencies
cd app
npm install
cd ..
```

Then open this folder in VS Code with Claude Code. Claude Code reads `.mcp.json` and starts
the **react-native** MCP server automatically. (Run `/mcp` in Claude Code to confirm it's
connected.)

---

## Build your app from prompts

Just talk to Claude Code. It will use the MCP tools for you. For example:

- *"Use the build_feature prompt: a login screen with email + password and a sign-in button."*
- *"Add a settings screen with a dark-mode toggle."*
- *"Start the dev server so I can preview on my phone."*
- *"The app crashed — check the logs and fix it."* (uses the `debug` prompt)

### Seeing it live on your phone

1. Ask Claude: **"Start the dev server."** (it calls `start_dev_server`)
2. Ask: **"Show me the dev server logs."** (it calls `dev_server_logs`) — the **QR code** and
   URL appear there.
3. Open **Expo Go** on your phone and **scan the QR code**.
4. Your app opens. Every change Claude makes and saves **reloads instantly** on your phone.

If your phone and computer aren't on the same network, ask Claude to **"start the dev server
in tunnel mode."**

---

## The MCP tools (what Claude can do)

| Tool | What it does |
|------|--------------|
| `project_info` | Summarize the project (framework, scripts, dependencies). |
| `list_files` | Show the project file tree. |
| `list_routes` | List the app's screens/routes (Expo Router). |
| `read_file` | Read a file from the project. |
| `create_component` | Generate a typed React Native component. |
| `create_screen` | Generate a new screen/route. |
| `install_dependencies` | Add packages (uses `expo install` for version safety). |
| `start_dev_server` | Start Expo for live preview (`lan` / `tunnel` / `web`). |
| `dev_server_logs` | Read dev-server output — the QR code **and** runtime errors. |
| `dev_server_status` | Is the dev server running? |
| `stop_dev_server` | Stop the dev server. |
| `typecheck` | Run TypeScript type checking. |
| `lint` | Run the lint script. |
| `run_tests` | Run the test script. |
| `run_script` | Run any npm script. |
| `doctor` | Run `expo-doctor` to diagnose project issues. |

**Prompts** (slash-style helpers): `build_feature`, `debug`, `review_changes`.
**Resources**: `rn://project/info`, `rn://project/structure`, `rn://project/routes`.

---

## Using the MCP server with a *different* React Native project

The server isn't tied to the bundled `app/`. Point it at any RN/Expo project by changing
`RN_PROJECT_ROOT` in `.mcp.json`, or pass `projectRoot` to most tools.

---

## Troubleshooting

- **`/mcp` shows the server as failed** → make sure you ran `npm run build` in `server/`.
- **`start_dev_server` says node_modules not found** → run `npm install` in `app/`.
- **QR code won't connect** → use `tunnel` mode, or check phone/computer are on the same Wi‑Fi.
- **Want a clean rebuild** → ask Claude to start the dev server with `clear: true`.
