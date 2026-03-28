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

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        const existing = await reg.pushManager.getSubscription();
        setIsSubscribed(!!existing);
      })
      .catch((err) => console.error('SW registration failed:', err));
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

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription }),
      });

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
