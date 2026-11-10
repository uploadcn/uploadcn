// Records the demo clips in apps/docs/public/demo with Playwright:
//
//   demo-paste   focus the uploader, paste a screenshot, watch it upload
//   demo-config  switch providers, type a bucket and an origin, copy a block
//
//   pnpm --filter docs demo:record            (needs the docs running + ffmpeg)
//   DEMO_BASE_URL=http://localhost:3111 pnpm --filter docs demo:record paste
//
// Each clip is recorded at 1280x720 from the real pages, then converted with
// ffmpeg to MP4 (H.264) and an optimized GIF. The only things added to the
// page are a pointer (Playwright's videos have none) and a badge that shows
// the keys being pressed; both are drawn by this script, not by the site.
import { execFileSync } from "node:child_process"
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs"
import os from "node:os"
import path from "node:path"

import { type Locator, type Page, chromium } from "@playwright/test"

const docs = path.resolve(import.meta.dirname, "..")
const out = path.join(docs, "public", "demo")
const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000"
const size = { width: 1280, height: 720 }
const only = process.argv[2]

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Runs in the page before its scripts: the pointer, the key badge, no dev UI. */
function overlay() {
  const ready = () => {
    const style = document.createElement("style")
    style.textContent = `
      nextjs-portal { display: none !important; }
      #demo-pointer { position: fixed; z-index: 2147483647; left: 0; top: 0;
        width: 22px; height: 22px; pointer-events: none; opacity: 0;
        transition: opacity .2s; filter: drop-shadow(0 1px 2px rgb(0 0 0 / .35)); }
      #demo-pointer.down { transform-origin: 3px 3px; scale: .88; }
      #demo-keys { position: fixed; z-index: 2147483647; left: 50%; bottom: 40px;
        translate: -50% 12px; display: flex; gap: 6px; align-items: center;
        padding: 10px 14px; border-radius: 12px; background: rgb(17 17 17 / .92);
        color: #fff; font: 600 15px/1 ui-sans-serif, system-ui, sans-serif;
        opacity: 0; transition: opacity .18s, translate .18s; pointer-events: none; }
      #demo-keys.on { opacity: 1; translate: -50% 0; }
      #demo-keys kbd { padding: 6px 9px; border-radius: 7px; font: inherit;
        background: rgb(255 255 255 / .16); border: 1px solid rgb(255 255 255 / .22); }`
    document.head.append(style)

    const pointer = document.createElement("div")
    pointer.id = "demo-pointer"
    pointer.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2.5v17l4.6-4.3 3 6.6 2.7-1.2-3-6.5H18z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>'
    const keys = document.createElement("div")
    keys.id = "demo-keys"
    document.body.append(pointer, keys)

    document.addEventListener(
      "mousemove",
      (event) => {
        pointer.style.opacity = "1"
        pointer.style.translate = `${event.clientX - 3}px ${event.clientY - 2}px`
      },
      true
    )
    document.addEventListener(
      "mousedown",
      () => pointer.classList.add("down"),
      true
    )
    document.addEventListener(
      "mouseup",
      () => pointer.classList.remove("down"),
      true
    )

    let timer = 0
    ;(window as unknown as { demoKeys: (labels: string[]) => void }).demoKeys =
      (labels) => {
        keys.replaceChildren(
          ...labels.flatMap((label, index) => {
            const key = document.createElement("kbd")
            key.textContent = label
            return index ? [document.createTextNode("+"), key] : [key]
          })
        )
        keys.classList.add("on")
        window.clearTimeout(timer)
        timer = window.setTimeout(() => keys.classList.remove("on"), 1400)
      }
  }
  if (document.body) ready()
  else document.addEventListener("DOMContentLoaded", ready)
}

const showKeys = (page: Page, ...labels: string[]) =>
  page.evaluate(
    (keys) =>
      (window as unknown as { demoKeys: (labels: string[]) => void }).demoKeys(
        keys
      ),
    labels
  )

/** React has hydrated `selector` and run its effects. */
async function hydrated(page: Page, selector: string) {
  await page.locator(selector).first().waitFor()
  await page.waitForFunction((target) => {
    const element = document.querySelector(target)
    return (
      element !== null &&
      Object.keys(element).some((key) => key.startsWith("__reactProps$"))
    )
  }, selector)
  await pause(400)
}

/** Glides the pointer to the middle of an element, like a hand would. */
async function moveTo(page: Page, target: Locator) {
  const box = await target.boundingBox()
  if (!box) throw new Error("element is not on screen")
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 28,
  })
  await pause(180)
}

async function click(page: Page, target: Locator) {
  await moveTo(page, target)
  await page.mouse.down()
  await pause(70)
  await page.mouse.up()
}

/** Smoothly scrolls so `target` sits `offset` pixels from the top. */
async function scrollTo(page: Page, target: Locator, offset: number) {
  await target.evaluate((element, top) => {
    const y = element.getBoundingClientRect().top + window.scrollY - top
    window.scrollTo({ top: y, behavior: "smooth" })
  }, offset)
  await pause(750)
}

/**
 * A real screenshot for the clipboard: the whole home page at 2x, which is
 * big enough (about 1.7 MB) for the upload progress to be visible.
 */
