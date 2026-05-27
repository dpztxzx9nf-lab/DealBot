# DealBot

Personal resale flip intelligence — mobile-first swipe deck for public deal feeds.

## Operational summary

DealBot has two supported runtime modes:

| Mode | Command | Port | Notes |
| --- | --- | --- | --- |
| Development | `npm run dev` | `0.0.0.0:3000` | Local Next.js development |
| Production | `npm start` | `0.0.0.0:3002` | Uses `scripts/start-prod.mjs` |
| Persistent production | `npm run deploy:persistent` | `0.0.0.0:3002` | Builds, starts PM2 app+tunnel, then saves PM2 |

PM2 names:

- App: `dealbot`
- Tunnel: `dealbot-tunnel`

Persistence flow:

1. `npm run deploy:persistent`
2. `npm run persist:windows`
3. `npm run check:persistent`

The named Cloudflare tunnel routes `dealbot.thinkcore.io` to `http://127.0.0.1:3002`. See `docs/OPERATIONS.md` for the audit checklist, PM2 layout, Windows reboot persistence, and handoff commands.

## Quick start (desktop)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Mobile PWA testing (iPhone) — read this

Installed Home Screen apps **require HTTPS**. Plain `http://192.168.x.x` fails with **HTTPS-Only** / connection errors.

### Recommended: Cloudflare Tunnel (most reliable)

One command. Real public HTTPS. **No certificate trust on iPhone.**

```bash
npm install
npm run dev:tunnel
```

Wait for the large banner:

```text
════════════════════════════════════════════════════════
  DEALBOT — OPEN THIS ON iPHONE SAFARI
════════════════════════════════════════════════════════

  https://something-random.trycloudflare.com
```

1. On iPhone **Safari**, open **that exact https URL**.
2. Confirm DealBot loads.
3. **Share → Add to Home Screen** (from that URL).
4. Open the icon — should work without HTTPS-Only errors.
5. **Delete** any old Home Screen shortcut that used `http://` or `https://192.168.x.x:3443`.

Tunnel URL changes every run.

**HMR / webpack-hmr:** Hot reload websockets often fail through a tunnel. That is expected. `npm run dev:tunnel` sets `ALLOWED_DEV_ORIGIN` to your tunnel hostname and allows `*.trycloudflare.com` in `next.config.ts`. The app loads fully without HMR on iPhone.

When the tunnel is ready you should see:

```text
✓ Tunnel app reachable
  GET https://….trycloudflare.com/swipe → 200
```

---

### Alternative: mkcert LAN HTTPS (same Wi‑Fi)

Use when you want local network only and can trust a dev CA on iPhone.

#### 1. Install mkcert (once per dev machine)

| OS | Command |
|----|---------|
| Windows | `winget install FiloSottile.mkcert` or `choco install mkcert` |
| macOS | `brew install mkcert` |

Open a **new** terminal after installing.

#### 2. Generate certs (includes your LAN IP in SAN)

```bash
npm run setup:https
```

This runs `mkcert -install` on your Mac/PC and creates `.certs/` for:

- `localhost`
- `127.0.0.1`
- `::1`
- your LAN IP (e.g. `192.168.1.9`)

Override IP: `set DEALBOT_LAN_IP=192.168.1.9` (Windows) or `DEALBOT_LAN_IP=192.168.1.9` (Mac) before `setup:https`.

Re-run `setup:https` if your router assigns a new IP.

#### 3. Trust mkcert root on iPhone (one-time)

1. Copy `.certs/rootCA.pem` to iPhone (AirDrop, email, or open via tunnel).
2. Tap the file → **Install Profile** → enter passcode.
3. **Settings → General → About → Certificate Trust Settings**
4. Enable **full trust** for the mkcert development CA.

#### 4. Start HTTPS dev

```bash
npm run dev:https
```

After ~5s it runs `npm run verify:https` and prints:

```text
https://192.168.1.9:3443
```

Proxy listens on **`0.0.0.0:3443`** with your mkcert cert (not the broken default local-ssl-proxy cert).

#### 5. Verify from PC (before iPhone)

```bash
npm run verify:https
```

Expect `OK` for `https://127.0.0.1:3443`, `https://localhost:3443`, and `https://192.168.1.9:3443`.

Manual check:

```bash
curl -I https://192.168.1.9:3443/swipe
```

#### 6. iPhone Safari

1. Same Wi‑Fi as dev machine.
2. Open `https://192.168.1.9:3443` (your IP from terminal).
3. No cert warning if root CA is trusted.
4. **Add to Home Screen** from that HTTPS page.

