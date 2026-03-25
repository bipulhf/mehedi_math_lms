importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

fetch("/api/v1/public/firebase-config")
  .then((response) => response.json())
  .then((envelope) => {
    const config = envelope && envelope.data;

    if (!config || !config.apiKey) {
      return;
    }

    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(() => {
      /* handled by OS */
    });
  })
  .catch(() => {
    /* Firebase not configured */
  });
