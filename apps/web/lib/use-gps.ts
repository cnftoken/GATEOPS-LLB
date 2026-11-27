"use client";

import { useEffect, useRef } from "react";
import { apiMutate } from "./api";

// Klien GPS Personel (PRD 11). Aktif hanya saat DI LUAR & halaman terbuka.
// Interval 30 detik, tanpa antrean/retry, kirim segera saat mulai/izin berubah/online.
export function useGpsTracking(enabled: boolean): void {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let permission: PermissionStatus | null = null;
    let apply: (() => void) | null = null;

    const sendGranted = () => {
      if (!navigator.geolocation) {
        apiMutate("gps/report", "POST", { permissionState: "DENIED" }).catch(() => {});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          apiMutate("gps/report", "POST", {
            permissionState: "GRANTED",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }).catch(() => {});
        },
        (err) => {
          // Izin dicabut saat request: kirim DENIED segera (PRD 11.3).
          if (err.code === err.PERMISSION_DENIED) sendDenied();
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );
    };

    const sendDenied = () => {
      apiMutate("gps/report", "POST", { permissionState: "DENIED" }).catch(() => {});
    };

    const startInterval = () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(sendGranted, 30_000);
    };

    const onOnline = () => sendGranted();
    window.addEventListener("online", onOnline);

    void (async () => {
      if (!navigator.geolocation) {
        sendDenied();
        startInterval();
        return;
      }
      try {
        permission = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        apply = () => {
          if (permission?.state === "granted") sendGranted();
          else if (permission?.state === "denied") sendDenied();
          startInterval();
        };
        permission.addEventListener("change", apply);
        apply();
      } catch {
        sendGranted();
        startInterval();
      }
    })();

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      window.removeEventListener("online", onOnline);
      if (permission && apply) permission.removeEventListener("change", apply);
    };
  }, [enabled]);
}