**Windows firewall:** allow Node.js inbound on port **3443** if iPhone cannot connect.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | HTTP `0.0.0.0:3000` (desktop only) |
| `npm run dev:tunnel` | **Recommended** — public HTTPS for iPhone PWA |
| `npm run setup:https` | Generate mkcert certs in `.certs/` |
| `npm run dev:https` | Next + mkcert HTTPS on `0.0.0.0:3443` |
| `npm run verify:https` | `curl` checks for PC + LAN HTTPS |
| `npm run build` | Production build |
| `npm start` | Production server `0.0.0.0:3002` |
| `npm run pm2:start` | Start DealBot under PM2 |
| `npm run pm2:restart` | Restart PM2 process |
| `npm run pm2:stop` | Stop PM2 process |
| `npm run pm2:logs` | Tail PM2 logs |
| `npm run pm2:save` | Persist PM2 process list |
| `npm run deploy:persistent` | Build + PM2 `dealbot` + `dealbot-tunnel` + `pm2 save` |
| `npm run persist:windows` | Ensure logon task runs `pm2 resurrect` (uses existing if present) |
| `npm run check:persistent` | Verify PM2, local app, public URL |
| `npm run tunnel:prod` | Temporary quick tunnel (dev/test only) |

---

## Windows production (PM2 + resurrect)

Uses your existing **PM2 resurrect** logon flow — not separate per-app Scheduled Tasks.

```powershell
cd C:\Projects\DealBot
npm install
npm run deploy:persistent
npm run persist:windows
npm run check:persistent
```

| What | URL / process |
|------|----------------|
| Local app | http://127.0.0.1:3002 |
| Public | https://dealbot.thinkcore.io |
| PM2 app | `dealbot` |
| PM2 tunnel | `dealbot-tunnel` |

After reboot/login: your **pm2 resurrect** task restores both processes (no visible console — `npm run persist:windows` patches `pm2.cmd` tasks to a hidden launcher).

### Public DNS (Cloudflare authority required)

Named tunnel ingress and PM2 only cover **local** routing (`cloudflared` → `http://127.0.0.1:3002`). Whether `https://dealbot.thinkcore.io` works on the internet is entirely **DNS authority**.

**Recommended:** migrate `thinkcore.io` nameservers to **Cloudflare** (full setup), then let Cloudflare own the public record:

```powershell
cloudflared tunnel route dns dealbot dealbot.thinkcore.io
```

That creates a **proxied** CNAME to `2e983aee-75b4-4a55-8a76-ebce64535961.cfargotunnel.com` in Cloudflare DNS. With Cloudflare as authoritative NS, resolvers get Cloudflare edge addresses and a valid edge certificate — not a bare `fd10::` target.

Confirm:

- Registrar / DNS panel shows **Cloudflare nameservers** for `thinkcore.io` (not `dyna-ns.net`).
- Dashboard → DNS: `dealbot` is **Proxied** (orange cloud) and points at the tunnel.
- `npm run check:persistent` reports **public URL** OK.

**Do not** manually add at **dyna-ns.net** (or any non-Cloudflare authoritative DNS):

```text
dealbot.thinkcore.io  CNAME  <tunnel-uuid>.cfargotunnel.com
```

unless `thinkcore.io` is **fully Cloudflare-authoritative** (nameservers delegated to Cloudflare). If NS still live at dyna-ns.net, that CNAME is what the public internet uses; it resolves to non-routable tunnel plumbing (`fd10::` only), **no edge TLS**, and Safari security errors — even when `cloudflared tunnel route dns` says “already configured” in your Cloudflare account.

`cloudflared tunnel route dns` updates **Cloudflare’s** DNS view only. It is not authoritative while the zone’s NS remain elsewhere.

**Wrong (external NS still at dyna-ns.net):** manual CNAME → `*.cfargotunnel.com` at dyna-ns.

**Right (full Cloudflare DNS):** NS → Cloudflare, then `cloudflared tunnel route dns` (proxied tunnel hostname).

If you must keep a third-party authoritative DNS provider, use Cloudflare **[CNAME setup (partial)](https://developers.cloudflare.com/dns/zone-setups/partial-setup/setup/)** and point the hostname at `{hostname}.cdn.cloudflare.net` — not `*.cfargotunnel.com` on dyna-ns. DealBot’s persistent path assumes full Cloudflare NS.

Tunnel ID (for dashboard / route commands): `2e983aee-75b4-4a55-8a76-ebce64535961`.

**Dev** stays on port **3000** (`npm run dev`, `npm run dev:tunnel`).

## eBay comps (optional)

Copy `.env.example` to `.env.local` and set `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`.
