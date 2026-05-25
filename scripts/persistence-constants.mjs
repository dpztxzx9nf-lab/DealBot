import path from "path";
import { fileURLToPath } from "url";
import { DEALBOT_TUNNEL } from "./tunnel-constants.mjs";

export const ROOT = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
);

export const PORT = DEALBOT_TUNNEL.port;
export const LOCAL_URL = `http://127.0.0.1:${PORT}`;
export const PUBLIC_URL = `https://${DEALBOT_TUNNEL.hostname}`;

/** Only used if no existing system PM2 resurrect task is found. */
export const PM2_RESURRECT_TASK = "DealBot-PM2-Resurrect";
export const PM2_DUMP = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".pm2",
  "dump.pm2"
);

export const PM2_APP = "dealbot";
export const PM2_TUNNEL = "dealbot-tunnel";
