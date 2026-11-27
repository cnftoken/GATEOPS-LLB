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

  const createdId = (created.json as { data?: { id?: string } }).data?.id;
  assert.ok(createdId, "id personel tidak ada");

  // S-02 username duplikat & NRP tidak dapat diubah
  const dup = await apiFetch(
    "personnel",
    "POST",
    {
      nama: "Duplikat",
      nrp: `78${Date.now().toString().slice(-6)}`,
      pangkat: "Sertu",
      jabatan: "Anggota",
      username: pUser,
      password: pPass,
    },
    saToken,
  );
  assert.ok(dup.status >= 400, "username duplikat harus ditolak");
  const patched = await apiFetch(
    `personnel/${createdId}`,
    "PATCH",
    { nama: "Personel Baru", nrp: "999999", pangkat: "Sertu", jabatan: "Anggota", username: pUser },
    saToken,
  );
  assert.ok(patched.status === 200, `ubah personel gagal: ${patched.status}`);
  const detail = await apiFetch(`personnel/${createdId}`, "GET", undefined, saToken);
  const detailNrp = (detail.json as { data?: { nrp?: string } }).data?.nrp;
  assert.notEqual(detailNrp, "999999", "NRP personel tidak boleh berubah");

  // S-05 QR invalid tidak mengubah status
  const bad = await apiFetch("transactions/scan", "POST", { token: "tidak-valid" }, pToken);
  assert.equal(bad.status, 422, "QR invalid harus 422");
  assert.equal(
    (bad.json as { error?: { code?: string } }).error?.code,
    "INVALID_QR",
    "kode error QR invalid",
  );

  // S-05 gate NONAKTIF ditolak
  const gate2 = await apiFetch(
    "gates",
    "POST",
    { name: "Gate Nonaktif", location: "Lokasi", status: "AKTIF" },
    saToken,
  );
  const gate2Id = (gate2.json as { data?: { id?: string } }).data?.id;
  const gate2Token = (gate2.json as { data?: { token?: string } }).data?.token;
  assert.ok(gate2Id && gate2Token, "gate kedua gagal dibuat");
  await apiFetch(
    `gates/${gate2Id}`,
    "PATCH",
    { name: "Gate Nonaktif", location: "Lokasi", status: "NONAKTIF" },
    saToken,
  );
  const inactive = await apiFetch(
    "transactions/scan",
    "POST",
    { token: gate2Token, tujuan: "Rapat", keperluan: "Dinas" },
    pToken,
  );
  assert.equal(inactive.status, 409, "gate NONAKTIF harus ditolak");

  // S-12 GPS AKTIF setelah keluar
  const out2 = await apiFetch(
    "transactions/scan",
    "POST",
    { token: gateToken, tujuan: "Rapat", keperluan: "Dinas" },
    pToken,
  );
  assert.equal(out2.status, 200, `keluar kedua gagal: ${out2.status}`);
  const gps = await apiFetch(
    "gps/report",
    "POST",
    { permissionState: "GRANTED", latitude: -6.2, longitude: 106.8 },
    pToken,
  );
  assert.equal(gps.status, 200, `laporan GPS gagal: ${gps.status}`);
  const komando = await apiFetch("dashboard/komando", "GET", undefined, saToken);
  const outside =
    (komando.json as { data?: { outside?: Array<{ nrp?: string; gpsStatus?: string }> } }).data
      ?.outside ?? [];
  const row = outside.find((r) => r.nrp === detailNrp);
  assert.ok(row, "personel tidak ada di daftar DI LUAR");
  assert.equal(row?.gpsStatus, "AKTIF", "status GPS harus AKTIF setelah laporan");

  // S-16 laporan melebihi 31 hari ditolak
  const tooWide = await apiFetch(
    "activities/report?dateFrom=2026-01-01&dateTo=2026-03-01",
    "GET",
    undefined,
    saToken,
  );
  assert.equal(tooWide.status, 400, "periode laporan > 31 hari harus ditolak");

  // S-17 Persit tidak boleh membaca GPS
  const persitUser = `ps${Date.now().toString().slice(-6)}`;
  const persitPass = "Passw0rd!23";
  const reg = await apiFetch("persit/register", "POST", {
    nrp: detailNrp as string,
    nama: "Persit Integrasi",
    username: persitUser,
    password: persitPass,
  });
  assert.ok(reg.status === 200 || reg.status === 201, `registrasi persit gagal: ${reg.status}`);
  const reqs = await apiFetch("persit/requests", "GET", undefined, saToken);
  const reqRow = ((reqs.json as { data?: Array<{ persit_account_id?: string }> }).data ?? []).find(
    (r) => r.persit_account_id === (reg.json as { data?: { id?: string } }).data?.id,
  );
  assert.ok(reqRow, "permintaan persit tidak ditemukan");
  const persitId = reqRow.persit_account_id as string;
  const approve = await apiFetch(`persit/${persitId}/approve`, "POST", {}, saToken);
  assert.equal(approve.status, 200, `persetujuan persit gagal: ${approve.status}`);
  const persitLogin = await apiFetch("auth/login", "POST", {
    username: persitUser,
    password: persitPass,
  });
  const persitToken = tokenOf(persitLogin.json);
  const persitGps = await apiFetch("gps", "GET", undefined, persitToken);
  assert.equal(persitGps.status, 403, "persit harus 403 pada gps");

  // S-14 reset password sementara & wajib ganti
  const reset = await apiFetch(`accounts/${createdId}/reset-password`, "POST", {}, saToken);
  const temp = (reset.json as { data?: { temporaryPassword?: string } }).data?.temporaryPassword;
  assert.ok(temp, "password sementara tidak dikembalikan");
  const tempLogin = await apiFetch("auth/login", "POST", { username: pUser, password: temp });
  const tempToken = tokenOf(tempLogin.json);
  const tempMe = await apiFetch("auth/me", "GET", undefined, tempToken);
  assert.equal(
    (tempMe.json as { data?: { mustChangePassword?: boolean } }).data?.mustChangePassword,
    true,
    "password sementara harus memaksa ganti",
  );

  // S-15 lockout 5 kegagalan
  const lockUser = `lk${Date.now().toString().slice(-6)}`;
  const lockPass = "Passw0rd!23";
  await apiFetch(
    "personnel",
    "POST",
    {
      nama: "Lock Test",
      nrp: `79${Date.now().toString().slice(-6)}`,
      pangkat: "Sertu",
      jabatan: "Anggota",
      username: lockUser,
      password: lockPass,
    },
    saToken,
  );
  for (let i = 0; i < 5; i++) {
    await apiFetch("auth/login", "POST", { username: lockUser, password: "salah" });
  }
  const locked = await apiFetch("auth/login", "POST", { username: lockUser, password: lockPass });
  assert.equal(locked.status, 429, "lockout harus aktif setelah 5 kegagalan");

  console.log(
    "PASS: integration (bootstrap, RBAC, personel, gate, GPS, laporan, persit, reset, lockout)",
  );
}

main().catch((err: unknown) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
