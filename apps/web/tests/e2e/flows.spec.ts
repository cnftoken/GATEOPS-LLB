import { test, expect } from "@playwright/test";

test.setTimeout(120_000);
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// 7.5 / S-01 / S-17: login per role dan dashboard sesuai role.
const root = resolve(process.cwd(), "../..");

function setupCreds(): { username: string; password: string } {
  const s = JSON.parse(readFileSync(resolve(root, ".local/setup.json"), "utf8"));
  return { username: s.saUsername, password: s.saPassword };
}

function personnelCreds(): { username: string; password: string } {
  const d = JSON.parse(readFileSync(resolve(root, ".local/demo-credentials.json"), "utf8"));
  const p = d.personnel[0];
  return { username: p.username, password: p.password };
}

test("Super Admin login -> dashboard komando", async ({ page }) => {
  const c = setupCreds();
  await page.goto("/login");
  await page.getByLabel("Username").fill(c.username);
  await page.getByLabel("Password").fill(c.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/komando$/, { timeout: 40000 });
  await expect(page.getByRole("heading", { name: "Dashboard Komando" })).toBeVisible({
    timeout: 40000,
  });
});

test("Personel login -> beranda", async ({ page }) => {
  const c = personnelCreds();
  await page.goto("/login");
  await page.getByLabel("Username").fill(c.username);
  await page.getByLabel("Password").fill(c.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/beranda$/, { timeout: 40000 });
  await expect(page.getByRole("heading", { name: "Beranda" })).toBeVisible({ timeout: 40000 });
});
