import assert from "node:assert/strict";
import test from "node:test";
import { createSupabaseLinkInvocation, runSupabaseLink } from "./setup-production";

test("FR-55/S-19: password database opsional dan tidak diteruskan sebagai argumen", () => {
  assert.deepEqual(createSupabaseLinkInvocation("gklvpicqdbdhojtbijew"), {
    file: "supabase",
    args: ["link", "--project-ref", "gklvpicqdbdhojtbijew"],
    options: { stdio: "inherit", shell: false },
  });
});

test("FR-55/S-19: project ref kosong ditolak", () => {
  assert.throws(() => createSupabaseLinkInvocation(" "), /project ref/i);
});

test("FR-55/S-20: CLI dijalankan interaktif agar pengguna dapat memasukkan atau mengosongkan password", () => {
  let called = false;
  runSupabaseLink("gklvpicqdbdhojtbijew", (file, args, options) => {
    called = true;
    assert.equal(file, "supabase");
    assert.deepEqual(args, ["link", "--project-ref", "gklvpicqdbdhojtbijew"]);
    assert.deepEqual(options, { stdio: "inherit", shell: false });
  });
  assert.equal(called, true);
});

test("FR-55/S-20: kegagalan CLI tidak menampilkan detail yang berpotensi sensitif", () => {
  assert.throws(
    () =>
      runSupabaseLink("gklvpicqdbdhojtbijew", () => {
        throw new Error("sensitive database password");
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /gagal menghubungkan project supabase/i);
      assert.doesNotMatch(error.message, /sensitive database password/i);
      return true;
    },
  );
});
