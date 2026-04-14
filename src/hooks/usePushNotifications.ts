'use client';

import { useState, useEffect, useCallback } from 'react';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: (userId: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PermissionState);

    // Register service worker and check initial subscription state.
    // Also verify against the server — if the server deleted our endpoint
    // (e.g. after a 404/410 from the push service), re-register it silently.
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        const existing = await reg.pushManager.getSubscription();
        if (!existing) {
          setIsSubscribed(false);
          return;
        }
        setIsSubscribed(true);
        // Fire-and-forget: verify server still has this endpoint; if not, re-save it.
        const storedUser = localStorage.getItem('currentUser');
        const storedUserId = storedUser ? JSON.parse(storedUser).id : null;
        const storedEndpoint = localStorage.getItem('pushEndpoint');
        // Update localStorage to match whatever pushManager reports
        localStorage.setItem('pushEndpoint', existing.endpoint);
        fetch('/api/push/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existing.endpoint, userId: storedUserId }),
        }).then(async (res) => {
          if (res.ok) {
            const { found, userId } = await res.json();
            if (!found && userId) {
              // Server lost our subscription — silently re-register.
              // Send previousEndpoint so server replaces stale slot instead of accumulating.
              const prevEndpoint = storedEndpoint !== existing.endpoint ? storedEndpoint : null;
              await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, subscription: existing.toJSON(), previousEndpoint: prevEndpoint }),
              });
            }
          }
        }).catch(() => {/* ignore network errors */});
      })
      .catch((err) => console.error('SW registration failed:', err));

    // Option B: re-check subscription state when user returns to the app.
    // iOS can silently drop the push subscription while the app is in the
    // background, so we re-read it on every visibility restore.
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        setPermission(Notification.permission as PermissionState);
        setIsSubscribed(!!existing);

        // Also heal server-side subscription loss silently
        if (existing) {
          const storedUser = localStorage.getItem('currentUser');
          const storedUserId = storedUser ? JSON.parse(storedUser).id : null;
          const storedEndpoint = localStorage.getItem('pushEndpoint');
          localStorage.setItem('pushEndpoint', existing.endpoint);
          fetch('/api/push/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: existing.endpoint, userId: storedUserId }),
          }).then(async (res) => {
            if (res.ok) {
              const { found, userId } = await res.json();
              if (!found && userId) {
                const prevEndpoint = storedEndpoint !== existing.endpoint ? storedEndpoint : null;
                await fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, subscription: existing.toJSON(), previousEndpoint: prevEndpoint }),
                });
              }
            }
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const subscribe = useCallback(async (userId: string) => {
    if (!('serviceWorker' in navigator)) return;
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission as PermissionState);
      if (permission !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Read previous endpoint for this device slot before overwriting
      const previousEndpoint = localStorage.getItem('pushEndpoint') || null;

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription, previousEndpoint }),
      });

      // Save new endpoint so next rotation can clean up this one
      localStorage.setItem('pushEndpoint', subscription.endpoint);
      setIsSubscribed(true);
    } catch (err) {
      console.error('Push subscription failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
        localStorage.removeItem('pushEndpoint');
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
