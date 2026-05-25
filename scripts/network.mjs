import os from "os";

export const SSL_PORT = 3443;
export const HTTP_PORT = 3000;

/** First non-internal IPv4 (LAN). */
export function lanIp() {
  const override = process.env.DEALBOT_LAN_IP?.trim();
  if (override) return override;

  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

export function printMobileBanner({ httpsUrl, mode, extra = [] }) {
  const line = "═".repeat(56);
  console.log(`\n${line}`);
  console.log("  DEALBOT — OPEN THIS ON iPHONE SAFARI");
  console.log(line);
  console.log(`\n  ${httpsUrl}\n`);
  console.log(`  Mode: ${mode}`);
  for (const e of extra) console.log(`  ${e}`);
  console.log("\n  Then: Share → Add to Home Screen (from this HTTPS URL)");
  console.log(`${line}\n`);
}
