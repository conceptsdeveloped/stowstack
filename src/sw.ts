/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { BackgroundSyncPlugin } from "workbox-background-sync";

declare const self: ServiceWorkerGlobalScope;

// ─── Precaching ──────────────────────────────────────────

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ─── Offline fallback for navigations ────────────────────

const navigationHandler = new NetworkFirst({
  cacheName: "pages",
  networkTimeoutSeconds: 5,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
});

const navRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/api\//],
});
registerRoute(navRoute);

// ─── Google Fonts — cache first ──────────────────────────

registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
);

// ─── API calls — network first ───────────────────────────

registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/api/") &&
    !url.pathname.includes("push-") &&
    !url.pathname.includes("audit-form") &&
    !url.pathname.includes("consumer-lead"),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
    ],
  }),
);

// ─── Background sync for form submissions ────────────────
// Queues POST requests when offline, replays when back online

const auditFormSync = new BackgroundSyncPlugin("audit-form-queue", {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ url }) => url.pathname === "/api/audit-form",
  new NetworkOnly({ plugins: [auditFormSync] }),
  "POST",
);

const consumerLeadSync = new BackgroundSyncPlugin("consumer-lead-queue", {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ url }) => url.pathname === "/api/consumer-lead",
  new NetworkOnly({ plugins: [consumerLeadSync] }),
  "POST",
);

// ─── Images — cache first ────────────────────────────────

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

// ─── Push notification handlers ──────────────────────────

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "StowStack";

  // Contextual actions based on notification type
  let actions: Array<{ action: string; title: string }> = [
    { action: "view", title: "View" },
    { action: "dismiss", title: "Dismiss" },
  ];

  if (data.tag === "new-lead" || data.tag === "consumer-lead") {
    actions = [
      { action: "view", title: "View Lead" },
      { action: "call", title: "Call Back" },
    ];
  }

  const options = {
    body: data.body || "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: data.tag || "default",
    renotify: data.tag === "new-lead",
    data: {
      url: data.url || "/",
      phone: data.phone || null,
      leadId: data.leadId || null,
    },
    actions,
    vibrate: [200, 100, 200],
    requireInteraction: data.tag === "new-lead",
  } as NotificationOptions;

  event.waitUntil(self.registration.showNotification(title, options));

  // Update app badge count
  if ("setAppBadge" in navigator) {
    (navigator as unknown as { setAppBadge: (n: number) => Promise<void> })
      .setAppBadge(data.badgeCount || 1)
      .catch(() => {});
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  // "Call Back" — open phone dialer directly
  if (event.action === "call" && event.notification.data?.phone) {
    event.waitUntil(self.clients.openWindow(`tel:${event.notification.data.phone}`));
    return;
  }

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if ("navigate" in client) (client as WindowClient).navigate(url);
            return;
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});

// Clear badge when notification dismissed
self.addEventListener("notificationclose", () => {
  if ("clearAppBadge" in navigator) {
    (navigator as unknown as { clearAppBadge: () => Promise<void> })
      .clearAppBadge()
      .catch(() => {});
  }
});
