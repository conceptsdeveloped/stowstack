import { useState, useEffect, useCallback, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  // ─── Install prompt ───────────────────────────────────

  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsInstalled(
      mq.matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    const onChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mq.addEventListener("change", onChange);

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      setCanInstall(false);
      setIsInstalled(true);
      deferredPrompt.current = null;
    };
    window.addEventListener("appinstalled", installed);

    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      deferredPrompt.current = null;
    }
  }, []);

  // ─── Network status ───────────────────────────────────

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ─── Push notification subscription ───────────────────

  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>("default");
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setPushSupported(supported);
    if (supported) {
      setPushPermission(Notification.permission);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribeToPush = useCallback(
    async (adminKey: string) => {
      if (!pushSupported) return false;
      setPushLoading(true);

      try {
        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        if (permission !== "granted") {
          setPushLoading(false);
          return false;
        }

        const keyRes = await fetch("/api/push-vapid-key");
        const { publicKey } = await keyRes.json();
        if (!publicKey) {
          setPushLoading(false);
          return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const subJson = subscription.toJSON();
        const res = await fetch("/api/push-subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({
            subscription: {
              endpoint: subJson.endpoint,
              keys: {
                p256dh: subJson.keys?.p256dh,
                auth: subJson.keys?.auth,
              },
            },
          }),
        });

        if (res.ok) {
          setPushSubscribed(true);
          setPushLoading(false);
          return true;
        }
      } catch (err) {
        console.error("[PWA] Push subscription failed:", err);
      }

      setPushLoading(false);
      return false;
    },
    [pushSupported],
  );

  const unsubscribeFromPush = useCallback(async (adminKey: string) => {
    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setPushLoading(false);
        return;
      }

      await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      setPushSubscribed(false);
    } catch (err) {
      console.error("[PWA] Push unsubscribe failed:", err);
    }
    setPushLoading(false);
  }, []);

  const sendTestPush = useCallback(async (adminKey: string) => {
    try {
      await fetch("/api/push-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          title: "Test Notification",
          body: "Push notifications are working! You will receive alerts for new leads.",
          url: "/admin",
          tag: "test",
        }),
      });
    } catch (err) {
      console.error("[PWA] Test push failed:", err);
    }
  }, []);

  return {
    needRefresh,
    dismissRefresh: () => setNeedRefresh(false),
    updateServiceWorker,
    canInstall,
    isInstalled,
    install,
    isOnline,
    pushSupported,
    pushSubscribed,
    pushPermission,
    pushLoading,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPush,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