async function takeScreenshot() {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  await pause(1500)
  const png = await page.screenshot({ fullPage: true })
  await browser.close()
  return png.toString("base64")
}

interface Recording {
  /** Seconds of page load before the action starts, cut from the clip. */
  lead: number
}

async function record(
  name: string,
  run: (page: Page) => Promise<void>,
  start: (page: Page) => Promise<void>
) {
  const dir = path.join(os.tmpdir(), `uploadcn-demo-${name}`)
  rmSync(dir, { recursive: true, force: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: size,
    recordVideo: { dir, size },
    colorScheme: "light",
    permissions: ["clipboard-read", "clipboard-write"],
  })
  await context.addInitScript(overlay)
  const page = await context.newPage()
  const opened = Date.now()
  await start(page)
  const recording: Recording = { lead: (Date.now() - opened) / 1000 }
  await run(page)
  await context.close()
  await browser.close()

  const webm = readdirSync(dir).find((file) => file.endsWith(".webm"))
  if (!webm) throw new Error(`${name}: no video was recorded`)
  convert(name, path.join(dir, webm), recording.lead)
  rmSync(dir, { recursive: true, force: true })
}

function ffmpeg(args: string[]) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: "inherit",
  })
}

function convert(name: string, webm: string, lead: number) {
  mkdirSync(out, { recursive: true })
  const mp4 = path.join(out, `${name}.mp4`)
  const gif = path.join(out, `${name}.gif`)
  ffmpeg([
    "-ss",
    lead.toFixed(2),
    "-i",
    webm,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    mp4,
  ])
  // One palette for the whole clip, and only the changed rectangle per
  // frame: UI recordings are mostly still, so this keeps the GIF small.
  ffmpeg([
    "-i",
    mp4,
    "-vf",
    "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
    gif,
  ])
  for (const file of [mp4, gif]) {
    const megabytes = statSync(file).size / 1024 / 1024
    console.log(`${path.relative(docs, file)}  ${megabytes.toFixed(2)} MB`)
    if (file === gif && megabytes > 5) {
      throw new Error(`${name}.gif is over 5 MB`)
    }
  }
}

const demos: Record<string, () => Promise<void>> = {
  /** ~10 s: focus the uploader, paste a screenshot, watch it upload. */
  async paste() {
    const screenshot = await takeScreenshot()
    await record(
      "demo-paste",
      async (page) => {
        await page.evaluate(async (base64) => {
          const bytes = Uint8Array.from(atob(base64), (char) =>
            char.charCodeAt(0)
          )
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": new Blob([bytes], { type: "image/png" }),
            }),
          ])
        }, screenshot)
        await pause(1200)

        // Keyboard focus, so the focus ring shows where the paste will go.
        const dropzone = page.locator('[data-slot="upload-dropzone"]')
        for (let presses = 0; presses < 6; presses++) {
          await showKeys(page, "Tab")
          await page.keyboard.press("Tab")
          await pause(450)
          if (await dropzone.evaluate((el) => el === document.activeElement))
            break
        }
        await pause(900)

        await showKeys(page, "Ctrl", "V")
        await pause(350)
        await page.keyboard.press("ControlOrMeta+V")

        const item = page.locator('[data-slot="upload-item"]').first()
        await item.waitFor()
        await page
          .locator('[data-slot="upload-item"][data-status="success"]')
          .waitFor({ timeout: 30_000 })
        await pause(1800)
      },
      async (page) => {
        await page.goto(`${baseURL}/view/paste-upload`)
        await hydrated(page, '[data-slot="upload-dropzone"]')
      }
    )
  },

  /** ~15 s: switch providers, type a bucket and an origin, copy a block. */
  async config() {
    await record(
      "demo-config",
      async (page) => {
        const generator = page.locator('[data-slot="config-generator"]')
        const output = page.locator('[data-slot="config-output"]')
        await pause(1300)

        await click(page, generator.locator("label", { hasText: "Tigris" }))
        await pause(1100)
        await click(
          page,
          generator.locator("label", { hasText: "Cloudflare R2" })
        )
        await pause(1100)

        await click(page, page.getByLabel("Bucket name"))
        await page.keyboard.type("acme-uploads", { delay: 60 })
        await pause(700)

        // Bring the CORS rules into view next to the origins field.
        const origins = page.getByLabel("Allowed origins")
        await scrollTo(page, origins, 96)
        await click(page, origins)
        await page.keyboard.type("https://app.acme.com", { delay: 55 })
        await pause(1300)

        const cors = output.locator('[data-block="cors"]')
        await scrollTo(page, cors, 150)
        await pause(500)
        await click(page, cors.getByRole("button", { name: /^Copy / }))
        await pause(1900)
      },
      async (page) => {
        await page.goto(`${baseURL}/docs/storage/config-generator`)
        await hydrated(page, '[data-slot="config-generator"]')
        await page
          .locator('[data-slot="config-generator"]')
          .evaluate((element) => {
            const y = element.getBoundingClientRect().top + window.scrollY - 84
            window.scrollTo({ top: y, behavior: "instant" })
          })
        await pause(500)
      }
    )
  },
}

for (const [name, run] of Object.entries(demos)) {
  if (only && only !== name) continue
  console.log(`recording ${name}…`)
  await run()
}
