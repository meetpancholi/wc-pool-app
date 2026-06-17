// Service worker: shows a notification when a push arrives.
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data.json(); } catch { d = { title: "World Cup Pool", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(
    self.registration.showNotification(d.title || "World Cup Pool", {
      body: d.body || "",
      tag: d.tag || "wc-pool",
      data: { url: d.url || "/" },
      vibrate: [80, 40, 80],
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(event.notification.data && event.notification.data.url || "/");
    })
  );
});
