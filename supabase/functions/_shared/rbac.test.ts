import assert from "node:assert/strict";
import { roleAllowed, type Role } from "./roles.ts";

// 7.9: mekanisme otorisasi role per endpoint (PRD 22.5).
Deno.test("rbac: tanpa roles -> semua role diizinkan", () => {
  for (const role of ["SUPER_ADMIN", "KOMANDAN", "PERSONEL", "PERSIT"] as Role[]) {
    assert.equal(roleAllowed(undefined, role), true);
  }
});

Deno.test("rbac: role diizinkan hanya jika terdaftar", () => {
  const roles: Role[] = ["SUPER_ADMIN", "KOMANDAN"];
  assert.equal(roleAllowed(roles, "SUPER_ADMIN"), true);
  assert.equal(roleAllowed(roles, "KOMANDAN"), true);
  assert.equal(roleAllowed(roles, "PERSONEL"), false);
  assert.equal(roleAllowed(roles, "PERSIT"), false);
});

Deno.test("rbac: PERSONEL hanya untuk endpoint personel", () => {
  const roles: Role[] = ["PERSONEL"];
  assert.equal(roleAllowed(roles, "PERSONEL"), true);
  assert.equal(roleAllowed(roles, "SUPER_ADMIN"), false);
});
