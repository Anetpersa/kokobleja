// Uključivanje i isključivanje obaveštenja u browseru (ovaj fajl radi samo u browseru)
import { isStandalone } from "@/lib/install";

export type PushSupport = "ok" | "ios-not-installed" | "ios-too-old" | "viber" | "unsupported";

export function pushSupport(): PushSupport {
  const ua = navigator.userAgent;
  if (/Viber/i.test(ua)) return "viber";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const hasPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (ios && !isStandalone()) return "ios-not-installed";
  if (!hasPush) return ios ? "ios-too-old" : "unsupported";
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "unsupported";
  return "ok";
}

export function permission(): NotificationPermission {
  return "Notification" in window ? Notification.permission : "denied";
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registration() {
  // Service worker se prijavljuje samo u produkciji; čekamo najviše 10 sekundi
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
  ]);
}

export async function currentSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export type SubscriptionKeys = { endpoint: string; p256dh: string; auth: string };

export function toKeys(sub: PushSubscription): SubscriptionKeys | null {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

/** Pita za dozvolu i napravi pretplatu. Vraća null ako korisnik nije dozvolio. */
export async function subscribe(): Promise<PushSubscription | null> {
  const result = await Notification.requestPermission();
  if (result !== "granted") return null;
  const reg = await registration();
  if (!reg) throw new Error("no-sw");
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
}
