# DealBot Source Summary — 2026-05-25

## One-line summary

DealBot moved from a fragile local app/tunnel setup into a publicly reachable, Cloudflare-backed, PM2-persistent web app available at:

https://dealbot.thinkcore.io/swipe

---

## Final outcome

DealBot is now live publicly over HTTPS and accessible from outside the home network.

Confirmed working:
- Local app runs on `http://127.0.0.1:3002`
- PM2 keeps `dealbot` running
- PM2 keeps `dealbot-tunnel` running
- Cloudflare Tunnel connects publicly
- `dealbot.thinkcore.io/swipe` loads on mobile
- Existing apps/subdomains still work after DNS migration
- `thinkcore.io` DNS authority was successfully migrated to the new Cloudflare account
- GitHub-linked Cloudflare account is now aligned with the active domain infrastructure

---

## Core architecture

```text
GitHub
→ local DealBot repo on PC
→ npm run deploy:persistent
→ PM2 runs DealBot on port 3002
→ PM2 runs cloudflared tunnel
→ Cloudflare Tunnel
→ Cloudflare DNS / HTTPS
→ https://dealbot.thinkcore.io/swipe
```

Runtime path:

```text
Windows logon
→ PM2 resurrect
→ dealbot app
→ dealbot-tunnel
→ Cloudflare edge
→ public HTTPS
```

User access path:

```text
Phone anywhere
→ Cloudflare edge network
→ encrypted tunnel
→ user's PC
→ DealBot app
```

---

## Important final state

### Local runtime

DealBot production app:
- Port: `3002`
- Local URL: `http://127.0.0.1:3002`
- Public URL: `https://dealbot.thinkcore.io/swipe`

PM2 processes:
- `dealbot`
- `dealbot-tunnel`

Persistent Windows recovery:
- PM2 resurrect task runs on Windows logon
- App should return automatically after restart/login if PC and internet are available

### Cloudflare Tunnel

Tunnel UUID:

```text
2e983aee-75b4-4a55-8a76-ebce64535961
```

Tunnel hostname:

```text
dealbot.thinkcore.io
```

Tunnel ingress:

```text
dealbot.thinkcore.io → http://127.0.0.1:3002
```

### DNS

The real issue was DNS authority, not PM2, not the tunnel, and not local deployment.

Old problem:
- `thinkcore.io` was using old Cloudflare nameservers:
  - `karl.ns.cloudflare.com`
  - `virginia.ns.cloudflare.com`
- A new Cloudflare zone was created that expected:
  - `brad.ns.cloudflare.com`
  - `dalary.ns.cloudflare.com`
- This created confusion because there were effectively two Cloudflare zones.

Final resolution:
- DNS records were mirrored into the new Cloudflare account
- Dynadot nameservers were changed to:
  - `brad.ns.cloudflare.com`
  - `dalary.ns.cloudflare.com`
- Cloudflare activated the zone
- Existing apps continued working
- DealBot public URL started working

---

## DNS records that mattered

Records seen/mirrored:

```text
@ / root thinkcore.io
www.thinkcore.io
dealbot.thinkcore.io
ccc.thinkcore.io
```

Important missing record discovered before migration:

```text
ccc → CNAME → 8b6ddcd6b1c68b33.vercel-dns-017.com
```

That record was added to the new Cloudflare zone before switching nameservers.

This prevented breaking CCC during migration.

---

## Major lesson

The earlier failure was not propagation.

The wrong DNS setup had already propagated globally.

The issue was:

```text
Cloudflare Tunnel DNS route existed,
but Cloudflare was not authoritative for the live domain zone.
```

So the internet was not using the Cloudflare zone where the tunnel route was configured.

Fixing local code, PM2, tunnels, or ports could not solve that.

The true fix was DNS authority alignment.

---

## What changed in documentation

Documentation was updated in:

```text
README.md
cloudflared/config.example.yml
scripts/check-persistent.mjs
```

Documentation now warns:
- Cloudflare authority is required for the normal tunnel route flow
- Do not manually create external DNS CNAMEs to `*.cfargotunnel.com` unless Cloudflare is authoritative
- If external nameservers are kept, partial/CNAME setup must be handled differently
- `cloudflared tunnel route dns` can say “already configured” while the public internet still does not use that DNS zone

No changes were made to:
- PM2 runtime
- tunnel config
- ports
- deployment scripts
- persistence scripts

---

## Commands used / final known commands

Run from the DealBot project root:

```text
C:\Projects\DealBot
```

Main health check:

```bash
npm run check:persistent
```

Tunnel route command:

```bash
cloudflared tunnel route dns dealbot dealbot.thinkcore.io
```

Deploy/persist flow:

```bash
npm run deploy:persistent
npm run persist:windows
npm run check:persistent
pm2 list
```

Expected persistence:
- After reboot/login, PM2 should resurrect both `dealbot` and `dealbot-tunnel`
- Public URL should return after PC + internet + PM2 + tunnel are back online

---

## Current confidence

Confirmed:
- DealBot public URL works on phone
- Other apps still work
- Cloudflare zone activated
- DNS migration succeeded
- The system no longer depends on same Wi-Fi
- The app is safe enough for small alpha testing with friends/family

