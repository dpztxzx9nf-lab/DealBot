/** Single source of truth for DealBot named Cloudflare Tunnel. */
export const DEALBOT_TUNNEL = {
  name: "dealbot",
  id: "2e983aee-75b4-4a55-8a76-ebce64535961",
  hostname: "dealbot.thinkcore.io",
  credentialsFile:
    "C:/Users/Golf/.cloudflared/2e983aee-75b4-4a55-8a76-ebce64535961.json",
  localService: "http://127.0.0.1:3002",
  port: 3002,
};

export function tunnelConfigYaml() {
  const t = DEALBOT_TUNNEL;
  return `# Named Cloudflare Tunnel - DealBot (gitignored; auto-managed)
# Tunnel ID: ${t.id}

tunnel: ${t.name}
credentials-file: ${t.credentialsFile}

ingress:
  - hostname: ${t.hostname}
    service: ${t.localService}
  - service: http_status:404
`;
}
