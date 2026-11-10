// The config generator as readers use it: pick a provider, type, copy.
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import axe from "axe-core"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ConfigGenerator } from "@/components/docs/config-generator"
import { providers } from "@/lib/provider-config"

afterEach(() => {
  cleanup()
  // The generator mirrors the chosen provider into the URL.
  window.history.replaceState(null, "", "/")
})

const output = () => screen.getByRole("region", { name: /configuration$/ })
const blockCode = (id: string) => {
  const element = output().querySelector(`[data-block="${id}"] pre`)
  if (!element) throw new Error(`no "${id}" block on screen`)
  return element.textContent ?? ""
}
const announcer = () =>
  document.querySelector<HTMLElement>('[data-slot="config-announcer"]')!
const choose = (name: string) =>
  fireEvent.click(screen.getByRole("radio", { name }))

function mockClipboard() {
  const writeText = vi.fn(async (_text: string) => {})
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

describe("ConfigGenerator", () => {
  it("starts on Amazon S3 with placeholder values", () => {
    render(<ConfigGenerator />)
    expect(
      (screen.getByRole("radio", { name: "Amazon S3" }) as HTMLInputElement)
        .checked
    ).toBe(true)
    expect(blockCode("env")).toContain("S3_BUCKET=my-bucket")
    expect(blockCode("cors")).toContain("https://your-app.com")
  })

  it.each([
    ["Amazon S3", "S3_BUCKET=", '"AllowedOrigins"'],
    ["Cloudflare R2", "R2_BUCKET=", '"AllowedOrigins"'],
    ["Tigris", "S3_ENDPOINT=https://t3.storage.dev", '"CORSRules"'],
    ["Cloudinary", "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=", "unsigned=true"],
  ])("shows %s's own configuration", (name, env, marker) => {
    render(<ConfigGenerator />)
    choose(name)
    expect(output().getAttribute("aria-label")).toBe(`${name} configuration`)
    expect(blockCode("env")).toContain(env)
    expect(output().textContent).toContain(marker)
    // Every provider links to its official docs, opened safely in a new tab.
    const links = within(output())
      .getAllByRole("link")
      .filter((link) => link.getAttribute("target") === "_blank")
    expect(links.length).toBeGreaterThan(2)
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\//)
      expect(link.getAttribute("rel")).toBe("noreferrer")
    }
  })

  it("updates every block as the bucket and origins are typed", () => {
    render(<ConfigGenerator />)
    fireEvent.change(screen.getByLabelText("Bucket name"), {
      target: { value: "acme-uploads" },
    })
    fireEvent.change(screen.getByLabelText("Allowed origins"), {
      target: { value: "https://app.example.com\nlocalhost:3000" },
    })

    expect(blockCode("env")).toContain("S3_BUCKET=acme-uploads")
    expect(blockCode("policy")).toContain("arn:aws:s3:::acme-uploads/*")
    for (const id of ["cors", "cors-cli"]) {
      expect(blockCode(id)).toContain('"https://app.example.com"')
      expect(blockCode(id)).toContain('"http://localhost:3000"')
      expect(blockCode(id)).not.toContain("your-app.com")
    }
    expect(output().textContent).toContain(
      "aws s3api put-bucket-cors --bucket acme-uploads"
    )
    // The reader is told how their input was read.
    expect(
      document.querySelector('[data-slot="config-warnings"]')!.textContent
    ).toContain('Using http://localhost:3000 for "localhost:3000".')
  })

  it("keeps the inputs when the provider changes", () => {
    render(<ConfigGenerator />)
    fireEvent.change(screen.getByLabelText("Bucket name"), {
      target: { value: "acme-uploads" },
    })
    fireEvent.change(screen.getByLabelText("Allowed origins"), {
      target: { value: "https://app.example.com" },
    })

    choose("Cloudflare R2")
    expect(blockCode("env")).toContain("R2_BUCKET=acme-uploads")
    expect(blockCode("cors-cli")).toContain('"origins"')
    expect(blockCode("cors-cli")).toContain("https://app.example.com")

    choose("Tigris")
    expect(blockCode("env")).toContain("S3_BUCKET=acme-uploads")
    expect(blockCode("cors-cli")).toContain("https://app.example.com")
  })

  it("asks Cloudinary for a preset name and turns origins off", () => {
    render(<ConfigGenerator />)
    fireEvent.change(screen.getByLabelText("Bucket name"), {
      target: { value: "acme-uploads" },
    })
    choose("Cloudinary")

    expect(screen.queryByLabelText("Bucket name")).toBeNull()
    const preset = screen.getByLabelText(
      "Upload preset name"
    ) as HTMLInputElement
    // A bucket name is not a preset name: it does not carry over.
    expect(preset.value).toBe("")
    fireEvent.change(preset, { target: { value: "avatars" } })
    expect(blockCode("preset")).toContain("name=avatars&unsigned=true")
    expect(blockCode("adapter")).toContain('uploadPreset: "avatars"')
    expect(
      (screen.getByLabelText("Allowed origins") as HTMLTextAreaElement).disabled
    ).toBe(true)
  })

  it("opens on the provider named in the URL and keeps the URL in step", () => {
    window.history.replaceState(
      null,
      "",
      "/docs/storage/config-generator?provider=tigris"
    )
    render(<ConfigGenerator />)
    expect(
      (screen.getByRole("radio", { name: "Tigris" }) as HTMLInputElement)
        .checked
    ).toBe(true)
    expect(blockCode("env")).toContain("S3_ENDPOINT=https://t3.storage.dev")

    choose("Cloudflare R2")
    expect(window.location.search).toBe("?provider=r2")
    expect(blockCode("env")).toContain("R2_BUCKET=")
    cleanup()

    // An unknown provider falls back to the default.
    window.history.replaceState(
      null,
      "",
      "/docs/storage/config-generator?provider=nope"
    )
    render(<ConfigGenerator />)
    expect(
      (screen.getByRole("radio", { name: "Amazon S3" }) as HTMLInputElement)
        .checked
    ).toBe(true)
    window.history.replaceState(null, "", "/")
  })

  it("adds the local dev origin in one click", () => {
    render(<ConfigGenerator />)
    fireEvent.change(screen.getByLabelText("Allowed origins"), {
      target: { value: "https://app.example.com" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: "http://localhost:3000" })
    )

    expect(
      (screen.getByLabelText("Allowed origins") as HTMLTextAreaElement).value
    ).toBe("https://app.example.com\nhttp://localhost:3000")
    expect(blockCode("cors")).toContain('"http://localhost:3000"')
    // Once it is in the list the shortcut goes away.
    expect(
      screen.queryByRole("button", { name: "http://localhost:3000" })
    ).toBeNull()
  })

  it("shows the region field for S3 only", () => {
    render(<ConfigGenerator />)
    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "eu-central-1" },
    })
    expect(blockCode("env")).toContain("S3_REGION=eu-central-1")
    choose("Cloudflare R2")
    expect(screen.queryByLabelText("Region")).toBeNull()
  })

  it("has a copy button on every block and command", async () => {
    const writeText = mockClipboard()
    for (const provider of providers) {
      const { unmount } = render(
        <ConfigGenerator defaultProvider={provider.id} />
      )
      const blocks = [...output().querySelectorAll("[data-block]")]
      expect(blocks.length, provider.id).toBeGreaterThan(0)
      for (const element of blocks) {
        const copy = within(element as HTMLElement).getAllByRole("button", {
          name: /^Copy /,
        })
        const commands = element.querySelectorAll("[data-command]").length
        expect(copy).toHaveLength(1 + commands)
        const code = element.querySelector("pre")!.textContent
        fireEvent.click(copy[0]!)
        await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(code))
      }
      unmount()
    }
  })

  it("copies the exact text and confirms it", async () => {
    const writeText = mockClipboard()
    render(<ConfigGenerator />)
    fireEvent.change(screen.getByLabelText("Bucket name"), {
      target: { value: "acme-uploads" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Copy .env.local" }))
    await screen.findByRole("button", { name: "Copied .env.local" })
    expect(writeText).toHaveBeenCalledWith(blockCode("env"))
    expect(writeText.mock.calls[0]![0]).toContain("S3_BUCKET=acme-uploads")
    // Said out loud too: an icon swap alone is silent to a screen reader.
    expect(announcer().textContent).toBe("Copied .env.local to the clipboard.")
    expect(announcer().getAttribute("aria-live")).toBe("polite")

    fireEvent.click(
      screen.getByRole("button", { name: "Copy cors.json command" })
    )
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith(
        "aws s3api put-bucket-cors --bucket acme-uploads --cors-configuration file://cors.json"
      )
    )
  })

  it("says so when the clipboard refuses or is not available", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn(async () => Promise.reject(new Error("denied"))),
      },
      configurable: true,
    })
    render(<ConfigGenerator />)

    fireEvent.click(screen.getByRole("button", { name: "Copy .env.local" }))
    await screen.findByRole("button", { name: "Could not copy .env.local" })
    expect(announcer().textContent).toBe(
      "Could not copy .env.local. Select the text and copy it instead."
    )
    cleanup()

    // No Clipboard API at all (an insecure origin).
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    })
    render(<ConfigGenerator />)
    fireEvent.click(screen.getByRole("button", { name: "Copy .env.local" }))
    await screen.findByRole("button", { name: "Could not copy .env.local" })
  })

  it("names every scrollable code block for screen readers", () => {
    render(<ConfigGenerator />)
    const groups = within(output()).getAllByRole("group")
    expect(groups.length).toBeGreaterThan(4)
    for (const group of groups) {
      expect(
        group.getAttribute("aria-label"),
        group.outerHTML.slice(0, 80)
      ).toBeTruthy()
      // Reachable by keyboard, so wide code can be scrolled without a mouse.
      expect(group.getAttribute("tabindex")).toBe("0")
    }
  })

  it("groups the providers as radios with a legend", () => {
    render(<ConfigGenerator />)
    const group = screen.getByRole("group", { name: "Storage provider" })
    expect(within(group).getAllByRole("radio")).toHaveLength(providers.length)
    expect(
      within(group)
        .getAllByRole("radio")
        .filter((radio) => (radio as HTMLInputElement).checked)
    ).toHaveLength(1)
  })

  it.each(providers.map((provider) => [provider.name, provider.id] as const))(
    "%s: has no accessibility violations",
    async (_, id) => {
      const { container } = render(<ConfigGenerator defaultProvider={id} />)
      const results = await axe.run(container, {
        rules: { "color-contrast": { enabled: false } },
      })
      await waitFor(() => expect(results.violations).toEqual([]))
    }
  )
})
