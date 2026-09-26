"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth-provider";
import { appHub } from "@/lib/signalr/app-hub";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { LOCATION_SORT, getActiveUsers } from "@/services/location";
import { getDistanceMeters } from "@/lib/location/geo";
import { useBattery } from "@/hooks/location/use-battery";
import type { LocationDto, ActiveUserDto } from "@/lib/signalr/types";
import {
  addLocation,
  clearMovingUser,
  removeLocation,
  resetLocation,
  setLocationDenied,
  setCurrentPosition,
  setLocations,
  setMovingUser,
  setMyBattery,
  setMyStatus,
  setMyVisibility,
  updateLocationBattery,
  updateLocationStatus,
  updateLocationVisibility,
  updateOtherLocation,
  LOCATION_VISIBILITY_STORAGE_KEY,
} from "@/store/slices/location-slice";

/** Dispatched by the map UI to re-request geolocation after a denial. */
export const LOCATION_RETRY_EVENT = "mori:location-retry";

const UPDATE_BATCH_INTERVAL_MS = 10000;
const MOVE_THRESHOLD_M = 50;
const JOIN_POLL_INTERVAL_MS = 1000;

const activeUserToLocation = (u: ActiveUserDto): LocationDto => ({
  id: String(u.userId),
  userId: u.userId,
  name: u.name,
  image: u.image,
  latitude: u.latitude,
  longitude: u.longitude,
  accuracy: u.accuracy,
  speed: u.speed,
  battery: u.battery,
  status: u.status,
  visibility: 4,
  updatedAt: u.updatedAt,
  moments: null,
});

