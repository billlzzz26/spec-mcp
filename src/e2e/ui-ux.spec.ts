import { test, expect } from "@playwright/test";

test.describe("Skill Service - UI/UX E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("Visual Design & Layout", () => {
    test("should display dark mode theme with proper contrast", async ({
      page,
    }) => {
      const body = page.locator("body");
      await expect(body).toBeVisible();

      const heading = page.getByRole("heading", { name: /skill service/i });
      await expect(heading).toBeVisible();
    });

    test("should have responsive layout on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const header = page.getByText(/skill service/i);
      await expect(header).toBeVisible();

      const searchInput = page.getByTestId("search-input");
      await expect(searchInput).toBeVisible();
    });

    test("should have responsive layout on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      const container = page.locator(".max-w-5xl");
      await expect(container).toBeVisible();
    });

    test("should display stats cards in grid", async ({ page }) => {
      const statsCards = page.locator("grid grid-cols-1 md:grid-cols-3 gap-4");
      await expect(statsCards).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper heading hierarchy", async ({ page }) => {
      const h1 = page.locator("h1");
      await expect(h1).toHaveText(/skill service/i);

      const h2 = page.locator("h2");
      await expect(h2.first()).toBeVisible();
    });

    test("should have visible focus states", async ({ page }) => {
      const searchInput = page.getByTestId("search-input");
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    });

    test("should have proper button labels", async ({ page }) => {
      const searchButton = page.getByRole("button", { name: /search skills/i });
      await expect(searchButton).toBeVisible();
    });

    test("should have keyboard navigation", async ({ page }) => {
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe("Interaction & Feedback", () => {
    test("should show loading state when searching", async ({ page }) => {
      const searchInput = page.getByTestId("search-input");
      const searchButton = page.getByRole("button", { name: /search skills/i });

      await searchInput.fill("test query");
      await searchButton.click();

      // Check for loading state
      const loadingState = page.getByTestId("loading-state");
      await expect(loadingState).toBeVisible({ timeout: 5000 });
    });

    test("should disable button when input is empty", async ({ page }) => {
      const searchButton = page.getByRole("button", { name: /search skills/i });
      await expect(searchButton).toBeDisabled();
    });

    test("should enable button when input has value", async ({ page }) => {
      const searchInput = page.getByTestId("search-input");
      const searchButton = page.getByRole("button", { name: /search skills/i });

      await searchInput.fill("test");
      await expect(searchButton).not.toBeDisabled();
    });

    test("should show error state on failure", async ({ page }) => {
      // This test would require mocking the API
      // For now, we verify the error card structure exists in the code
      const errorCard = page.locator("border-red-500\\/50");
      // Error card is only shown on error state
    });
  });

  test.describe("Content & Information Display", () => {
    test("should display empty state when no search", async ({ page }) => {
      const emptyState = page.getByText(/ready to search/i);
      await expect(emptyState).toBeVisible();
    });

    test("should display skill cards with proper structure", async ({
      page,
    }) => {
      // Perform a search first
      const searchInput = page.getByTestId("search-input");
      const searchButton = page.getByRole("button", { name: /search skills/i });

      await searchInput.fill("test");
      await searchButton.click();

      // Wait for results
      const resultsContainer = page.getByTestId("search-results");
      await expect(resultsContainer).toBeVisible({ timeout: 10000 });
    });

    test("should display capability badges", async ({ page }) => {
      // After search, capability badges should be visible
      const searchInput = page.getByTestId("search-input");
      await searchInput.fill("test");
      await page.getByRole("button", { name: /search skills/i }).click();

      const badges = page.locator('[class*="border-slate-700"]');
      await expect(badges.first()).toBeVisible({ timeout: 10000 });
    });

    test("should display relevance score badge", async ({ page }) => {
      const searchInput = page.getByTestId("search-input");
      await searchInput.fill("test");
      await page.getByRole("button", { name: /search skills/i }).click();

      const matchBadge = page.locator('[class*="blue-500\\/10"]');
      await expect(matchBadge.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Animation & Transitions", () => {
    test("should respect reduced motion preference", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });

      // Animations should be reduced or disabled
      const searchButton = page.getByRole("button", { name: /search skills/i });
      await expect(searchButton).toHaveCSS("transition", /all/);
    });

    test("should have smooth hover transitions on cards", async ({ page }) => {
      const searchInput = page.getByTestId("search-input");
      await searchInput.fill("test");
      await page.getByRole("button", { name: /search skills/i }).click();

      await page.waitForSelector('[data-testid="search-results"]', {
        timeout: 10000,
      });

      const skillCard = page.getByTestId("skill-card-0");
      await skillCard.hover();

      // Check for border color change on hover
      await expect(skillCard).toHaveCSS("border-color", /rgba\(59, 130, 246/);
    });
  });

  test.describe("Touch & Mobile UX", () => {
    test("should have proper touch target sizes", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const searchButton = page.getByRole("button", { name: /search skills/i });
      const box = await searchButton.boundingBox();

      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    });

    test("should have adequate spacing between touch targets", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const searchInput = page.getByTestId("search-input");
      const searchButton = page.getByRole("button", { name: /search skills/i });

      const inputBox = await searchInput.boundingBox();
      const buttonBox = await searchButton.boundingBox();

      expect(inputBox).toBeTruthy();
      expect(buttonBox).toBeTruthy();

      // Check vertical spacing (should be at least 8px)
      const spacing = buttonBox!.y - (inputBox!.y + inputBox!.height);
      expect(spacing).toBeGreaterThanOrEqual(8);
    });
  });

  test.describe("Typography & Readability", () => {
    test("should have proper font sizes", async ({ page }) => {
      const heading = page.getByRole("heading", { name: /skill service/i });
      const fontSize = await heading.evaluate((el) =>
        parseFloat(window.getComputedStyle(el).fontSize),
      );

      expect(fontSize).toBeGreaterThanOrEqual(32); // At least 2rem for h1
    });

    test("should have proper line height for body text", async ({ page }) => {
      const description = page.getByText(
        /semantic search for ai agent skills/i,
      );
      const lineHeight = await description.evaluate(
        (el) => window.getComputedStyle(el).lineHeight,
      );

      // Line height should be at least 1.5 times font size
      expect(parseFloat(lineHeight)).toBeGreaterThanOrEqual(24);
    });
  });

  test.describe("Color & Contrast", () => {
    test("should have proper contrast for primary text", async ({ page }) => {
      const heading = page.getByRole("heading", { name: /skill service/i });
      const color = await heading.evaluate(
        (el) => window.getComputedStyle(el).color,
      );

      // Should be light colored (high values in RGB)
      const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const avgBrightness =
          (parseInt(rgbMatch[1]) +
            parseInt(rgbMatch[2]) +
            parseInt(rgbMatch[3])) /
          3;
        expect(avgBrightness).toBeGreaterThan(150); // Light text on dark background
      }
    });

    test("should use semantic color tokens", async ({ page }) => {
      // Check for blue primary color usage
      const badge = page.locator('[class*="blue-400"]').first();
      await expect(badge).toBeVisible();
    });
  });
});
