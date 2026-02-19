import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("landing page loads", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    // Landing page should have some content
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("login page loads", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    // Should render some form element or auth content
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("register page loads", async ({ page }) => {
    const response = await page.goto("/register");
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("unauthenticated /playbooks redirects to login", async ({ page }) => {
    const response = await page.goto("/playbooks");
    // Should redirect to login (middleware redirects unauthenticated users)
    expect(page.url()).toContain("/login");
  });

  test("API health: GET /api/playbooks returns 401 when unauthenticated", async ({
    request,
  }) => {
    const response = await request.get("/api/playbooks");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("API health: POST /api/ai/generate-strategy returns 401 when unauthenticated", async ({
    request,
  }) => {
    const response = await request.post("/api/ai/generate-strategy", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("static assets load without 404", async ({ page }) => {
    const failedRequests: string[] = [];

    page.on("response", (response) => {
      const url = response.url();
      // Check CSS and JS bundles
      if (
        (url.includes("/_next/") || url.includes("/static/")) &&
        response.status() === 404
      ) {
        failedRequests.push(url);
      }
    });

    await page.goto("/");
    // Wait for page to fully load
    await page.waitForLoadState("networkidle");

    expect(failedRequests).toEqual([]);
  });
});
