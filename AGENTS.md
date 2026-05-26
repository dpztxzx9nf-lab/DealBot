# DealBot Agent Notes

DealBot is a Next.js resale-intelligence app with a persistent PM2 production setup and a named Cloudflare tunnel.

## Boundaries

- Do not change product/application logic unless the task explicitly asks for it.
- Do not expose `.env.local`, Cloudflare credentials, tunnel credential JSON, API keys, cookies, or PM2 environment dumps.
- Do not delete files, PM2 dump files, pid files, scheduled tasks, or tunnel config unless the owner explicitly approves the cleanup.
- Treat current dirty worktree changes as user work. Review before editing nearby code.

## Runtime

- Development: `npm run dev`
- Development port: `0.0.0.0:3000`
- Production command: `npm start`
- Production PM2 command: `npm run deploy:persistent`
- Production app port: `0.0.0.0:3002`
- Public URL: `https://dealbot.thinkcore.io`

## PM2

- App process: `dealbot`
- Tunnel process: `dealbot-tunnel`
- App ecosystem file: `ecosystem.config.cjs`
- Tunnel ecosystem file: `ecosystem.tunnel.config.cjs`
- Save process list after intended runtime changes: `npm run pm2:save`

## Persistence

- Persistent deploy: `npm run deploy:persistent`
- Windows logon resurrection: `npm run persist:windows`
- Health check: `npm run check:persistent`
- Persistence should restore both `dealbot` and `dealbot-tunnel` through PM2 resurrect, not separate per-app scheduled tasks.

## Verification

Before handoff, run:

```powershell
npm run lint
npm run check:persistent
pm2 status
netstat -ano | Select-String -Pattern ':3000|:3002'
```

If `pm2` is not on PATH in the current shell, report that explicitly and ask the owner to verify from their normal PowerShell session.
