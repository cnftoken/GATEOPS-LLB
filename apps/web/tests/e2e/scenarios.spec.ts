import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test.setTimeout(120_000);

const root = resolve(process.cwd(), "../..");

function personnelCreds(): { username: string; password: string } {
  const d = JSON.parse(readFileSync(resolve(root, ".local/demo-credentials.json"), "utf8")) as {
    personnel: Array<{ username: string; password: string }>;
  };
  const p = d.personnel[0];
  return { username: p.username, password: p.password };
}

async function loginPersonnel(page: import("@playwright/test").Page): Promise<void> {
  const c = personnelCreds();
  await page.goto("/login");
  await page.fill("#username", c.username);
  await page.fill("#password", c.password);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/(beranda|komando)$/, { timeout: 40000 });
}

test("S-04 form keluar invalid tidak membuka kamera", async ({ page }) => {
  await loginPersonnel(page);
  await page.goto("/keluar-masuk/scan");
  await expect(page.getByText("Langkah 1 dari 2 · Isi form keluar")).toBeVisible({
    timeout: 40000,
  });
  const next = page.getByRole("button", { name: "Lanjut ke kamera" });
  await expect(next).toBeDisabled();
  await expect(page.locator("video")).toHaveCount(0);
});

test("S-09 sesi berakhir menghentikan akses dan kamera", async ({ page, context }) => {
  await loginPersonnel(page);
  await context.clearCookies();
  await page.goto("/keluar-masuk/scan");
  await expect(page).toHaveURL(/\/login$/, { timeout: 40000 });
  await expect(page.locator("video")).toHaveCount(0);
});

test("logout menghapus sesi dan kembali ke login", async ({ page }) => {
  test.skip(test.info().project.name === "mobile", "tombol Keluar desktop");
  await loginPersonnel(page);
  await page
    .getByRole("button", { name: "Keluar", exact: true })
    .first()
    .evaluate((el) => (el as HTMLElement).click());
  await expect(page).toHaveURL(/\/login$/, { timeout: 40000 });
});

test("S-11 keluar mengaktifkan tracking dan mengirim lokasi tiap 30 detik", async ({
  page,
  context,
  request,
}) => {
  const base = "http://localhost:3000";
  const apiBase = "http://127.0.0.1:3000";
  const origin = { Origin: apiBase };
  const demo = JSON.parse(readFileSync(resolve(root, ".local/demo-credentials.json"), "utf8")) as {
    superAdmin: { username: string; password: string };
  };
  const loginSa = await request.post(`${apiBase}/api/v1/auth/login`, {
    headers: origin,
    data: demo.superAdmin,
  });
  expect(loginSa.status()).toBe(200);

  const suffix = Date.now().toString().slice(-6);
  const username = `gps${suffix}`;
  const password = "Passw0rd!23";
  const created = await request.post(`${apiBase}/api/v1/personnel`, {
    headers: origin,
    data: {
      nama: "Personel GPS",
      nrp: `80${suffix}`,
      pangkat: "Sertu",
      jabatan: "Anggota",
      username,
      password,
    },
  });
  expect(created.status()).toBe(200);
  const gate = await request.post(`${apiBase}/api/v1/gates`, {
    headers: origin,
    data: { name: `Gate GPS ${suffix}`, location: "Lokasi", status: "AKTIF" },
  });
  expect(gate.status()).toBe(200);
  const gateBody = (await gate.json()) as { data: { token: string } };
  const token = gateBody.data.token;

  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/beranda$/, { timeout: 40000 });

  const scanStatus = await page.evaluate(async (t) => {
    const res = await fetch("/api/v1/transactions/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t, tujuan: "Rapat", keperluan: "Dinas" }),
    });
    return res.status;
  }, token);
  expect(scanStatus).toBe(200);

  await context.grantPermissions(["geolocation"], { origin: base });
  await context.setGeolocation({ latitude: -6.2, longitude: 106.8 });
  await page.clock.install({ time: new Date() });

  const first = page.waitForRequest(
    (r) => r.url().includes("/api/v1/gps/report") && r.method() === "POST",
    { timeout: 20000 },
  );
  await page.goto("/beranda");
  const firstReq = await first;
  expect(firstReq.postDataJSON()).toMatchObject({ permissionState: "GRANTED" });

  const second = page.waitForRequest(
    (r) => r.url().includes("/api/v1/gps/report") && r.method() === "POST",
    { timeout: 20000 },
  );
  await page.clock.runFor(30_000);
  await second;
});

test("S-10 koneksi putus saat scan tidak menulis transaksi dan tidak retry otomatis", async ({
  page,
}) => {
  const qr = readFileSync(resolve(root, ".local/demo-qr/gate-1.png")).toString("base64");
  const dataUrl = `data:image/png;base64,${qr}`;
  await page.addInitScript(
    ({ dataUrl: url }) => {
      navigator.mediaDevices.getUserMedia = async () => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0);
        return canvas.captureStream(10);
      };
    },
    { dataUrl },
  );

  let attempts = 0;
  await page.route("**/api/v1/transactions/scan", async (route) => {
    attempts += 1;
    await route.abort("failed");
  });

  await loginPersonnel(page);
  await page.goto("/keluar-masuk/scan");
  await page.fill("#tujuan", "Rapat");
  await page.fill("#keperluan", "Dinas");
  await page.getByRole("button", { name: "Lanjut ke kamera" }).click();

  await expect(
    page.getByText("Koneksi terputus. Periksa jaringan Anda, lalu coba lagi."),
  ).toBeVisible({ timeout: 40000 });
  await page.waitForTimeout(2500);
  expect(attempts).toBe(1);
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);

  const presence = await page.evaluate(async () => {
    const res = await fetch("/api/v1/dashboard/beranda");
    const body = (await res.json()) as { data?: { presence?: string } };
    return body.data?.presence;
  });
  expect(presence).toBe("DI DALAM");
});
