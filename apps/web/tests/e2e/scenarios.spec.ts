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
  await expect(page).toHaveURL(/\/beranda$/, { timeout: 40000 });
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
