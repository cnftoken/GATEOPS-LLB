import assert from "node:assert/strict";
import { computeGpsStatus, type GpsRow } from "./gps.ts";

const now = Date.parse("2026-11-27T10:00:00Z");
const granted: GpsRow = {
  latitude: -6.9,
  longitude: 110.4,
  permission_state: "GRANTED",
  gps_updated_at: new Date(now).toISOString(),
};

Deno.test("gps: null atau latitude null -> TIDAK_AKTIF", () => {
  assert.equal(computeGpsStatus(null, now), "TIDAK_AKTIF");
  assert.equal(computeGpsStatus({ ...granted, latitude: null }, now), "TIDAK_AKTIF");
});

Deno.test("gps: DENIED -> OFFLINE", () => {
  assert.equal(computeGpsStatus({ ...granted, permission_state: "DENIED" }, now), "OFFLINE");
});

Deno.test("gps: <= 60 detik (termasuk tepat 60) -> AKTIF", () => {
  assert.equal(computeGpsStatus(granted, now + 60_000), "AKTIF");
  assert.equal(computeGpsStatus(granted, now + 59_000), "AKTIF");
});

Deno.test("gps: > 60 detik -> OFFLINE", () => {
  assert.equal(computeGpsStatus(granted, now + 60_001), "OFFLINE");
});
