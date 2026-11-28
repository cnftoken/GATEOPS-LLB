import assert from "node:assert/strict";
import test from "node:test";
import { waitForLocalFunctionsHealth } from "./local-functions";

test("FR-55/S-19: setup menunggu health Edge Functions sebelum bootstrap", async () => {
  let calls = 0;
  await waitForLocalFunctionsHealth(
    async () => {
      calls += 1;
      return new Response("ok", { status: 200 });
    },
    async () => {},
    3,
  );
  assert.equal(calls, 1);
});

test("FR-55/S-19: readiness mengulang pemeriksaan sampai Edge Functions sehat", async () => {
  let calls = 0;
  await waitForLocalFunctionsHealth(
    async () => {
      calls += 1;
      return new Response(calls < 3 ? "starting" : "ok", {
        status: calls < 3 ? 503 : 200,
      });
    },
    async () => {},
    3,
  );
  assert.equal(calls, 3);
});

test("FR-55/S-19: setup berhenti dengan galat aman jika Edge Functions tidak pernah sehat", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      waitForLocalFunctionsHealth(
        async () => {
          calls += 1;
          return new Response("unavailable", { status: 503 });
        },
        async () => {},
        2,
      ),
    /Edge Functions lokal belum siap/i,
  );
  assert.equal(calls, 2);
});
