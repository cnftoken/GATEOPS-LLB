import assert from "node:assert/strict";
import test from "node:test";
import { createSupabaseLinkArgs, runSupabaseLink } from "./setup-production";

test("FR-55/S-19: supabase link hanya menerima project ref; password tetap opsional di prompt CLI", () => {
  assert.deepEqual(createSupabaseLinkArgs("gklvpicqdbdhojtbijew"), [
    "link",
    "--project-ref",
    "gklvpicqdbdhojtbijew",
  ]);
});

test("FR-55/S-19: menolak project ref kosong", () => {
  assert.throws(() => createSupabaseLinkArgs("  "), /project ref/i);
});

test("FR-55/S-20: menjalankan CLI secara interaktif agar password dapat diisi atau dilewati", () => {
  let invoked = false;
  const result = runSupabaseLink("gklvpicqdbdhojtbijew", (file, args, options) => {
    invoked = true;
    assert.equal(file, "supabase");
    assert.deepEqual(args, ["link", "--project-ref", "gklvpicqdbdhojtbijew"]);
    assert.deepEqual(options.stdio, ["inherit", "inherit", "inherit"]);
    assert.equal(options.shell, false);
    return "";
  });
  assert.equal(invoked, true);
  assert.equal(result, "");
});

test("FR-55/S-20: pesan gagal tidak menampilkan detail CLI yang berpotensi sensitif", () => {
  assert.throws(
    () =>
      runSupabaseLink("gklvpicqdbdhojtbijew", () => {
        throw new Error("database password leaked by cli");
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /gagal menghubungkan project supabase/i);
      assert.doesNotMatch(error.message, /database password leaked/i);
      return true;
    },
  );
});
