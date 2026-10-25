import { test, expect } from "@playwright/test";
test("manual prices, new-only total, budget and theme survive reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Изменить: Процессор, хочу", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить вручную", exact: true })
    .click();
  await page.getByLabel("Модель", { exact: true }).fill("Мой новый Ryzen");
  await page.getByLabel("Цена, ֏", { exact: true }).fill("120000");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page
    .getByRole("button", { name: "Изменить: Процессор, сейчас", exact: true })
    .click();
  await page.getByLabel("Цена, ֏", { exact: true }).fill("9999999");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.locator(".total-price")).toHaveText(/120\s*000/);
  await page
    .getByRole("button", { name: "Изменить бюджет", exact: true })
    .click();
  await page.getByLabel("Бюджет, ֏", { exact: true }).fill("200000");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.getByRole("button", { name: "Включить светлую тему" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".total-price")).toHaveText(/120\s*000/);
  await expect(page.locator(".budget-limit")).toContainText(/200\s*000/);
  await expect(
    page.getByRole("button", {
      name: "Изменить: Процессор, хочу",
      exact: true,
    }),
  ).toContainText("Мой новый Ryzen");
  expect(errors).toEqual([]);
});
test("mobile PC and phone stay within viewport and both sides work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".mobile-side-switch")).toBeVisible();
  await page
    .locator(".mobile-side-switch")
    .getByRole("button", { name: "Сейчас", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Изменить: Процессор, сейчас",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Телефон", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Изменить: Телефон, сейчас",
      exact: true,
    }),
  ).toContainText("iPhone 13");
  await page
    .locator(".mobile-side-switch")
    .getByRole("button", { name: "Хочу", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Изменить: Телефон, хочу", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".local/mobile-phone.png", fullPage: true });
});
test("export and import add copies without overwriting; invalid backup is rejected", async ({
  page,
}) => {
  await page.goto("/");
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать резервную копию", exact: true })
    .click();
  const download = await dl,
    path = await download.path();
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.locator(".toast")).toContainText(
    "Импортировано проектов: 2",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("next-rig.workspace.v1")!).projects
          .length,
    ),
  ).toBe(4);
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1}'),
    });
  await expect(page.locator(".toast")).toContainText("файл повреждён");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("next-rig.workspace.v1")!).projects
          .length,
    ),
  ).toBe(4);
});
test("catalog selection uses shop offer and keeps old price on failure", async ({
  page,
}) => {
  await page.route("**/api/catalog?category=cpu", (route) =>
    route.fulfill({
      json: {
        offers: [
          {
            id: "https://www.mtech.am/en_us/products/test",
            url: "https://www.mtech.am/en_us/products/test",
            category: "cpu",
            name: "Shop Ryzen",
            price: 100000,
            currency: "AMD",
            checkedAt: new Date().toISOString(),
            store: "Mtech",
            availability: "unknown",
          },
        ],
        checkedAt: new Date().toISOString(),
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Изменить: Процессор, хочу", exact: true })
    .click();
  await page.getByRole("button", { name: "Выбрать", exact: true }).click();
  await expect(page.locator(".total-price")).toHaveText(/100\s*000/);
  await page.unroute("**/api/catalog?category=cpu");
  await page.route("**/api/catalog?category=cpu", (route) =>
    route.fulfill({ status: 502, json: { offers: [], error: "Unavailable" } }),
  );
  await page
    .getByRole("button", { name: "Обновить цены", exact: true })
    .click();
  await expect(page.locator(".refresh-message")).toContainText(
    "Не удалось проверить: 1",
  );
  await expect(page.locator(".total-price")).toHaveText(/100\s*000/);
});
test("project creation starts empty and survives reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Новый проект", exact: true }).click();
  await page.getByLabel("Название", { exact: true }).fill("Мой настоящий ПК");
  await page
    .getByRole("button", { name: "Создать проект", exact: true })
    .click();
  await expect(page.locator(".project-title")).toHaveText("Мой настоящий ПК");
  await expect(page.locator(".part-name")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".project-title")).toHaveText("Мой настоящий ПК");
});
