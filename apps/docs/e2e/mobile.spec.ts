// Small phones: nothing in the header is cut off, pages do not scroll
// sideways, and new pages are marked in the sidebar.
import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 360, height: 760 }, hasTouch: true })

for (const url of [
  "/",
  "/docs",
  "/docs/components/upload",
  "/docs/changelog",
]) {
  test(`${url} fits a 360px screen`, async ({ page }) => {
    await page.goto(url)
    await page.waitForLoadState("networkidle")
    const { width, scroll } = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(scroll).toBeLessThanOrEqual(width)

    // Every control in the header is fully on screen.
    const boxes = await page
      .locator("header")
      .first()
      .locator("a:visible, button:visible")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect()
          return {
            left: box.left,
            right: box.right,
            label: element.textContent,
          }
        })
      )
    expect(boxes.length).toBeGreaterThan(2)
    for (const box of boxes) {
      expect(box.left, String(box.label)).toBeGreaterThanOrEqual(0)
      expect(box.right, String(box.label)).toBeLessThanOrEqual(width)
    }
  })
}

test("new pages have a dot in the sidebar, with a text alternative", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/docs")
  for (const name of ["Changelog", "Upload Paste", "Config generator"]) {
    const link = page.locator("aside a", { hasText: name }).first()
    await expect(link.locator('[data-slot="new-dot"]')).toBeVisible()
    await expect(link).toContainText("(new)")
  }
  await expect(
    page
      .locator("aside a", { hasText: "File Upload" })
      .first()
      .locator('[data-slot="new-dot"]')
  ).toHaveCount(0)
})
