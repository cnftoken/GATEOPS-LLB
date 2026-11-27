// Data demo (PRD 25.7). Hanya target local. Kredensial & QR ke .local/ (git-ignored).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import { apiFetch, log, parseTarget } from "./_lib";

function randomPassword(len = 12): string {
  return Array.from(
    { length: len },
    () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"[Math.floor(Math.random() * 54)],
  ).join("");
}

function ensureLocal(argv: string[]): void {
  if (parseTarget(argv) !== "local" || !argv.includes("--target")) {
    console.error(
      "Menolak seed demo: gunakan `pnpm seed:demo -- --target local`. Demo hanya untuk local (PRD 25.7.1).",
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  ensureLocal(argv);

  mkdirSync(".local/demo-qr", { recursive: true });
  const creds: Record<string, unknown> = {};

  let saUsername = "superadmin";
  let saPassword = randomPassword();
  if (existsSync(".local/setup.json")) {
    const setup = JSON.parse(readFileSync(".local/setup.json", "utf8")) as {
      saUsername?: string;
      saPassword?: string;
    };
    if (setup.saUsername && setup.saPassword) {
      saUsername = setup.saUsername;
      saPassword = setup.saPassword;
    }
  }
  const boot = await apiFetch("accounts/bootstrap", "POST", {
    username: saUsername,
    password: saPassword,
    nama: "Super Admin",
  });
  if (boot.status !== 200 && boot.status !== 201) {
    log(`Bootstrap gagal (status ${boot.status}). Pastikan setup lokal dijalankan.`);
    process.exit(1);
  }
  creds.superAdmin = { username: saUsername, password: saPassword };

  const login = await apiFetch("auth/login", "POST", {
    username: saUsername,
    password: saPassword,
  });
  const token = (login.json as { data?: { token?: string } }).data?.token;
  if (!token) throw new Error("Login Super Admin gagal.");

  const komandanPassword = randomPassword();
  await apiFetch(
    "accounts",
    "POST",
    {
      role: "KOMANDAN",
      nama: "Komandan Demo",
      username: "komandan",
      password: komandanPassword,
      nrp: "1000001",
      pangkat: "Letkol",
      jabatan: "Komandan",
    },
    token,
  );
  creds.komandan = { username: "komandan", password: komandanPassword };

  const personnel: Array<{ username: string; password: string }> = [];
  for (let i = 1; i <= 5; i += 1) {
    const password = randomPassword();
    const username = `personel${i}`;
    await apiFetch(
      "personnel",
      "POST",
      {
        nama: `Personel Demo ${i}`,
        nrp: `90000${i}`,
        pangkat: "Sertu",
        jabatan: "Anggota",
        username,
        password,
      },
      token,
    );
    personnel.push({ username, password });
  }
  creds.personnel = personnel;

  for (let i = 1; i <= 2; i += 1) {
    const res = await apiFetch(
      "gates",
      "POST",
      { name: `Gate Demo ${i}`, location: `Lokasi ${i}`, status: "AKTIF" },
      token,
    );
    const gateToken = (res.json as { data?: { token?: string } }).data?.token;
    if (gateToken) {
      const png = await QRCode.toDataURL(gateToken);
      const base64 = png.split(",")[1];
      if (base64) writeFileSync(`.local/demo-qr/gate-${i}.png`, Buffer.from(base64, "base64"));
    }
  }

  writeFileSync(".local/demo-credentials.json", JSON.stringify(creds, null, 2));
  log("Seed demo selesai. Kredensial: .local/demo-credentials.json, QR: .local/demo-qr/.");
}

main().catch((err: unknown) => {
  console.error(`Seed demo gagal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
