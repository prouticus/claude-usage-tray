# Claude Usage Tray

A lightweight Windows/macOS system tray app that shows your [Claude.ai](https://claude.ai) usage stats at a glance — no browser tab required.

![Mini widget showing Session, Weekly, and Extra usage bars](.github/screenshot-mini.png)

## Features

- **Always-on-top mini widget** — draggable progress bars in the corner of your screen showing session, weekly, and extra usage
- **Tray popup** — click the tray icon for a full detail view including account info, reset timers, and dollar amounts for extra usage
- **Live refresh** — data updates every 5 minutes automatically, or on demand via the ↻ button
- **Extra usage billing** — shows spend vs. limit when you have Claude's extra usage feature enabled
- **Launch at startup** — optional, toggled from the tray menu

## Prerequisite: Claude Code CLI

This app reads the OAuth credentials that [Claude Code](https://docs.anthropic.com/en/docs/claude-code) stores locally at `~/.claude/.credentials.json`. You must have Claude Code installed and be signed in for the app to work.

**Install Claude Code:**

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

If you haven't used Claude Code before, `claude login` will open a browser window to authenticate with your Claude.ai account.

## Running from source

```bash
git clone https://github.com/prouticus/claude-usage-tray.git
cd claude-usage-tray
bun install
bun start
```

> **Node.js alternative:** replace `bun install` / `bun start` with `npm install` / `npm start`

The app will appear in your system tray. On first launch the popup opens automatically.

## Building a distributable

```bash
# Windows (.exe installer)
bun run package:win

# macOS (.dmg, x64 + arm64)
bun run package:mac
```

Output lands in the `release/` folder.

> **macOS note:** distributing outside the App Store requires code-signing. Without a certificate, users must right-click → Open to bypass Gatekeeper on first launch.

## Usage

| Action | Result |
|--------|--------|
| Click tray icon | Toggle the full usage popup |
| Click mini widget bars | Open the full usage popup |
| Drag mini widget header | Reposition the widget |
| Click ↻ in mini widget | Force-refresh data now |
| Right-click tray icon | Context menu (toggle widget, launch at startup, quit) |

## How it works

Claude Code stores an OAuth access token at `~/.claude/.credentials.json` after you log in. This app reads that token and calls the same internal usage API that claude.ai uses to display your limits. No credentials are stored or transmitted anywhere beyond Anthropic's own API.

## Tech stack

- [Electron](https://www.electronjs.org/) — cross-platform desktop shell
- [React](https://react.dev/) 19 + TypeScript — renderer UI
- [electron-store](https://github.com/sindresorhus/electron-store) — persists widget position and settings
- [webpack](https://webpack.js.org/) — bundles main + renderer processes

## Development

```bash
bun start          # watch mode — rebuilds on file changes
```

Source layout:

```
src/
  main/            # Electron main process (tray, windows, IPC, API calls)
  preload/         # Context bridge (exposes safe APIs to renderer)
  renderer/        # React UI
    components/
      MiniWidget   # Always-on-top corner widget
      UsagePopup   # Full tray popup
      ProgressBar  # Reusable bar component
  shared/          # Types shared between main and renderer
```
