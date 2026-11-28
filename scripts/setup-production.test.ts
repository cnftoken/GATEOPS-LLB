import assert from "node:assert/strict";
import test from "node:test";
import { createSupabaseLinkArgs, runSupabaseLink } from "./setup-production";

test("FR-55/S-19: supabase link menerima project ref dan password database", () => {
  assert.deepEqual(createSupabaseLinkArgs("gklvpicqdbdhojtbijew", "db-password"), [
    "link",
    "--project-ref",
    "gklvpicqdbdhojtbijew",
    "--password",
    "db-password",
  ]);
});

test("FR-55/S-19: menolak project ref kosong", () => {
  assert.throws(() => createSupabaseLinkArgs("", "db-password"), /project ref/i);
});

test("FR-55/S-19: menolak password database kosong", () => {
  assert.throws(() => createSupabaseLinkArgs("gklvpicqdbdhojtbijew", "  "), /password database/i);
});

test("FR-55/S-20: menjalankan CLI tanpa shell dan tidak membocorkan error yang memuat password", () => {
  let invoked = false;
  assert.throws(
    () =>
      runSupabaseLink("gklvpicqdbdhojtbijew", "secret-db-password", (file, args, options) => {
        invoked = true;
        assert.equal(file, "supabase");
        assert.deepEqual(args, [
          "link",
          "--project-ref",
          "gklvpicqdbdhojtbijew",
          "--password",
          "secret-db-password",
        ]);
        assert.equal(options.shell, false);
        throw new Error("secret-db-password appeared in stderr");
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /gagal menghubungkan project supabase/i);
      assert.doesNotMatch(error.message, /secret-db-password/);
      return true;
    },
  );
  assert.equal(invoked, true);
});
