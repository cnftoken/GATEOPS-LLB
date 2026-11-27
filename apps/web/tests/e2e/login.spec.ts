import { test, expect } from "@playwright/test";

// 7.5 / S-01: halaman login publik & redirect root tanpa sesi.
test("login menampilkan form dan memvalidasi field kosong", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Username dan password wajib diisi.")).toBeVisible();
});

test("root tanpa sesi dialihkan ke login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
