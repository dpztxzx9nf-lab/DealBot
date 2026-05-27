# DealBot Operations

This document is the operational handoff for `C:\Projects\DealBot`.

## Inventory

- Project: DealBot
- Type: Next.js app
- GitHub: connected through `origin`
- Development port: `3000`
- Production port: `3002`
- Production local URL: `http://127.0.0.1:3002`
- Public URL: `https://dealbot.thinkcore.io`
- Named Cloudflare tunnel: `dealbot`
- PM2 app process: `dealbot`
- PM2 tunnel process: `dealbot-tunnel`

## Commands

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Development server | `npm run dev` |
| Build | `npm run build` |
| Production server without PM2 | `npm start` |
| Start app under PM2 | `npm run pm2:start` |
| Start tunnel under PM2 | `npm run pm2:start:tunnel` |
| Restart both PM2 processes | `npm run pm2:restart` |
| Stop both PM2 processes | `npm run pm2:stop` |
| App logs | `npm run pm2:logs` |
| Tunnel logs | `npm run pm2:logs:tunnel` |
| Save PM2 process list | `npm run pm2:save` |
| Full persistent deploy | `npm run deploy:persistent` |
| Configure Windows resurrection | `npm run persist:windows` |
| Verify persistence | `npm run check:persistent` |

## Port Layout

| Mode | Binding | Purpose |
| --- | --- | --- |
| Dev | `0.0.0.0:3000` | Local development with `next dev` |
| Production | `0.0.0.0:3002` | PM2-managed `next start` |
| Tunnel target | `127.0.0.1:3002` | Cloudflare tunnel ingress target |

Do not change ports casually. Confirm that no other active project owns the target port before changing PM2 or tunnel settings.

## PM2 Layout

`ecosystem.config.cjs` starts:

- name: `dealbot`
- script: `node_modules/next/dist/bin/next`
- args: `start -H 0.0.0.0 -p 3002`
- cwd: `C:/Projects/DealBot`

`ecosystem.tunnel.config.cjs` starts:

- name: `dealbot-tunnel`
- script: `scripts/tunnel-named.mjs`
- cwd: `C:/Projects/DealBot`

Both processes should be present in `pm2 status` and in the saved PM2 dump after `pm2 save`.

## Tunnel Behavior

DealBot uses a named Cloudflare tunnel. The tunnel config is generated at:

```text
C:\Projects\DealBot\cloudflared\config.yml
```

The generated config should route:

```text
dealbot.thinkcore.io -> http://127.0.0.1:3002
```

The checked-in source of truth is:

```text
scripts\tunnel-constants.mjs
```

Do not commit Cloudflare credential JSON. Do not print credential file contents.

## Persistence Flow

The intended Windows persistence flow is:

1. `npm run deploy:persistent`
2. Build the app.
3. Regenerate `cloudflared/config.yml`.
4. Start or restart PM2 process `dealbot`.
5. Start or restart PM2 process `dealbot-tunnel`.
6. Run `pm2 save`.
7. `npm run persist:windows`
8. Ensure a Windows logon task runs `pm2 resurrect`.
9. Patch PM2 resurrect to use the hidden VBS launcher when needed.
10. `npm run check:persistent`

Persistence should use PM2 resurrect. Do not create separate persistent app and tunnel scheduled tasks.

## Verification Commands

Run from a normal user PowerShell session:

```powershell
cd C:\Projects\DealBot
git status --short --branch
pm2 -v
pm2 status
pm2 jlist
npm run check:persistent
netstat -ano | Select-String -Pattern ':3000|:3002'
```

Check Windows resurrection:

```powershell
Get-ScheduledTask | Where-Object {
  ($_.Actions.Execute + ' ' + $_.Actions.Arguments) -match 'pm2' -and
  ($_.Actions.Execute + ' ' + $_.Actions.Arguments) -match 'resurrect'
} | Select-Object TaskName,TaskPath,State
```

Fallback:

```powershell
schtasks /Query /FO LIST /V | Select-String -Pattern 'PM2|pm2|resurrect|DealBot|dealbot'
```

## Known Current Audit Notes

- The working tree currently has uncommitted product changes related to local hunt/source catalog work.
- `npm run check:persistent` can fail in sandboxed shells if `pm2` is not on PATH, even when PM2 processes exist for the owner account.
- Public URL verification depends on Cloudflare DNS authority for `thinkcore.io`.
- Do not reset, clean, or discard current changes without explicit owner approval.