Not yet guaranteed:
- Full internet hardening
- Authentication
- Rate limiting
- Monitoring
- Backups
- Automated GitHub-to-PM2 deployment
- Production-grade security review

---

## Safety posture

This setup is much safer than router port forwarding because:
- No public router port was opened
- Cloudflare hides the home IP
- Tunnel is outbound-only
- HTTPS terminates through Cloudflare
- Public users reach Cloudflare first, not the router directly

Good enough for:
- personal use
- family testing
- friends
- alpha usage
- early product iteration

Before broader public use, add:
- authentication
- rate limiting
- input validation
- monitoring
- logging
- backups
- secret auditing

---

## GitHub vs PM2 distinction

GitHub:
- stores code
- tracks commits
- supports future automation
- is linked to the active Cloudflare account

PM2:
- runs the app locally on the PC
- restarts the app if it crashes
- resurrects processes after Windows login

Cloudflare:
- handles DNS
- handles HTTPS
- tunnels public traffic to the local app

Current deployment is still manual:

```text
edit code
→ git add .
→ git commit
→ git push
→ deploy/update on PC
→ npm run deploy:persistent
→ PM2 runs updated app
```

Future possible automation:
- GitHub Actions
- self-hosted runner
- webhook-triggered deploy
- automatic pull/build/restart on push

---

## Current product direction

DealBot is moving toward a mobile-first resale assistant.

Core concept:
- discover deals
- estimate resale value
- score opportunity
- swipe/save/pass
- track progress from saved deal to sold item

Desired next upgrade:
- “mom-approved” mobile-first UX
- simple, trustworthy, non-technical interface
- fast deal evaluation
- clear profit explanation
- easy status flow

---

## Codex prompt for next upgrade

```text
Upgrade DealBot into a “mom-approved” mobile-first resale assistant.

Focus only on product UX. Do not touch DNS, PM2, Cloudflare, tunnel config, ports, persistence scripts, or deployment scripts.

Primary page: /swipe

Goals:
- Make it feel clean, simple, trustworthy, and iPhone-native.
- Bigger buttons and touch targets.
- Clearer deal cards.
- Better spacing and visual hierarchy.
- Fast save/pass/bought flow.
- Minimal clutter.
- Smooth but lightweight animations.
- Non-technical enough for a parent to understand instantly.

Deal card should clearly show:
- Product image
- Product title
- Store/source
- Buy price
- Estimated resale price
- Estimated profit after fees
- Confidence badge: Strong / Decent / Risky
- Simple recommendation: Good flip / Only if nearby / Skip

Actions:
- Save
- Bought
- Passed

Add or improve saved-deals flow:
- Saved
- Bought
- Listed
- Sold
- Simple profit tracker

Design tone:
- modern
- clean
- simple
- calm
- trustworthy
- not gamer/developer aesthetic

After changes:
- run tests/build if available
- summarize changed files
- explain how to deploy/test live
```

---

## Do not touch unless intentionally changing infrastructure

Avoid unnecessary edits to:
- DNS
- nameservers
- Cloudflare Tunnel config
- PM2 ecosystem config
- ports
- persistence scripts
- deployment scripts

Especially avoid:
- changing nameservers again
- deleting Cloudflare DNS records
- creating manual external CNAMEs to `*.cfargotunnel.com`
- changing port `3002`
- changing tunnel UUID
- modifying Windows persistence unless it breaks

---

## Future improvements

### Product

- Better `/swipe` mobile UX
- Larger deal cards
- clearer buy/resale/profit display
- Save / Bought / Passed actions
- Saved deals status flow
- Profit tracker
- better resale heuristics
- better eBay comps
- better deal source filtering

### Infrastructure

- uptime monitoring
- alerting if tunnel/app goes down
- deployment automation
- GitHub Actions or self-hosted runner
- logs dashboard
- auth for admin features
- backup strategy

### Operational

- commit/push stable state
- reboot test
- verify PM2 resurrect after login
- test public URL after reboot
- document exact recovery commands

---

## Recovery checklist

If public URL stops working:

1. Test local app:

```bash
curl http://127.0.0.1:3002/swipe
```

2. Check PM2:

```bash
pm2 list
```

3. Check persistent health:

```bash
npm run check:persistent
```

4. Check Cloudflare dashboard:
- zone active
- DNS record exists
- tunnel connected

5. Check public URL:

```text
https://dealbot.thinkcore.io/swipe
```

Do not immediately change DNS or nameservers.

---

## Final meaning

Today’s actual milestone:

DealBot crossed from local project into live operational infrastructure.

Before:
- localhost confusion
- phone access problems
- unclear DNS authority
- fragile setup
- anxiety around restarts

After:
- public HTTPS
- Cloudflare authoritative DNS
- persistent PM2 runtime
- Cloudflare Tunnel routing
- mobile access from anywhere
- existing apps preserved
- GitHub/Cloudflare/domain alignment
- real alpha-testable product surface

This is no longer just “a project on a laptop.”

It is now a small live internet service.
