// Integration & RBAC check (To-dos 7.3/7.9, S-03/04/05/06/17).
// Menjalankan alur nyata terhadap Edge Functions lokal. Mengembalikan keluar != 0 bila gagal.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { apiFetch } from "./_lib";

function tokenOf(json: unknown): string {
  const t = (json as { data?: { token?: string } }).data?.token;
  assert.ok(t, "token tidak ada pada respons");
  return t as string;
}

async function main(): Promise<void> {
  let saUser: string;
  let saPass: string;
  if (existsSync(".local/setup.json")) {
    const setup = JSON.parse(readFileSync(".local/setup.json", "utf8")) as {
      saUsername?: string;
      saPassword?: string;
    };
    assert.ok(setup.saUsername && setup.saPassword, "kredensial setup tidak lengkap");
    saUser = setup.saUsername as string;
    saPass = setup.saPassword as string;
    await apiFetch("accounts/bootstrap", "POST", {
      username: saUser,
      password: saPass,
      nama: "Super Admin",
    });
  } else {
    saUser = `sa${Date.now().toString().slice(-6)}`;
    saPass = "Passw0rd!23";
    const boot = await apiFetch("accounts/bootstrap", "POST", {
      username: saUser,
      password: saPass,
      nama: "Super Admin",
    });
    assert.ok(boot.status === 200 || boot.status === 201, `bootstrap gagal: ${boot.status}`);
  }

  const saLogin = await apiFetch("auth/login", "POST", { username: saUser, password: saPass });
  const saToken = tokenOf(saLogin.json);

  // RBAC: tanpa sesi -> 401
  const noAuth = await apiFetch("accounts", "GET");
  assert.equal(noAuth.status, 401, "tanpa sesi harus 401");

  // SA boleh akses accounts
  const acc = await apiFetch("accounts", "GET", undefined, saToken);
  assert.equal(acc.status, 200, "SA harus boleh akses accounts");

  // Buat personel
  const pUser = `p${Date.now().toString().slice(-6)}`;
  const pPass = "Passw0rd!23";
  const created = await apiFetch(
    "personnel",
    "POST",
    {
      nama: "Personel Integrasi",
      nrp: `77${Date.now().toString().slice(-6)}`,
      pangkat: "Sertu",
      jabatan: "Anggota",
      username: pUser,
      password: pPass,
    },
    saToken,
  );
  assert.ok(
    created.status === 200 || created.status === 201,
    `buat personel gagal: ${created.status}`,
  );

  const pLogin = await apiFetch("auth/login", "POST", { username: pUser, password: pPass });
  const pToken = tokenOf(pLogin.json);

  // RBAC: personel tidak boleh accounts & gps
  const pAcc = await apiFetch("accounts", "GET", undefined, pToken);
  assert.equal(pAcc.status, 403, "personel harus 403 pada accounts");
  const pGps = await apiFetch("gps", "GET", undefined, pToken);
  assert.equal(pGps.status, 403, "personel harus 403 pada gps");

  // Personel boleh activities/mine
  const mine = await apiFetch("activities/mine", "GET", undefined, pToken);
  assert.equal(mine.status, 200, "personel harus boleh activities/mine");

  // Buat gate (SA)
  const gate = await apiFetch(
    "gates",
    "POST",
    { name: "Gate Integrasi", location: "Lokasi", status: "AKTIF" },
    saToken,
  );
  const gateToken = (gate.json as { data?: { token?: string } }).data?.token;
  assert.ok(gateToken, "token gate tidak ada");

  // S-04 keluar
  const out = await apiFetch(
    "transactions/scan",
    "POST",
    { token: gateToken, tujuan: "Rapat", keperluan: "Dinas" },
    pToken,
  );
  assert.equal(out.status, 200, `keluar gagal: ${out.status}`);
  assert.equal((out.json as { data?: { presence?: string } }).data?.presence, "DI LUAR");

  // S-06 kembali
  const back = await apiFetch("transactions/scan", "POST", { token: gateToken }, pToken);
  assert.equal(back.status, 200, `kembali gagal: ${back.status}`);
  assert.equal((back.json as { data?: { presence?: string } }).data?.presence, "DI DALAM");

  console.log("PASS: integration (bootstrap, RBAC 401/403, mine 200, keluar/kembali)");
}

main().catch((err: unknown) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
