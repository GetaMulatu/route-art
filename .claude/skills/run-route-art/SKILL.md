---
name: run-route-art
description: Build, run, and drive the route-art Expo web app. Use when asked to start route-art, launch its dev server, take a screenshot of its UI, or interact with the running app in a browser.
---

route-art is an Expo (React Native Web) app, bundled with Metro and served
over HTTP. There is no native GUI to launch — it's a web page. Start the
Metro/Expo dev server, then drive the page in headless Chromium via the
Playwright REPL at `.claude/skills/run-route-art/driver.mjs`.

All paths below are relative to the repo root.

## Prerequisites

Playwright's Chromium browser must be downloaded once:

```bash
npx playwright install chromium
```

(Already cached in this container at `~/.cache/ms-playwright`.)

## Setup

```bash
npm install
```

`playwright` is a devDependency, already installed by the above.

## Run (agent path)

**Start the dev server with WSL's native Linux `node`, not `npx`/`npm exec`.**
See Gotchas — on a repo mounted from Windows (`/mnt/c/...`) under WSL,
`npx expo start` / `npm exec expo start` resolve to the **Windows**
`node.exe`, which binds its listen socket on the Windows side and is
unreachable from WSL via `localhost`. Invoke the CLI entrypoint directly
with WSL's own node instead:

```bash
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill    # free the port if reused
nohup node node_modules/expo/bin/cli start --web --port 8081 > /tmp/route-art-expo.log 2>&1 &
disown
timeout 45 bash -c 'until curl -sf http://localhost:8081 >/dev/null; do sleep 1; done' && echo SERVER UP
```

Then launch the driver and drive it under tmux (poll for the `driver>`
prompt / a result marker instead of a fixed sleep):

```bash
tmux new-session -d -s route-art-driver -x 200 -y 50
tmux send-keys -t route-art-driver 'node .claude/skills/run-route-art/driver.mjs' Enter
timeout 20 bash -c 'until tmux capture-pane -t route-art-driver -p | grep -q "driver>"; do sleep 0.3; done'

tmux send-keys -t route-art-driver 'launch' Enter
timeout 30 bash -c 'until tmux capture-pane -t route-art-driver -p | grep -q "launched\."; do sleep 0.3; done'

tmux send-keys -t route-art-driver 'ss landing' Enter
timeout 10 bash -c 'until tmux capture-pane -t route-art-driver -p | grep -q "screenshot:"; do sleep 0.3; done'
tmux capture-pane -t route-art-driver -p
```

Screenshots land in `/tmp/shots/` (override with `SCREENSHOT_DIR`).

### Driver commands

| command | what it does |
|---|---|
| `launch [url]` | open headless Chromium, navigate to `url` (default `http://localhost:8081`) |
| `ss [name]` | screenshot (full page) -> `/tmp/shots/<name>.png` |
| `click <css-sel>` | click element by CSS selector |
| `click-text <text>` | click first element whose `textContent` matches/contains `<text>` — use the **source-case** string, not the visually-rendered case (see Gotchas) |
| `fill <css-sel> <text>` | fill a form input |
| `type <text>` / `press <key>` | keyboard input |
| `wait <css-sel>` | wait up to 10s for a selector |
| `eval <js>` | evaluate JS in the page, print JSON result |
| `text [css-sel]` | print `innerText` of selector (default `body`) |
| `console` | print collected `console.error`/`pageerror` messages since `launch` |
| `quit` | close browser, exit |

Stop the dev server when done: `lsof -ti:8081 -sTCP:LISTEN | xargs -r kill`.

## Run (human path)

```bash
npm run web   # or: expo start --web — opens the Metro UI, prints a QR code and localhost URL. Ctrl-C to quit.
```

## Gotchas

- **WSL + Windows-mounted repo => `npx`/`npm exec` shell out to Windows
  `node.exe`.** This repo lives under `/mnt/c/Users/...`. The `expo`
  bin shim's own path-detection logic picks the Windows node binary in
  that case. That process *does* bind a listener (visible from
  PowerShell's `Get-NetTCPConnection`), but on `::`/Windows's own
  loopback — WSL's `curl http://localhost:8081` gets `Connection
  refused` even though the server logs "Waiting on http://localhost:8081"
  and even bundles requests. Fix: invoke
  `node node_modules/expo/bin/cli ...` directly with WSL's own `node`
  (confirm with `which node` — should point under `fnm`/`nvm`, not
  `/mnt/c/...`).
- **Tab/label text is CSS-uppercased, not authored uppercase.** The
  right-panel tabs render as "ROUTE / STATS / CANVAS / ANIM / EXPORT"
  visually, but the DOM `textContent` is title-case ("Route", "Stats",
  "Canvas", "Anim", "Export") with `text-transform: uppercase` applied
  in CSS. `click-text STATS` returns `NOT_FOUND`; `click-text Stats`
  works. If a `click-text` lookup fails, re-check case with `eval
  [...document.querySelectorAll('*')].filter(e=>e.children.length===0 &&
  /yourtext/i.test(e.textContent)).map(e=>e.textContent)` before
  assuming the element doesn't exist.
- **No test script.** `package.json` defines no `test` script, and a
  stray `bable.config.js` (typo'd filename) trips a repo-wide `tsc
  --noEmit`, unrelated to app behavior — don't treat that as a driver
  failure.

## Troubleshooting

- **`curl: (7) Failed to connect ... Connection refused` right after
  starting the server**, while the server log already shows "Waiting
  on http://localhost:8081" or even "Web Bundled": you started it via
  `npx`/`npm exec` and hit the Windows-node issue above. Kill it
  (`Get-NetTCPConnection -LocalPort 8081` in PowerShell to find the
  Windows PID, or just re-check `which node` and use the WSL node
  directly) and relaunch with the exact command in "Run (agent path)".
- **`click-text` returns `NOT_FOUND`** for text that's clearly visible
  in a screenshot: check for `text-transform: uppercase` — see
  Gotchas.
- **A source edit isn't reflected in the browser** even after a hard
  reload / new tab / cache-busting query param, while `curl`ing the
  bundle URL directly *does* show the new code: Metro was serving a
  stale cached bundle for the app's exact bundle query-string variant
  (e.g. `...&hot=false&lazy=true&transform.engine=hermes&...`) even
  though a differently-parameterized request to the same endpoint
  picked up the change. Confirm by fetching the app's own `<script
  src>` URL with `fetch(url, {cache:'no-store'})` from inside the page
  and grepping the response for your change. Fix: kill the server and
  restart with a cleared cache — `lsof -ti:8081 -sTCP:LISTEN | xargs -r
  kill`, then relaunch with `-c` (`node node_modules/expo/bin/cli start
  --web --port 8081 -c`) instead of the plain start command. This does
  a full cold rebuild (~15-30s, watch for "Bundler cache is empty,
  rebuilding" in the log) but guarantees fresh output. Cheap sanity
  check before reaching for this: diff `curl`'s bundle output against
  what `fetch(..., {cache:'no-store'})` returns from inside the actual
  page — if they differ, it's this issue, not your code.
