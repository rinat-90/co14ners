/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// ── Push event ────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string; icon?: string };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "co14ners", body: event.data.text() };
  }

  const title = payload.title ?? "co14ners";
  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon ?? "/icon.svg",
    badge: "/icon.svg",
    data: { url: payload.url ?? "/" },
    tag: "co14ners-notification",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string }).url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(url);
        } else {
          self.clients.openWindow(url);
        }
      })
  );
});

export {};
