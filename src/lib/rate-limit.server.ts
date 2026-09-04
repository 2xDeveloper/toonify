import { getCookie, getRequestIP, setCookie } from "@tanstack/react-start/server";
import { WEEKLY_LIMIT, type QuotaView } from "./quota";

const DEVICE_COOKIE = "toonify_did";
const QUOTA_COOKIE = "toonify_q";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Bucket = { week: string; n: number };

const ipBuckets = (globalThis as typeof globalThis & { __toonifyIp?: Map<string, Bucket> })
  .__toonifyIp ??= new Map<string, Bucket>();

function weekKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

async function hmacKey() {
  const secret = process.env.OPENAI_API_KEY?.trim() || "toonify-quota";
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(value: string): Promise<string> {
  const buf = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`toonify:${ip}`));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function visitorIp(): string {
  return getRequestIP({ xForwardedFor: true }) || "local";
}

async function readDeviceId(): Promise<string> {
  const existing = getCookie(DEVICE_COOKIE)?.trim();
  if (existing && /^[a-z0-9-]{8,80}$/i.test(existing)) return existing;

  const id = crypto.randomUUID();
  setCookie(DEVICE_COOKIE, id, cookieOpts(60 * 60 * 24 * 400));
  return id;
}

async function readDeviceBucket(deviceId: string, week: string): Promise<Bucket> {
  const raw = getCookie(QUOTA_COOKIE);
  if (!raw) return { week, n: 0 };

  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return { week, n: 0 };

  const expected = await sign(payload);
  if (expected !== mac) return { week, n: 0 };

  const [savedWeek, savedId, savedN] = payload.split(":");
  if (savedId !== deviceId || savedWeek !== week) return { week, n: 0 };

  const n = Number(savedN);
  return { week, n: Number.isFinite(n) ? Math.max(0, n) : 0 };
}

async function writeDeviceBucket(deviceId: string, bucket: Bucket) {
  const payload = `${bucket.week}:${deviceId}:${bucket.n}`;
  const mac = await sign(payload);
  setCookie(QUOTA_COOKIE, `${payload}.${mac}`, cookieOpts(Math.ceil(WEEK_MS / 1000)));
}

function readIpBucket(ipKey: string, week: string): Bucket {
  const saved = ipBuckets.get(ipKey);
  if (!saved || saved.week !== week) return { week, n: 0 };
  return saved;
}

export class QuotaError extends Error {
  constructor() {
    super("You've used this week's 3 free cartoons. Come back next week.");
    this.name = "QuotaError";
  }
}

export async function peekQuota(): Promise<QuotaView> {
  const week = weekKey();
  const deviceId = await readDeviceId();
  const ipKey = await hashIp(visitorIp());
  const used = Math.max((await readDeviceBucket(deviceId, week)).n, readIpBucket(ipKey, week).n);
  return {
    used,
    remaining: Math.max(0, WEEKLY_LIMIT - used),
    limit: WEEKLY_LIMIT,
  };
}

export async function assertCanGenerate(): Promise<void> {
  const quota = await peekQuota();
  if (quota.remaining <= 0) throw new QuotaError();
}

export async function recordGenerate(): Promise<QuotaView> {
  const week = weekKey();
  const deviceId = await readDeviceId();
  const ipKey = await hashIp(visitorIp());

  const device = await readDeviceBucket(deviceId, week);
  const ip = readIpBucket(ipKey, week);
  device.n += 1;
  ip.n += 1;
  ipBuckets.set(ipKey, ip);
  await writeDeviceBucket(deviceId, device);

  const used = Math.max(device.n, ip.n);
  return {
    used,
    remaining: Math.max(0, WEEKLY_LIMIT - used),
    limit: WEEKLY_LIMIT,
  };
}