/**
 * Owns geolocation watching, batched location/battery pushes and the
 * `Join` registration on the shared App hub.
 *
 * ChatSync is the single owner of the hub lifecycle — this provider only
 * subscribes to (already multi-slot) location events and invokes methods.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const myVisibility = useAppSelector((s) => s.location.visibility);

  const joinedRef = useRef(false);
  const geoReadyRef = useRef(false);
  const pendingPosition = useRef<{
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
  } | null>(null);
  const lastSentPosition = useRef<{ latitude: number; longitude: number } | null>(null);
  const movingTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const batteryLevelRef = useRef<number | null>(null);
  const pendingBatteryRef = useRef<number | null>(null);
  const pendingPositionUpdateRef = useRef<{
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
  } | null>(null);

  const handleBatteryChange = useCallback(
    (level: number) => {
      batteryLevelRef.current = level;
      pendingBatteryRef.current = level;
      dispatch(setMyBattery(level));
    },
    [dispatch],
  );

  useBattery(handleBatteryChange);

  // Persist the visibility choice so a reload keeps the last privacy tier.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LOCATION_VISIBILITY_STORAGE_KEY, String(myVisibility));
    } catch {
      // ignore storage errors
    }
  }, [myVisibility]);

  useEffect(() => {
    if (!user) return;

    let disposed = false;
    const unsubs: Array<() => void> = [];
    let watchId: number | null = null;
    const userId = user.id;
    const movingTimersMap = movingTimers.current;

    const flushUpdates = () => {
      const conn = appHub.getConnection();
      if (!conn || conn.state !== "Connected") return;
      if (pendingBatteryRef.current !== null) {
        void appHub.updateBattery(pendingBatteryRef.current);
        pendingBatteryRef.current = null;
      }
      if (pendingPositionUpdateRef.current !== null) {
        const pos = pendingPositionUpdateRef.current;
        void appHub.updateLocation(pos.latitude, pos.longitude, pos.accuracy, pos.speed);
        lastSentPosition.current = { latitude: pos.latitude, longitude: pos.longitude };
        pendingPositionUpdateRef.current = null;
      }
    };

    const tryJoin = () => {
      if (joinedRef.current || disposed) return;
      const conn = appHub.getConnection();
      if (!conn || conn.state !== "Connected") return;
      joinedRef.current = true;
      const pos = pendingPosition.current;
      appHub
        .join(
          pos
            ? {
                latitude: pos.latitude,
                longitude: pos.longitude,
                accuracy: pos.accuracy,
                speed: pos.speed,
              }
            : {},
        )
        .then(() => {
          if (pos) lastSentPosition.current = { latitude: pos.latitude, longitude: pos.longitude };
          if (batteryLevelRef.current !== null) {
            pendingBatteryRef.current = batteryLevelRef.current;
          }
        })
        .catch((err) => {
          joinedRef.current = false;
          console.error("[LocationProvider] Join error:", err);
        });
    };

    // ---- seed the map from REST (also gives us server-side distances) ----
    const seedActiveUsers = async () => {
      try {
        const res = await getActiveUsers({ take: 100, sortBy: LOCATION_SORT.Distance });
        if (!disposed) dispatch(setLocations(res.data.map(activeUserToLocation)));
      } catch (err) {
        console.error("[LocationProvider] getActiveUsers seed failed:", err);
      }
    };
    void seedActiveUsers();

    // ---- hub subscriptions (multi-slot; cleared on hub stop) ----
    unsubs.push(
      appHub.onReceiveLocations((locList) => {
        if (disposed) return;
        dispatch(setLocations(locList));
        const me = locList.find((l) => l.userId === userId);
        if (me) {
          if (me.battery != null) dispatch(setMyBattery(me.battery));
          dispatch(setMyStatus(me.status ?? null));
          dispatch(setMyVisibility(me.visibility));
        }
      }),
    );

    unsubs.push(
      appHub.onNewJoin((u, location) => {
        if (disposed || u.id === userId) return;
        dispatch(addLocation(location));
      }),
    );

    unsubs.push(
      appHub.onUserDisconnect((userId) => {
        if (disposed) return;
        dispatch(removeLocation(userId));
      }),
    );

    unsubs.push(
      appHub.onReceiveOtherMovement((location) => {
        if (disposed) return;
        dispatch(updateOtherLocation(location));
        dispatch(setMovingUser(location.userId));
        const existing = movingTimersMap.get(location.userId);
        if (existing) clearTimeout(existing);
        movingTimersMap.set(
          location.userId,
          setTimeout(() => {
            dispatch(clearMovingUser(location.userId));
            movingTimersMap.delete(location.userId);
          }, 2000),
        );
      }),
    );

    unsubs.push(
      appHub.onReceiveVisibilityUpdated((location) => {
        if (disposed) return;
        if (location.userId === userId) dispatch(setMyVisibility(location.visibility));
        dispatch(updateLocationVisibility(location));
      }),
    );

    unsubs.push(
      appHub.onReceiveBatteryUpdated((location) => {
        if (disposed) return;
        dispatch(updateLocationBattery(location));
      }),
    );

    unsubs.push(
      appHub.onReceiveStatusUpdated((location) => {
        if (disposed) return;
        if (location.userId === userId) dispatch(setMyStatus(location.status ?? null));
        dispatch(updateLocationStatus(location));
      }),
    );

    // Re-register after the socket bounces (server-side Join is per-connection).
    unsubs.push(
      appHub.onReconnected(() => {
        if (disposed) return;
        joinedRef.current = false;
        tryJoin();
        void seedActiveUsers();
      }),
    );

    // ---- Join once the socket is up (ChatSync owns start(); we only wait) ----
    const joinTimer = setInterval(tryJoin, JOIN_POLL_INTERVAL_MS);
    tryJoin();

    // ---- geolocation watch (permission vs. transient timeout) ----
    const startWatch = () => {
      if (!("geolocation" in navigator)) {
        geoReadyRef.current = true;
        tryJoin();
        return;
      }
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords;
          pendingPosition.current = { latitude, longitude, accuracy, speed: speed ?? undefined };
          dispatch(setCurrentPosition({ latitude, longitude, accuracy, speed: speed ?? undefined }));
          geoReadyRef.current = true;

          if (joinedRef.current) {
            const prev = lastSentPosition.current;
            if (!prev) {
              // Joined without coordinates — push the first fix right away.
              pendingPositionUpdateRef.current = {
                latitude,
                longitude,
                accuracy,
                speed: speed ?? undefined,
              };
            } else {
              const dist = getDistanceMeters(prev.latitude, prev.longitude, latitude, longitude);
              if (dist >= MOVE_THRESHOLD_M) {
                pendingPositionUpdateRef.current = {
                  latitude,
                  longitude,
                  accuracy,
                  speed: speed ?? undefined,
                };
              }
            }
          }
          tryJoin();
        },
        (err) => {
          // Only a hard denial flips the UI into the re-request card;
          // timeouts are transient and the watch keeps trying.
          if (err.code === err.PERMISSION_DENIED) dispatch(setLocationDenied());
          console.warn("[LocationProvider] Geolocation watch error:", err.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    };
    startWatch();

    // ---- batched pushes + manual permission retry + token rotation ----
    const flushTimer = setInterval(flushUpdates, UPDATE_BATCH_INTERVAL_MS);

    const onRetryEvent = () => startWatch();
    window.addEventListener(LOCATION_RETRY_EVENT, onRetryEvent);

    const onTokenRefreshed = () => {
      if (disposed) return;
      joinedRef.current = false;
      tryJoin();
    };
    window.addEventListener("signalr:token-refreshed", onTokenRefreshed);

    return () => {
      disposed = true;
      for (const unsub of unsubs) unsub();
      clearInterval(joinTimer);
      clearInterval(flushTimer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      movingTimersMap.forEach((timer) => clearTimeout(timer));
      movingTimersMap.clear();
      window.removeEventListener(LOCATION_RETRY_EVENT, onRetryEvent);
      window.removeEventListener("signalr:token-refreshed", onTokenRefreshed);
      joinedRef.current = false;
      geoReadyRef.current = false;
      pendingPosition.current = null;
      lastSentPosition.current = null;
      batteryLevelRef.current = null;
      pendingBatteryRef.current = null;
      pendingPositionUpdateRef.current = null;
      dispatch(resetLocation());
    };
  }, [user?.id, dispatch]);

  return <>{children}</>;
}
