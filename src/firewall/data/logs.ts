import { rng } from "../lib/anim";

export type Flag = "none" | "brute" | "scraper" | "bot" | "sms" | "flood";

export type LogRow = {
  time: string;
  method: string;
  path: string;
  ip: string;
  cc: string;
  ua: string;
  status: number;
  ms: number;
  flag: Flag;
};

const GOOD: Array<[string, string, number]> = [
  ["GET", "/v1/account", 200],
  ["GET", "/v1/databases/main/tables/orders/rows", 200],
  ["POST", "/v1/storage/buckets/avatars/files", 201],
  ["GET", "/v1/functions/checkout/executions", 200],
  ["PATCH", "/v1/databases/main/tables/profiles/rows/6f2c1b", 200],
  ["GET", "/v1/account/sessions/current", 200],
  ["POST", "/v1/messaging/messages/push", 201],
  ["GET", "/v1/avatars/initials", 200],
  ["GET", "/v1/storage/buckets/media/files/9a1e/view", 200],
  ["POST", "/v1/functions/checkout/executions", 201],
  ["GET", "/v1/teams/marketing/memberships", 200],
  ["DELETE", "/v1/account/sessions/current", 204],
  ["GET", "/v1/locale", 200],
  ["POST", "/v1/databases/main/tables/events/rows", 201],
];

const UAS_GOOD = [
  "Mozilla/5.0 (Macintosh)",
  "Mozilla/5.0 (iPhone)",
  "appwrite-flutter/19.0",
  "Mozilla/5.0 (Windows NT)",
  "appwrite-web/21.2",
  "okhttp/4.12 (Android)",
];

const CC = ["US", "DE", "IN", "BR", "GB", "FR", "JP", "CA", "NL", "SG", "AU", "ES"];

const pad = (n: number, w: number) => String(n).padStart(w, "0");

const ip = (r: () => number) =>
  `${Math.floor(r() * 200) + 20}.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}.${Math.floor(r() * 254) + 1}`;

export const makeLogs = (count: number, seed = 11): LogRow[] => {
  const r = rng(seed);
  const rows: LogRow[] = [];
  let ms = (14 * 3600 + 2 * 60 + 31) * 1000 + 218;
  const bruteIp = "185.220.101.34";
  for (let i = 0; i < count; i++) {
    ms += Math.floor(r() * 40) + 3;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    const time = `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms % 1000, 3)}`;
    const roll = r();
    let row: LogRow;
    if (i === 0) {
      row = {
        time,
        method: "GET",
        path: "/v1/account",
        ip: "203.0.113.24",
        cc: "US",
        ua: "Mozilla/5.0 (Macintosh)",
        status: 200,
        ms: 12,
        flag: "none",
      };
    } else if (roll < 0.2) {
      row = {
        time,
        method: "POST",
        path: "/v1/account/sessions/email",
        ip: bruteIp,
        cc: "NL",
        ua: "python-requests/2.31",
        status: 401,
        ms: 9 + Math.floor(r() * 8),
        flag: "brute",
      };
    } else if (roll < 0.33) {
      row = {
        time,
        method: "GET",
        path: `/v1/databases/main/tables/products/rows?offset=${48000 + i * 25}`,
        ip: "45.83.64.12",
        cc: "SG",
        ua: "Go-http-client/1.1",
        status: 200,
        ms: 30 + Math.floor(r() * 30),
        flag: "scraper",
      };
    } else if (roll < 0.43) {
      const probes = ["/wp-login.php", "/.env", "/xmlrpc.php", "/admin/config.php", "/.git/config"];
      row = {
        time,
        method: "GET",
        path: probes[Math.floor(r() * probes.length)],
        ip: ip(r),
        cc: CC[Math.floor(r() * CC.length)],
        ua: "HeadlessChrome/124.0",
        status: 404,
        ms: 4 + Math.floor(r() * 6),
        flag: "bot",
      };
    } else if (roll < 0.5) {
      row = {
        time,
        method: "POST",
        path: "/v1/account/tokens/phone",
        ip: ip(r),
        cc: ["ID", "PK", "NG", "VN", "EG"][Math.floor(r() * 5)],
        ua: "okhttp/3.9",
        status: 201,
        ms: 40 + Math.floor(r() * 40),
        flag: "sms",
      };
    } else if (roll < 0.58) {
      row = {
        time,
        method: "GET",
        path: "/",
        ip: ip(r),
        cc: CC[Math.floor(r() * CC.length)],
        ua: "-",
        status: 200,
        ms: 2 + Math.floor(r() * 4),
        flag: "flood",
      };
    } else {
      const g = GOOD[Math.floor(r() * GOOD.length)];
      row = {
        time,
        method: g[0],
        path: g[1],
        ip: ip(r),
        cc: CC[Math.floor(r() * CC.length)],
        ua: UAS_GOOD[Math.floor(r() * UAS_GOOD.length)],
        status: g[2],
        ms: 8 + Math.floor(r() * 90),
        flag: "none",
      };
    }
    rows.push(row);
  }
  return rows;
};
